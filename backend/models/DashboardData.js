import mongoose from "mongoose";

const { Schema } = mongoose;

// Schema aligned with the cleaned dataset.
// strict:false allows additional columns without breaking inserts.
const dashboardDataSchema = new mongoose.Schema(
  {
    Total_N: Schema.Types.Mixed,
    Jour: Schema.Types.Mixed,
    "Date_Prévue": Schema.Types.Mixed,
    "Date_Arrivée": Schema.Types.Mixed,
    "Heure_Arrivée": Schema.Types.Mixed,
    Plaque_Immatriculation: Schema.Types.Mixed,
    "Type_Véhicule": Schema.Types.Mixed,
    Fournisseur: Schema.Types.Mixed,
    Origine: Schema.Types.Mixed,
    Nb_Palettes: Schema.Types.Mixed,
    Position: Schema.Types.Mixed,
    "Date_Déchargement": Schema.Types.Mixed,
    "temp_Déchargement": Schema.Types.Mixed,
    "Jours_d'Attente": Schema.Types.Mixed,
  },
  {
    strict: false,
    timestamps: true,
  },
);

const DashboardData = mongoose.model("DashboardData", dashboardDataSchema);

export default DashboardData;
