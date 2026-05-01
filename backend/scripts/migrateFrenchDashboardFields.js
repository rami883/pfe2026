import dotenv from 'dotenv'
import mongoose from 'mongoose'
import DashboardData from '../models/DashboardData.js'

dotenv.config()

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function pick(...values) {
  for (const value of values) {
    if (hasValue(value)) {
      return value
    }
  }
  return null
}

function buildFrenchPatch(doc) {
  const patch = {}

  const totalN = pick(doc.Total_N, doc.Record_No, doc.Plate_No, doc.Plaque_Immatriculation)
  const jour = pick(doc.Jour, doc.Day)
  const datePrevue = pick(doc['Date_Prévue'], doc.Planned_Date)
  const dateArrivee = pick(doc['Date_Arrivée'], doc.Arrival_Date)
  const heureArrivee = pick(doc['Heure_Arrivée'], doc.Arrival_Time)
  const plaque = pick(doc.Plaque_Immatriculation, doc.Plate_No, doc.Record_No, doc.Total_N)
  const typeVehicule = pick(doc['Type_Véhicule'], doc.Vehicle_Type)
  const fournisseur = pick(doc.Fournisseur, doc.Supplier)
  const origine = pick(doc.Origine, doc.Origin)
  const nbPalettes = pick(doc.Nb_Palettes, doc.N_Pallets)
  const dateDechargement = pick(doc['Date_Déchargement'], doc.Unloaded_Date)
  const tempDechargement = pick(doc['temp_Déchargement'], doc.Unloaded_Time)
  const joursAttente = pick(doc["Jours_d'Attente"], doc.Waiting_Days)

  if (hasValue(totalN) && !hasValue(doc.Total_N)) patch.Total_N = totalN
  if (hasValue(jour) && !hasValue(doc.Jour)) patch.Jour = jour
  if (hasValue(datePrevue) && !hasValue(doc['Date_Prévue'])) patch['Date_Prévue'] = datePrevue
  if (hasValue(dateArrivee) && !hasValue(doc['Date_Arrivée'])) patch['Date_Arrivée'] = dateArrivee
  if (hasValue(heureArrivee) && !hasValue(doc['Heure_Arrivée'])) patch['Heure_Arrivée'] = heureArrivee
  if (hasValue(plaque) && !hasValue(doc.Plaque_Immatriculation)) {
    patch.Plaque_Immatriculation = plaque
  }
  if (hasValue(typeVehicule) && !hasValue(doc['Type_Véhicule'])) {
    patch['Type_Véhicule'] = typeVehicule
  }
  if (hasValue(fournisseur) && !hasValue(doc.Fournisseur)) patch.Fournisseur = fournisseur
  if (hasValue(origine) && !hasValue(doc.Origine)) patch.Origine = origine
  if (hasValue(nbPalettes) && !hasValue(doc.Nb_Palettes)) patch.Nb_Palettes = nbPalettes
  if (dateDechargement !== null && dateDechargement !== undefined && doc['Date_Déchargement'] === undefined) {
    patch['Date_Déchargement'] = dateDechargement
  }
  if (tempDechargement !== null && tempDechargement !== undefined && doc['temp_Déchargement'] === undefined) {
    patch['temp_Déchargement'] = tempDechargement
  }
  if (joursAttente !== null && joursAttente !== undefined && doc["Jours_d'Attente"] === undefined) {
    patch["Jours_d'Attente"] = joursAttente
  }

  return patch
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing MONGO_URI in environment.')
  }

  const dbName = String(process.env.MONGO_DB_NAME || '').trim()
  await mongoose.connect(process.env.MONGO_URI, dbName ? { dbName } : undefined)

  try {
    const docs = await DashboardData.find({}).lean()
    let updated = 0
    let skipped = 0

    for (const doc of docs) {
      const patch = buildFrenchPatch(doc)
      if (!Object.keys(patch).length) {
        skipped += 1
        continue
      }

      await DashboardData.updateOne({ _id: doc._id }, { $set: patch })
      updated += 1
    }

    console.log(`Migration finished. Updated: ${updated}, Skipped: ${skipped}, Total: ${docs.length}`)
  } finally {
    await mongoose.disconnect()
  }
}

run().catch((error) => {
  console.error('Migration failed:', error.message)
  process.exitCode = 1
})

