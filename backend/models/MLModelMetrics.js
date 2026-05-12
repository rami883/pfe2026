import mongoose from 'mongoose'

const mlModelMetricsSchema = new mongoose.Schema(
  {
    bestModel: {
      type: String,
      required: true,
      trim: true,
    },
    mae: {
      type: Number,
      required: true,
    },
    rmse: {
      type: Number,
      required: true,
    },
    r2: {
      type: Number,
      required: true,
    },
    totalPredictions: {
      type: Number,
      required: true,
      min: 0,
    },
    averageErrorPercent: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
)

mlModelMetricsSchema.index({ createdAt: -1 })

const MLModelMetrics = mongoose.model('MLModelMetrics', mlModelMetricsSchema)

export default MLModelMetrics

