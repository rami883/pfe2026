import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import {
  normalizeYazakiIdentifierInput,
  YAZAKI_EMAIL_SUFFIX,
} from "../utils/yazakiEmail.js";

dotenv.config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const adminSource =
      process.env.ADMIN_IDENTIFIER ||
      process.env.ADMIN_EMAIL ||
      `admin${YAZAKI_EMAIL_SUFFIX}`;
    const normalizedAdmin = normalizeYazakiIdentifierInput(adminSource, {
      allowFullEmail: true,
    });

    if (!normalizedAdmin.ok) {
      throw new Error(
        "ADMIN_IDENTIFIER/ADMIN_EMAIL invalide. Utilisez un identifiant Yazaki valide.",
      );
    }

    const email = normalizedAdmin.email;
    const existing = await User.findOne({ email });

    if (existing) {
      console.log("Admin deja existant:", existing.email);
      process.exit(0);
    }

    const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";

    const admin = await User.create({
      username: "Administrateur",
      email,
      password: adminPassword,
      role: "admin",
      isApproved: true,
      isRejected: false,
    });

    console.log("Admin cree:", admin.email);
    process.exit(0);
  } catch (error) {
    console.error("Erreur creation admin:", error.message);
    process.exit(1);
  }
}

createAdmin();
