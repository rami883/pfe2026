import mongoose from 'mongoose'

const mlPredictionResultSchema = new mongoose.Schema(
  {
    transporteur: {
      type: String,
      default: 'UNKNOWN',
      trim: true,
    },
    fournisseur: {
      type: String,
      default: 'UNKNOWN',
      trim: true,
    },
    type_transport: {
      type: String,
      default: 'UNKNOWN',
      trim: true,
    },
    designation: {
      type: String,
      default: 'UNKNOWN',
      trim: true,
    },
    nbr_colis: {
      type: Number,
      default: 0,
    },
    delai_jours: {
      type: Number,
      default: 0,
    },
    reception_year: {
      type: Number,
      default: null,
    },
    reception_month: {
      type: Number,
      default: null,
    },
    montant_reel: {
      type: Number,
      required: true,
    },
    montant_predit: {
      type: Number,
      required: true,
    },
    erreur_absolue: {
      type: Number,
      required: true,
    },
    erreur_pourcentage: {
      type: Number,
      required: true,
    },
    statut: {
      type: String,
      enum: ['Bonne prediction', 'Prediction moyenne', 'A verifier'],
      required: true,
    },
    model_name: {
      type: String,
      default: 'UNKNOWN',
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

mlPredictionResultSchema.index({ transporteur: 1 })
mlPredictionResultSchema.index({ fournisseur: 1 })
mlPredictionResultSchema.index({ type_transport: 1 })
mlPredictionResultSchema.index({ statut: 1 })
mlPredictionResultSchema.index({ erreur_absolue: -1 })
mlPredictionResultSchema.index({ reception_year: 1, reception_month: 1 })

const MLPredictionResult = mongoose.model(
  'MLPredictionResult',
  mlPredictionResultSchema,
)

export default MLPredictionResult
