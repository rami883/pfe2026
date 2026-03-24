const mongoose = require('mongoose')

const gestionnaireStockSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    prenom: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'gestionnairesStock',
  },
)

module.exports =
  mongoose.models.GestionnaireStock ||
  mongoose.model('GestionnaireStock', gestionnaireStockSchema)
