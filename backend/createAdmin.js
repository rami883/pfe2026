import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
// dotenv est utilisé pour charger les variables d'environnement à partir d'un fichier .env
dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "admin@yazaki.com";

    const existing = await User.findOne({ email });

    if (existing) {
      console.log("❌ Admin already exists");
      process.exit();
    }

    const admin = await User.create({
      username: "Admin",
      email: email,
      password: "admin123", // change later!
      role: "admin",
      isApproved: true,
    });

    console.log("✅ Admin created:", admin.email);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createAdmin();