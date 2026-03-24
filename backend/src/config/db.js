const mongoose = require('mongoose')

async function connectDB() {
  const enableDb = process.env.ENABLE_DB === 'true'
  const authMode = process.env.AUTH_MODE || 'database'
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI

  if (!enableDb) {
    throw new Error('ENABLE_DB must be true to run the backend with MongoDB.')
  }

  if (authMode !== 'database') {
    throw new Error('AUTH_MODE must be set to "database". Demo mode is disabled.')
  }

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in .env.')
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log('MongoDB connected successfully.')
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`)
  }
}

module.exports = connectDB
