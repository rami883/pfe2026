import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import XLSX from "xlsx";
import DashboardData from "../models/DashboardData.js";

dotenv.config();

const BATCH_SIZE = Number(process.env.ETL_BATCH_SIZE || 1000);
const SHOULD_REPLACE = String(process.env.ETL_REPLACE || "").toLowerCase() === "true";
const args = process.argv.slice(2);
const fileArg = args[0] || process.env.ETL_EXCEL_PATH;
const sheetArg = args[1] || process.env.ETL_SHEET_NAME || null;

function pickFirstNonNull(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

function mapRowToDashboardSchema(row = {}) {
  const trailerNo = pickFirstNonNull(
    row.Record_No,
    row.RecordNo,
    row["Record No"],
    row.Plaque_Immatriculation,
    row.Total_N,
  );
  const jour = pickFirstNonNull(row.Day, row.Jour);
  const datePrevue = pickFirstNonNull(row.Planned_Date, row["Date_Prévue"], row.Date_Prevue);
  const dateArrivee = pickFirstNonNull(row.Arrival_Date, row["Date_Arrivée"], row.Date_Arrivee);
  const heureArrivee = pickFirstNonNull(row.Arrival_Time, row["Heure_Arrivée"], row.Heure_Arrivee);
  const plaque = pickFirstNonNull(row.Plate_No, row.Plaque_Immatriculation, row.Total_N);
  const typeVehicule = pickFirstNonNull(row.Vehicle_Type, row["Type_Véhicule"], row.Type_Vehicule);
  const fournisseur = pickFirstNonNull(row.Supplier, row.Fournisseur);
  const origine = pickFirstNonNull(row.Origin, row.Origine);
  const nbPalettes = pickFirstNonNull(row.N_Pallets, row.Nb_Palettes);
  const dateDechargement = pickFirstNonNull(
    row.Unloaded_Date,
    row["Date_Déchargement"],
    row.Date_Dechargement,
  );
  const heureDechargement = pickFirstNonNull(
    row.Unloaded_Time,
    row["temp_Déchargement"],
    row.temp_Dechargement,
  );
  const joursAttente = pickFirstNonNull(
    row.Waiting_Days,
    row["Jours_d'Attente"],
    row.Jours_d_Attente,
  );

  return {
    // Legacy fields for existing backend aggregations.
    Record_No: trailerNo,
    Day: jour,
    Planned_Date: datePrevue,
    Arrival_Date: dateArrivee,
    Arrival_Time: heureArrivee,
    Plate_No: plaque,
    Vehicle_Type: typeVehicule,
    Supplier: fournisseur,
    Origin: origine,
    N_Pallets: nbPalettes,
    Position: pickFirstNonNull(row.Position),
    Unloaded_Date: dateDechargement,
    Unloaded_Time: heureDechargement,
    Waiting_Days: joursAttente,
    // French fields for MongoDB columns as requested.
    Total_N: trailerNo,
    Jour: jour,
    "Date_Prévue": datePrevue,
    "Date_Arrivée": dateArrivee,
    "Heure_Arrivée": heureArrivee,
    Plaque_Immatriculation: plaque,
    "Type_Véhicule": typeVehicule,
    Fournisseur: fournisseur,
    Origine: origine,
    Nb_Palettes: nbPalettes,
    "Date_Déchargement": dateDechargement,
    "temp_Déchargement": heureDechargement,
    "Jours_d'Attente": joursAttente,
  };
}

async function run() {
  if (!fileArg) {
    throw new Error(
      "Missing Excel file path. Usage: node ETL/loadExcelToMongo.js <file.xlsx> [sheetName]",
    );
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const targetSheetName = sheetArg || workbook.SheetNames[0];
  if (!targetSheetName) {
    throw new Error("No sheet found in workbook.");
  }

  const sheet = workbook.Sheets[targetSheetName];
  if (!sheet) {
    throw new Error(`Sheet not found: ${targetSheetName}`);
  }

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
  const documents = rawRows.map((row) => mapRowToDashboardSchema(row));
  if (!documents.length) {
    throw new Error("No rows found in cleaned file.");
  }

  console.log(`Read ${documents.length} rows from cleaned file.`);

  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in environment.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    if (SHOULD_REPLACE) {
      const deleteResult = await DashboardData.deleteMany({});
      console.log(`Replace mode enabled: deleted ${deleteResult.deletedCount} existing records.`);
    }

    let inserted = 0;
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      await DashboardData.insertMany(batch, { ordered: false });
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${documents.length}`);
    }

    console.log(`ETL finished. Inserted ${inserted} records.`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Excel ETL failed:", error.message);
  process.exitCode = 1;
});
