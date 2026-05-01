import dotenv from 'dotenv'
import mongoose from 'mongoose'
import DashboardData from '../models/DashboardData.js'

dotenv.config()

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing MONGO_URI in environment.')
  }

  const dbName = String(process.env.MONGO_DB_NAME || '').trim()
  await mongoose.connect(process.env.MONGO_URI, dbName ? { dbName } : undefined)

  try {
    const unsetFields = {
      Record_No: '',
      Day: '',
      Planned_Date: '',
      Arrival_Date: '',
      Arrival_Time: '',
      Plate_No: '',
      Vehicle_Type: '',
      Supplier: '',
      Origin: '',
      N_Pallets: '',
      Unloaded_Date: '',
      Unloaded_Time: '',
      Waiting_Days: '',
    }

    const result = await DashboardData.updateMany({}, { $unset: unsetFields })
    console.log(
      `English fields removed. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`,
    )
  } finally {
    await mongoose.disconnect()
  }
}

run().catch((error) => {
  console.error('Cleanup failed:', error.message)
  process.exitCode = 1
})

