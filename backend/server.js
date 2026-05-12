import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import mlRoutes from './routes/ml.js';
import { connectDB } from './config/db.js';
dotenv.config();

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

const allowedOrigins = [
    ...new Set(
        [FRONTEND_URL, ...(process.env.FRONTEND_URLS || '').split(','), ...DEFAULT_ALLOWED_ORIGINS]
            .map((value) => String(value || '').trim())
            .filter(Boolean),
    ),
];

const LOCAL_DEV_ORIGIN_PATTERN =
    /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):5173$/;

const corsOptions = {
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (allowedOrigins.includes(origin) || LOCAL_DEV_ORIGIN_PATTERN.test(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.use('/api/users',authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ml', mlRoutes);
connectDB();
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
