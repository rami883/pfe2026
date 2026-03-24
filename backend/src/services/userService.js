const mongoose = require('mongoose')
const Directeur = require('../models/Directeur')
const GestionnaireStock = require('../models/GestionnaireStock')

const ROLE_TO_MODEL = {
  directeur: Directeur,
  gestionnaire: GestionnaireStock,
}

function getModelByRole(role) {
  const model = ROLE_TO_MODEL[role]

  if (!model) {
    throw new Error('Unsupported role.')
  }

  return model
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1
}

async function findUserByEmail(role, email) {
  const model = getModelByRole(role)
  return model.findOne({ email: email.toLowerCase() })
}

async function createUser(user) {
  const model = getModelByRole(user.role)

  return model.create({
    nom: user.nom,
    prenom: user.prenom,
    email: user.email.toLowerCase(),
    password: user.password,
  })
}

module.exports = {
  createUser,
  getModelByRole,
  findUserByEmail,
  isDatabaseConnected,
}
