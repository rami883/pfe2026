require('dotenv').config()

const mongoose = require('mongoose')
const app = require('../app')
const Directeur = require('../models/Directeur')
const GestionnaireStock = require('../models/GestionnaireStock')

const TEST_HOST = '127.0.0.1'
const TEST_PORT = 5052
const BASE_URL = `http://${TEST_HOST}:${TEST_PORT}`
const TEST_DIRECTEUR_EMAIL = `directeur.${Date.now()}@yazaki-europe.com`
const TEST_GESTIONNAIRE_EMAIL = `gestionnaire.${Date.now()}@yazaki-europe.com`
const TEST_PASSWORD = 'SmokeTest2026'

async function requestJson(path, options = {}, cookie = '') {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    },
  })

  const text = await response.text()
  let data = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  return {
    status: response.status,
    data,
    cookie: response.headers.get('set-cookie') || '',
  }
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function printStep(label, result) {
  console.log(`[OK] ${label} -> status ${result.status}`)
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required for test:auth-smoke.')
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  const server = app.listen(TEST_PORT, TEST_HOST)

  try {
    console.log(`Auth smoke test running on ${BASE_URL}`)

    const ping = await requestJson('/api/test')
    assertCondition(ping.status === 200, '/api/test should return 200')
    printStep('GET /api/test', ping)

    const registerDirecteur = await requestJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nom: 'Smoke',
        prenom: 'Directeur',
        email: TEST_DIRECTEUR_EMAIL,
        role: 'directeur',
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
      }),
    })
    assertCondition(registerDirecteur.status === 201, 'Directeur register should return 201')
    printStep('POST /api/auth/register (directeur)', registerDirecteur)

    const inDirecteurs = await Directeur.findOne({ email: TEST_DIRECTEUR_EMAIL })
    assertCondition(Boolean(inDirecteurs), 'Directeur user should be stored in directeurs')

    const registerGestionnaire = await requestJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nom: 'Smoke',
        prenom: 'Gestionnaire',
        email: TEST_GESTIONNAIRE_EMAIL,
        role: 'gestionnaire',
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
      }),
    })
    assertCondition(
      registerGestionnaire.status === 201,
      'Gestionnaire register should return 201',
    )
    printStep('POST /api/auth/register (gestionnaire)', registerGestionnaire)

    const inGestionnairesStock = await GestionnaireStock.findOne({
      email: TEST_GESTIONNAIRE_EMAIL,
    })
    assertCondition(
      Boolean(inGestionnairesStock),
      'Gestionnaire user should be stored in gestionnairesStock',
    )

    const loginDirecteur = await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: TEST_DIRECTEUR_EMAIL,
        password: TEST_PASSWORD,
        role: 'directeur',
      }),
    })
    assertCondition(loginDirecteur.status === 200, 'Directeur login should return 200')
    assertCondition(Boolean(loginDirecteur.cookie), 'Directeur login should return a session cookie')
    printStep('POST /api/auth/login (directeur)', loginDirecteur)

    const loginWrongRole = await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: TEST_DIRECTEUR_EMAIL,
        password: TEST_PASSWORD,
        role: 'gestionnaire',
      }),
    })
    assertCondition(loginWrongRole.status === 401, 'Wrong role login should return 401')
    printStep('POST /api/auth/login (wrong role)', loginWrongRole)

    const me = await requestJson('/api/auth/me', {}, loginDirecteur.cookie)
    assertCondition(me.status === 200, '/api/auth/me should return 200')
    printStep('GET /api/auth/me', me)

    const logout = await requestJson('/api/auth/logout', { method: 'POST' }, loginDirecteur.cookie)
    assertCondition(logout.status === 200, 'Logout should return 200')
    printStep('POST /api/auth/logout', logout)

    const invalidDomainRegister = await requestJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nom: 'Public',
        prenom: 'Email',
        email: 'public@gmail.com',
        role: 'directeur',
        password: 'Public2026',
        confirmPassword: 'Public2026',
      }),
    })
    assertCondition(
      invalidDomainRegister.status === 400,
      'Register with invalid domain should return 400',
    )
    printStep('POST /api/auth/register (invalid domain)', invalidDomainRegister)

    console.log('All smoke tests passed.')
  } finally {
    await Directeur.deleteOne({ email: TEST_DIRECTEUR_EMAIL })
    await GestionnaireStock.deleteOne({ email: TEST_GESTIONNAIRE_EMAIL })
    await mongoose.connection.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

run().catch((error) => {
  console.error(`Smoke test failed: ${error.message}`)
  process.exit(1)
})
