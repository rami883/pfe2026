/**
 * ETL — Charge les prédictions ML et les métriques du modèle dans MongoDB.
 *
 * Usage :
 *   node ETL/loadMLPredictionsToMongo.js --replace   ← vide puis recharge (défaut)
 *   node ETL/loadMLPredictionsToMongo.js --append    ← ajoute sans supprimer
 *
 * Fichiers sources attendus (relatifs à la racine du projet) :
 *   ../ml_predictions_montant_euro.xlsx   → collection MLPredictionResult
 *   ../ml_model_results.json              → collection MLModelMetrics
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import XLSX from 'xlsx'

import MLModelMetrics from '../models/MLModelMetrics.js'
import MLPredictionResult from '../models/MLPredictionResult.js'

// ─── Résolution des chemins ──────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const BACKEND_ROOT = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(BACKEND_ROOT, '.env') })

// ─── Configuration ───────────────────────────────────────────────────────────
const BATCH_SIZE = Number(process.env.ETL_ML_BATCH_SIZE || 500)
const PREDICTIONS_FILE = path.join(PROJECT_ROOT, 'ml_predictions_montant_euro.xlsx')
const METRICS_FILE = path.join(PROJECT_ROOT, 'ml_model_results.json')

const args = process.argv.slice(2)
const MODE = args.includes('--append') ? 'append' : 'replace'

// ─── Seuils de classification des prédictions ────────────────────────────────
const STATUT_SEUILS = {
  BONNE: 15,    // erreur < 15% → Bonne prediction
  MOYENNE: 25,  // erreur < 25% → Prediction moyenne
  // sinon        → A verifier
}

/**
 * Classifie le statut d'une prédiction selon son taux d'erreur.
 */
function classifyStatut(errorPct) {
  const pct = Number(errorPct)
  if (!Number.isFinite(pct)) return 'A verifier'
  if (pct < STATUT_SEUILS.BONNE) return 'Bonne prediction'
  if (pct <= STATUT_SEUILS.MOYENNE) return 'Prediction moyenne'
  return 'A verifier'
}

/**
 * Convertit une ligne Excel en document MLPredictionResult.
 * Tolère les deux casses de noms de colonnes (MAJUSCULE ou minuscule).
 */
function mapRowToPrediction(row, modelName) {
  const get = (...keys) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        return row[key]
      }
    }
    return null
  }

  const montantReel = Number(get('MONTANT_EN_EURO', 'montant_en_euro', 'montant_reel')) || 0
  const montantPredit = Number(get('PREDICTED_MONTANT_EN_EURO', 'predicted_montant_en_euro', 'montant_predit')) || 0
  const erreurAbsolue = Number(get('ABS_ERROR', 'abs_error', 'erreur_absolue')) ||
    Math.abs(montantReel - montantPredit)
  const erreurPourcentage = Number(get('ERROR_PCT', 'error_pct', 'erreur_pourcentage')) ||
    (montantReel !== 0 ? (erreurAbsolue / Math.abs(montantReel)) * 100 : 0)

  return {
    transporteur: String(get('TRANSPORTEUR', 'transporteur') || 'UNKNOWN').trim().toUpperCase(),
    fournisseur: String(get('FOURNISSEUR', 'fournisseur') || 'UNKNOWN').trim().toUpperCase(),
    type_transport: String(get('TYPE_TRANSPORT', 'type_transport') || 'UNKNOWN').trim().toUpperCase(),
    designation: String(get('DESIGNATION', 'designation') || 'UNKNOWN').trim().toUpperCase(),
    nbr_colis: Number(get('NBR_COLIS', 'nbr_colis')) || 0,
    delai_jours: Number(get('IMPORT_DELAY_DAYS', 'import_delay_days', 'delai_jours')) || 0,
    montant_reel: montantReel,
    montant_predit: Math.round(montantPredit * 10000) / 10000,
    erreur_absolue: Math.round(erreurAbsolue * 10000) / 10000,
    erreur_pourcentage: Math.round(erreurPourcentage * 10000) / 10000,
    statut: classifyStatut(erreurPourcentage),
    model_name: modelName || 'UNKNOWN',
  }
}

/**
 * Charge les métriques du modèle dans MLModelMetrics.
 * Toujours remplace l'unique document de métriques (on veut le plus récent).
 */
