import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import XLSX from 'xlsx'
import MLModelMetrics from '../models/MLModelMetrics.js'
import MLPredictionResult from '../models/MLPredictionResult.js'

dotenv.config()
//lit les fichier de RT de prediction et de metrique de model
function resolveProjectFile(fileName) {
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
//classer les prediction selon pourcentage mt3 erreur
function normalizeStatus(errorPctRaw) {
  const errorPct = Number(errorPctRaw)
  if (!Number.isFinite(errorPct)) {
    return 'A verifier'
  }
  if (errorPct < 15) {
    return 'Bonne prediction'
  }
  if (errorPct <= 25) {
    return 'Prediction moyenne'
  }
  return 'A verifier'
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toOptionalIntInRange(value, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }
  const rounded = Math.floor(parsed)
  if (rounded < min || rounded > max) {
    return null
  }
  return rounded
}

async function run() {
  const predictionsPath = resolveProjectFile('ml_predictions_montant_euro.xlsx')
  const resultsPath = resolveProjectFile('ml_model_results.json')

  if (!predictionsPath) {
    throw new Error(
      'Fichier ml_predictions_montant_euro.xlsx introuvable. Lancez ml_etl_yazaki.py d abord.',
    )
  }

  if (!resultsPath) {
    throw new Error(
      'Fichier ml_model_results.json introuvable. Lancez ml_etl_yazaki.py d abord.',
    )
  }

  const dbName = String(process.env.MONGO_DB_NAME || '').trim()
  await mongoose.connect(process.env.MONGO_URI, dbName ? { dbName } : undefined)

  try {
    const rawResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
    const bestModelName = String(rawResults?.best_model || 'Random Forest Regressor')
    const bestMetrics = rawResults?.best_model_metrics || {}

    const workbook = XLSX.readFile(predictionsPath, { cellDates: true })
    const firstSheet = workbook.SheetNames[0]
    if (!firstSheet) {
      throw new Error('Aucune feuille de donnees dans ml_predictions_montant_euro.xlsx.')
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
      defval: null,
      raw: true,
    })

    const prepared = rows.map((row) => {
      const montantReel = toNumber(row.MONTANT_EN_EURO, 0)
      const montantPredit = toNumber(row.PREDICTED_MONTANT_EN_EURO, 0)
      const erreurAbsolue = toNumber(row.ABS_ERROR, Math.abs(montantReel - montantPredit))
      const erreurPourcentage = toNumber(
        row.ERROR_PCT,
        montantReel ? (Math.abs(montantReel - montantPredit) / Math.abs(montantReel)) * 100 : 0,
      )

      return {
        transporteur: String(row.TRANSPORTEUR || '').trim().toUpperCase() || 'UNKNOWN',
        fournisseur: String(row.FOURNISSEUR || '').trim().toUpperCase() || 'UNKNOWN',
        type_transport: String(row.TYPE_TRANSPORT || '').trim().toUpperCase() || 'UNKNOWN',
        designation: String(row.DESIGNATION || '').trim().toUpperCase() || 'UNKNOWN',
        nbr_colis: toNumber(row.NBR_COLIS, 0),
        delai_jours: toNumber(row.IMPORT_DELAY_DAYS, 0),
        reception_year: toOptionalIntInRange(row.RECEPTION_YEAR, 1900, 3000),
        reception_month: toOptionalIntInRange(row.RECEPTION_MONTH, 1, 12),
        montant_reel: montantReel,
        montant_predit: montantPredit,
        erreur_absolue: erreurAbsolue,
        erreur_pourcentage: erreurPourcentage,
        statut: normalizeStatus(erreurPourcentage),
        model_name: bestModelName,
      }
    })

    await MLPredictionResult.deleteMany({})
    if (prepared.length) {
      await MLPredictionResult.insertMany(prepared, { ordered: false })
    }

    const metricDoc = {
      bestModel: bestModelName,
      mae: toNumber(bestMetrics.MAE, 0),
      rmse: toNumber(bestMetrics.RMSE, 0),
      r2: toNumber(bestMetrics.R2, 0),
      totalPredictions: prepared.length,
      averageErrorPercent: prepared.length
        ? prepared.reduce((sum, row) => sum + row.erreur_pourcentage, 0) / prepared.length
        : 0,
    }

    await MLModelMetrics.create(metricDoc)

    console.log(`ML sync terminee. Predictions importees: ${prepared.length}`)
  } finally {
    await mongoose.disconnect()
  }
}

run().catch((error) => {
  console.error('ML sync failed:', error.message)
  process.exitCode = 1
})
