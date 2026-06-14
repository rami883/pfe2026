import mongoose from "mongoose";
// configuration de connexion à MongoDB
export const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;  //lien avec database
        const dbName = String(process.env.MONGO_DB_NAME || "").trim();

        const conn = await mongoose.connect(
            mongoUri,
            dbName ? { dbName } : undefined,
        );
        console.log(
            `MongoDB Connected: ${conn.connection.host} | Database: ${conn.connection.name}`,
        );
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }};
