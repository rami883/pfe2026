import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import XLSX from "xlsx";
import DashboardData from "../models/DashboardData.js";

dotenv.config();

const BATCH_SIZE = Number(process.env.ETL_BATCH_SIZE || 1000);
const args = process.argv.slice(2);
const nonFlagArgs = args.filter((arg) => !String(arg).startsWith("--"));
const fileArg = nonFlagArgs[0] || process.env.ETL_EXCEL_PATH;
const sheetArg = nonFlagArgs[1] || process.env.ETL_SHEET_NAME || null;
const shouldReplace =
  args.includes("--replace") || String(process.env.ETL_REPLACE || "").toLowerCase() === "true";

function cleanText(valueRaw) {
  if (valueRaw === null || valueRaw === undefined) {
    return "";
  }

  return String(valueRaw).trim().replace(/\s+/g, " ");
}

function normalizeVehicleType(valueRaw) {
  const value = cleanText(valueRaw).toLowerCase();
  if (!value) {
    return "";
  }

  if (["truck", "camion"].includes(value)) {
    return "Truck";
  }

  if (value === "van") {
    return "Van";
  }

  return cleanText(valueRaw);
}

function normalizeOrigin(valueRaw) {
  const value = cleanText(valueRaw).toLowerCase();
  if (!value) {
    return "";
  }

  if (["euro", "eurol"].includes(value)) {
    return "Euro";
  }

  if (value === "local") {
    return "Local";
  }

  return cleanText(valueRaw);
}

function parseNumber(valueRaw) {
  const numericValue = Number(valueRaw);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue;
}

function parseDate(valueRaw) {
  if (!valueRaw) {
    return null;
  }

  if (valueRaw instanceof Date && !Number.isNaN(valueRaw.getTime())) {
    return valueRaw;
  }

  const parsed = new Date(valueRaw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function parseTime(valueRaw) {
  const value = cleanText(valueRaw);
  if (!value) {
    return "";
  }

  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    return value;
  }

  if (/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(value)) {
    return value.slice(0, 5);
  }

  const asDate = new Date(valueRaw);
  if (!Number.isNaN(asDate.getTime())) {
    const hh = String(asDate.getHours()).padStart(2, "0");
    const mm = String(asDate.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return "";
}

function deriveDayFromDate(dateValue) {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return "";
  }

  return dateValue.toLocaleDateString("en-US", { weekday: "short" });
}

function mapExcelRowToDashboardDocument(row) {
  const recordNo = cleanText(row.Total_N);
  const plateNo = cleanText(row.Plaque_Immatriculation);
  const supplier = cleanText(row.Fournisseur);
  const arrivalDate = parseDate(row.Date_Arrivée);
  const plannedDate = parseDate(row.Date_Prévue);
  const unloadedDate = parseDate(row.Date_Déchargement);
  const waitingDays = parseNumber(row["Jours_d'Attente"] ?? row.Jours_d_Attente);

  return {
    Record_No: recordNo || plateNo || "",
    Day: cleanText(row.Jour) || deriveDayFromDate(arrivalDate),
    Planned_Date: plannedDate,
    Arrival_Date: arrivalDate,
    Arrival_Time: parseTime(row.Heure_Arrivée),
    Plate_No: plateNo,
    Vehicle_Type: normalizeVehicleType(row.Type_Véhicule),
    Supplier: supplier,
    Origin: normalizeOrigin(row.Origine),
    N_Pallets: parseNumber(row.Nb_Palettes),
    Position: cleanText(row.Position),
    Unloaded_Date: unloadedDate,
    Unloaded_Time: parseTime(row.temp_Déchargement ?? row.Temp_Déchargement),
    Waiting_Days: waitingDays,
    Entry_Source: "Excel_Import",
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

  const documents = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
  if (!documents.length) {
    throw new Error("No rows found in cleaned file.");
  }

  const mappedDocuments = documents
    .map(mapExcelRowToDashboardDocument)
    .filter((doc) => doc.Arrival_Date && doc.Supplier);

  if (!mappedDocuments.length) {
    throw new Error("No valid rows after mapping (Arrival_Date and Supplier are required).");
  }

  console.log(`Read ${documents.length} rows from cleaned file.`);
  console.log(`Mapped ${mappedDocuments.length} valid rows for dashboard collection.`);

  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in environment.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    if (shouldReplace) {
      const deleteResult = await DashboardData.deleteMany({});
      console.log(`Deleted ${deleteResult.deletedCount} existing records before import.`);
    }

    let inserted = 0;
    for (let i = 0; i < mappedDocuments.length; i += BATCH_SIZE) {
      const batch = mappedDocuments.slice(i, i + BATCH_SIZE);
      await DashboardData.insertMany(batch, { ordered: false });
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${mappedDocuments.length}`);
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
