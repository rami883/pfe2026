import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import XLSX from "xlsx";
import DashboardData from "../models/DashboardData.js";

dotenv.config();

const BATCH_SIZE = Number(process.env.ETL_BATCH_SIZE || 1000);
const args = process.argv.slice(2);
const fileArg = args[0] || process.env.ETL_EXCEL_PATH;
const sheetArg = args[1] || process.env.ETL_SHEET_NAME || null;

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

  console.log(`Read ${documents.length} rows from cleaned file.`);

  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in environment.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
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
