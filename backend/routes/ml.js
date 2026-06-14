import express from 'express'
import fs from 'node:fs'//lire ficher json
import path from 'node:path'
import { protect } from '../middleware/auth.js'
import MLModelMetrics from '../models/MLModelMetrics.js'//appel  results des models (les metrics)
import MLPredictionResult from '../models/MLPredictionResult.js'//appel resultat predicitons

const router = express.Router()
const ALLOWED_ROLES = new Set(['admin', 'directeur'])

//fonction verifier role acceés 
function requireMLAccess(req, res, next) {
  if (!req.user || !ALLOWED_ROLES.has(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' })
  }
  return next()
}


function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

//classer les prediction selon erreur %
function normalizeStatusByError(errorPercentRaw) {
  const errorPercent = Number(errorPercentRaw)
  if (!Number.isFinite(errorPercent)) return 'A verifier'
  if (errorPercent < 15) return 'Bonne prediction'
  if (errorPercent <= 25) return 'Prediction moyenne'
  return 'A verifier'
}

function parsePagination(query) {
  const page = Math.max(1, Math.floor(Number(query.page) || 1))
  const pageSize = Math.min(500, Math.max(1, Math.floor(Number(query.pageSize) || 100)))
  return { page, pageSize }
}

function resolveProjectArtifactPath(fileName) {
  const candidates = [
    path.resolve(process.cwd(), fileName),
    path.resolve(process.cwd(), '..', fileName),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return ''
}
//filtrage 
function buildPredictionsFilter(query) {
  const filter = {}
  const transporteur = String(query.transporteur || '').trim()
  const fournisseur = String(query.fournisseur || '').trim()
  const typeTransport = String(query.type_transport || query.typeTransport || '').trim()
  const statut = String(query.statut || '').trim()
  const search = String(query.q || query.search || '').trim()

  if (transporteur && transporteur.toLowerCase() !== 'all') filter.transporteur = transporteur
  if (fournisseur && fournisseur.toLowerCase() !== 'all') filter.fournisseur = fournisseur
  if (typeTransport && typeTransport.toLowerCase() !== 'all') filter.type_transport = typeTransport
  if (statut && statut.toLowerCase() !== 'all') filter.statut = statut

  if (search) {
    const safeRegex = new RegExp(escapeRegex(search), 'i')
    filter.$or = [
      { transporteur: safeRegex },
      { fournisseur: safeRegex },
      { type_transport: safeRegex },
      { designation: safeRegex },
    ]
  }

  return filter
}

//calcul KPIs
async function calculateLiveMetrics() {
  const [totalPredictions, aggregation, toCheckCount, latestMetricDoc] = await Promise.all([
    MLPredictionResult.countDocuments(),
    MLPredictionResult.aggregate([
      {
        $group: {
          _id: null,
          avgMae: { $avg: '$erreur_absolue' },
          // RMSE = sqrt(mean(erreur² )) — formule correcte
          rmseRaw: { $avg: { $multiply: ['$erreur_absolue', '$erreur_absolue'] } },
          avgErrorPercent: { $avg: '$erreur_pourcentage' },
          // Calcul R² live : nécessite mean(y) d'abord — approché ici
          sumY: { $sum: '$montant_reel' },
          sumY2: { $sum: { $multiply: ['$montant_reel', '$montant_reel'] } },
          sumYPred: { $sum: '$montant_predit' },
          sumResiduals2: {
            $sum: {
              $pow: [{ $subtract: ['$montant_reel', '$montant_predit'] }, 2],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    MLPredictionResult.countDocuments({ statut: 'A verifier' }),
    MLModelMetrics.findOne({}).sort({ createdAt: -1 }).lean(),
  ])

  const agg = aggregation[0] || {}
  const avgMae = Number(agg.avgMae || 0)
  const rmse = Number.isFinite(agg.rmseRaw) ? Math.sqrt(agg.rmseRaw) : 0
  const averageErrorPercent = Number(agg.avgErrorPercent || 0)

  // Calcul R² live = 1 - SS_res / SS_tot
  let liveR2 = 0
  if (agg.count > 1 && agg.sumY != null) {
    const meanY = agg.sumY / agg.count
    const ssTot = agg.sumY2 - agg.count * meanY * meanY
    const ssRes = agg.sumResiduals2
    liveR2 = ssTot > 0 ? Math.max(-1, Math.min(1, 1 - ssRes / ssTot)) : 0
  }

  return {
    bestModel: latestMetricDoc?.bestModel || 'Random Forest Regressor',
    mae: Number(latestMetricDoc?.mae ?? avgMae),
    rmse: Number(latestMetricDoc?.rmse ?? rmse),
    r2: Number(latestMetricDoc?.r2 ?? liveR2),  // ← corrected: live R² as fallback
    totalPredictions,
    averageErrorPercent: Math.round(averageErrorPercent * 100) / 100,
    toCheckCount,
    trainedAt: latestMetricDoc?.createdAt || null,  // ← date d'entraînement du modèle
  }
}


router.get('/metrics', protect, requireMLAccess, async (_req, res) => {
  try {
    const metrics = await calculateLiveMetrics()
    return res.status(200).json(metrics)
  } catch (error) {
    console.error('ML metrics error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})


router.get('/model-comparison', protect, requireMLAccess, async (_req, res) => {
  try {
    const resultsPath = resolveProjectArtifactPath('ml_model_results.json')
    if (!resultsPath) {
      return res.status(404).json({
        message: 'Resultats ML introuvables.',
      })
    }

    const payload = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
    const metrics = Array.isArray(payload?.metrics) ? payload.metrics : []

    const items = metrics
      .map((row) => ({
        model: String(row.MODEL || ''),
        mae: Number(row.MAE),
        rmse: Number(row.RMSE),
        r2: Number(row.R2),
        cvR2Mean: Number(row.CV_R2_MEAN),
        cvR2Std: Number(row.CV_R2_STD),
      }))
      .filter((row) => row.model)
      .sort((a, b) => a.rmse - b.rmse)

    return res.status(200).json({
      bestModel: String(payload?.best_model || items[0]?.model || ''),
      rowsUsedForTraining: Number(payload?.rows_used_for_training || 0),
      generatedAtUtc: String(payload?.generated_at_utc || ''),
      items,
    })
  } catch (error) {
    console.error('ML model comparison error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

/**
 * GET /api/ml/filter-options
 * Retourne toutes les valeurs distinctes pour les dropdowns — basées sur toute la collection.
 * Résout le bug où les dropdowns ne montraient que les 100 premières lignes de la page.
 */
router.get('/filter-options', protect, requireMLAccess, async (_req, res) => {
  try {
    const [transporteurs, fournisseurs, types, statuts] = await Promise.all([
      MLPredictionResult.distinct('transporteur'),
      MLPredictionResult.distinct('fournisseur'),
      MLPredictionResult.distinct('type_transport'),
      MLPredictionResult.distinct('statut'),
    ])

    return res.status(200).json({
      transporteurs: transporteurs.filter((v) => v && v !== 'UNKNOWN').sort(),
      fournisseurs: fournisseurs.filter((v) => v && v !== 'UNKNOWN').sort(),
      types: types.filter((v) => v && v !== 'UNKNOWN').sort(),
      statuts: statuts.filter(Boolean).sort(),
    })
  } catch (error) {
    console.error('ML filter options error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

/**
 * GET /api/ml/predictions?page&pageSize&transporteur&fournisseur&type_transport&statut&q
 * Liste paginée et filtrable des prédictions ML.
 */
router.get('/predictions', protect, requireMLAccess, async (req, res) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const filter = buildPredictionsFilter(req.query)
    const [total, rows] = await Promise.all([
      MLPredictionResult.countDocuments(filter),
      MLPredictionResult.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ])

    const items = rows.map((row) => ({
      id: String(row._id),
      transporteur: row.transporteur || 'UNKNOWN',
      fournisseur: row.fournisseur || 'UNKNOWN',
      type_transport: row.type_transport || 'UNKNOWN',
      designation: row.designation || 'UNKNOWN',
      nbr_colis: Number(row.nbr_colis) || 0,
      delai_jours: Number(row.delai_jours) || 0,
      montant_reel: Number(row.montant_reel) || 0,
      montant_predit: Number(row.montant_predit) || 0,
      erreur_absolue:
        Number(row.erreur_absolue) ||
        Math.abs((row.montant_reel || 0) - (row.montant_predit || 0)),
      erreur_pourcentage:
        Number(row.erreur_pourcentage) ||
        (row.montant_reel
          ? (Math.abs((row.montant_reel || 0) - (row.montant_predit || 0)) /
              Math.abs(row.montant_reel)) *
            100
          : 0),
      statut: row.statut || normalizeStatusByError(row.erreur_pourcentage),
      model_name: row.model_name || 'UNKNOWN',
      createdAt: row.createdAt,
    }))

    return res.status(200).json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (error) {
    console.error('ML predictions error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

/**
 * GET /api/ml/top-errors?limit=20
 * Opérations avec les plus grandes erreurs absolues.
 */
router.get('/top-errors', protect, requireMLAccess, async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Math.floor(Number(req.query.limit) || 20)))
    const rows = await MLPredictionResult.find({})
      .sort({ erreur_absolue: -1, _id: -1 })
      .limit(limit)
      .lean()

    const items = rows.map((row) => ({
      id: String(row._id),
      transporteur: row.transporteur || 'UNKNOWN',
      fournisseur: row.fournisseur || 'UNKNOWN',
      type_transport: row.type_transport || 'UNKNOWN',
      designation: row.designation || 'UNKNOWN',
      montant_reel: Number(row.montant_reel) || 0,
      montant_predit: Number(row.montant_predit) || 0,
      erreur_absolue: Number(row.erreur_absolue) || 0,
      erreur_pourcentage: Number(row.erreur_pourcentage) || 0,
      statut: row.statut || normalizeStatusByError(row.erreur_pourcentage),
    }))

    return res.status(200).json({ items })
  } catch (error) {
    console.error('ML top errors error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})


router.get('/status-distribution', protect, requireMLAccess, async (_req, res) => {
  try {
    const rows = await MLPredictionResult.aggregate([
      { $group: { _id: '$statut', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ])

    const items = rows.map((row) => ({
      statut: row._id || 'UNKNOWN',
      count: Number(row.count) || 0,
    }))

    return res.status(200).json({ items })
  } catch (error) {
    console.error('ML status distribution error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

/**
 * GET /api/ml/trend
 * Évolution mensuelle de l'erreur moyenne % et MAE.
 * Utilisé par le graphique de tendance temporelle.
 */
router.get('/trend', protect, requireMLAccess, async (_req, res) => {
  try {
    const rows = await MLPredictionResult.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          avgErrorPercent: { $avg: '$erreur_pourcentage' },
          avgMae: { $avg: '$erreur_absolue' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          avgErrorPercent: { $round: ['$avgErrorPercent', 2] },
          avgMae: { $round: ['$avgMae', 2] },
          count: 1,
        },
      },
    ])

    return res.status(200).json({ items: rows })
  } catch (error) {
    console.error('ML trend error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

/**
 * GET /api/ml/by-carrier
 * MAE moyen agrégé par transporteur (pour le bar chart carriers).
 */
router.get('/by-carrier', protect, requireMLAccess, async (_req, res) => {
  try {
    const rows = await MLPredictionResult.aggregate([
      { $match: { transporteur: { $nin: ['UNKNOWN', null, ''] } } },
      {
        $group: {
          _id: '$transporteur',
          avgMae: { $avg: '$erreur_absolue' },
          avgErrorPct: { $avg: '$erreur_pourcentage' },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgMae: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          transporteur: '$_id',
          avgMae: { $round: ['$avgMae', 2] },
          avgErrorPct: { $round: ['$avgErrorPct', 2] },
          count: 1,
        },
      },
    ])

    return res.status(200).json({ items: rows })
  } catch (error) {
    console.error('ML by-carrier error:', error)
    return res.status(500).json({ message: 'Erreur serveur.' })
  }
})

export default router
