const bcrypt = require('bcryptjs')
const { createUser, findUserByEmail, isDatabaseConnected } = require('./userService')

const COMPANY_DOMAIN = 'yazaki-europe.com'

function normalizeIdentifier(identifier) {
  return identifier.trim().toLowerCase()
}

function buildRoleLabel(role) {
  return role === 'directeur' ? 'Directeur' : 'Gestionnaire de stock'
}

function resolveLoginEmail(identifier) {
  const normalizedIdentifier = normalizeIdentifier(identifier)

  if (normalizedIdentifier.includes('@')) {
    return normalizedIdentifier
  }

  return `${normalizedIdentifier}@${COMPANY_DOMAIN}`
}

function serializeUserForSession(user) {
  return {
    id: String(user._id),
    email: user.email,
    firstName: user.prenom,
    lastName: user.nom,
    fullName: `${user.prenom} ${user.nom}`.trim(),
    role: user.role,
    roleLabel: buildRoleLabel(user.role),
    createdAt: user.createdAt,
  }
}

async function authenticateUser({ identifier, password, role }) {
  if (!isDatabaseConnected()) {
    throw new Error('MongoDB is not connected.')
  }

  const loginEmail = resolveLoginEmail(identifier)
  const user = await findUserByEmail(role, loginEmail)

  if (!user) {
    return null
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    return null
  }

  user.role = role
  return user
}

async function registerUser({ nom, prenom, email, role, password }) {
  if (!isDatabaseConnected()) {
    throw new Error('MongoDB is not connected.')
  }

  const normalizedEmail = normalizeIdentifier(email)
  const existingUser = await findUserByEmail(role, normalizedEmail)
  if (existingUser) {
    return { errorCode: 'EMAIL_ALREADY_EXISTS' }
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await createUser({
    nom,
    prenom,
    email: normalizedEmail,
    role,
    password: hashedPassword,
  })

  user.role = role
  return { user }
}

module.exports = {
  authenticateUser,
  registerUser,
  serializeUserForSession,
}