async function loadMetrics() {
  if (!fs.existsSync(METRICS_FILE)) {
    console.warn(`[WARN] Fichier métriques introuvable: ${METRICS_FILE} — ignoré.`)
    return null
  }

  const raw = fs.readFileSync(METRICS_FILE, 'utf-8')
  const json = JSON.parse(raw)

  const bestMetrics = json.best_model_metrics || {}
  const totalRows = Number(json.rows_used_for_training || 0)

  // Supprime l'ancien document de métriques avant d'insérer le nouveau
  await MLModelMetrics.deleteMany({})

  const doc = await MLModelMetrics.create({
    bestModel: json.best_model || 'UNKNOWN',
    mae: Number(bestMetrics.MAE || 0),
    rmse: Number(bestMetrics.RMSE || 0),
    r2: Number(bestMetrics.R2 || 0),
    totalPredictions: totalRows,
    averageErrorPercent: 0, // sera mis à jour depuis les prédictions
  })

  console.log(`✅ MLModelMetrics: 1 document inséré (modèle: ${doc.bestModel}, R²: ${doc.r2})`)
  return json.best_model || 'UNKNOWN'
}

/**
 * Charge les prédictions depuis le fichier Excel dans MLPredictionResult.
 */
async function loadPredictions(modelName) {
  if (!fs.existsSync(PREDICTIONS_FILE)) {
    throw new Error(`Fichier prédictions introuvable: ${PREDICTIONS_FILE}`)
  }

  const workbook = XLSX.readFile(PREDICTIONS_FILE, { cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false })

  if (!rawRows.length) {
    throw new Error('Aucune ligne trouvée dans le fichier Excel des prédictions.')
  }

  console.log(`📊 ${rawRows.length} lignes lues depuis ${path.basename(PREDICTIONS_FILE)}`)

  if (MODE === 'replace') {
    const deleted = await MLPredictionResult.deleteMany({})
    console.log(`🗑  Mode replace: ${deleted.deletedCount} prédictions supprimées.`)
  }

  const documents = rawRows.map((row) => mapRowToPrediction(row, modelName))

  let inserted = 0
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE)
    await MLPredictionResult.insertMany(batch, { ordered: false })
    inserted += batch.length
    console.log(`   Inséré: ${inserted}/${documents.length}`)
  }

  // Calcul de la moyenne des erreurs % pour mettre à jour MLModelMetrics
  const [agg] = await MLPredictionResult.aggregate([
    { $group: { _id: null, avgErrPct: { $avg: '$erreur_pourcentage' } } },
  ])
  if (agg?.avgErrPct != null) {
    await MLModelMetrics.updateMany({}, { averageErrorPercent: Math.round(agg.avgErrPct * 100) / 100 })
  }

  // Résumé des statuts
  const statuts = await MLPredictionResult.aggregate([
    { $group: { _id: '$statut', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])
  console.log('\n📈 Répartition des statuts:')
  for (const s of statuts) {
    console.log(`   ${s._id}: ${s.count} (${((s.count / inserted) * 100).toFixed(1)}%)`)
  }

  console.log(`\n✅ MLPredictionResult: ${inserted} prédictions insérées (mode: ${MODE})`)
  return inserted
}

// ─── Point d'entrée ──────────────────────────────────────────────────────────
async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI manquant dans le fichier .env du Backend/')
  }

  console.log('\n══════════════════════════════════════════════════')
  console.log('  ETL ML — Chargement des prédictions dans MongoDB')
  console.log(`  Mode: ${MODE.toUpperCase()}`)
  console.log('══════════════════════════════════════════════════\n')

  await mongoose.connect(process.env.MONGO_URI)
  console.log('🔗 Connecté à MongoDB\n')

  try {
    // 1. Métriques du modèle
    const bestModelName = await loadMetrics()

    // 2. Prédictions
    await loadPredictions(bestModelName)

    console.log('\n🎉 ETL ML terminé avec succès.')
    console.log('   Le dashboard ML est maintenant alimenté.\n')
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Déconnecté de MongoDB')
  }
}

run().catch((error) => {
  console.error('\n❌ ETL ML échoué:', error.message)
  process.exitCode = 1
})
