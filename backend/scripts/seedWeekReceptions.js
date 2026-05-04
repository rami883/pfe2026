import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import DashboardData from '../models/DashboardData.js'

dotenv.config()

const BASE_DATE = new Date('2026-04-27T00:00:00.000Z')
const DAYS = 7

function toYmd(date) {
  return date.toISOString().slice(0, 10)
}

function weekday(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
}

function makeRows() {
  const rows = []

  for (let dayOffset = 0; dayOffset < DAYS; dayOffset += 1) {
    const current = new Date(BASE_DATE)
    current.setUTCDate(BASE_DATE.getUTCDate() + dayOffset)

    for (let receptionIndex = 0; receptionIndex < 3; receptionIndex += 1) {
      const plate = `TEST-${dayOffset + 1}${receptionIndex + 1}-PFE`
      const pallets = 12 + dayOffset * 2 + receptionIndex
      const hour = 8 + receptionIndex * 2
      const hourLabel = `${String(hour).padStart(2, '0')}:00`

      rows.push({
        Total_N: plate,
        Jour: weekday(current),
        'Date_Prévue': current,
        'Date_Arrivée': current,
        'Heure_Arrivée': hourLabel,
        Plaque_Immatriculation: plate,
        'Type_Véhicule': receptionIndex % 2 === 0 ? 'Truck' : 'Van',
        Fournisseur: `Supplier-${(receptionIndex % 3) + 1}`,
        Origine: dayOffset % 2 === 0 ? 'Local' : 'Euro',
        Nb_Palettes: pallets,
        Position: `Dock-${receptionIndex + 1}`,
        'Date_Déchargement': null,
        'temp_Déchargement': null,
        "Jours_d'Attente": receptionIndex === 0 ? 0 : 1,
        Created_By_Email: 'seed-week@pfe.local',
        Created_By_Id: 'seed-week-script',
        Seed_Tag: `seed-week-${toYmd(BASE_DATE)}`,
      })
    }
  }

  return rows
}

async function run() {
  try {
    await connectDB()
    const rows = makeRows()
    const result = await DashboardData.insertMany(rows, { ordered: true })
    console.log(`Inserted ${result.length} receptions from ${toYmd(BASE_DATE)} to ${toYmd(new Date(BASE_DATE.getTime() + (DAYS - 1) * 86400000))}.`)
  } catch (error) {
    console.error('Seed week receptions error:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.connection.close()
  }
}

run()
