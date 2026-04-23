import express from "express";
import DashboardData from "../models/DashboardData.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
const ALLOWED_ROLES = new Set(["admin", "directeur"]);

function requireDashboardAccess(req, res, next) {
  if (!req.user || !ALLOWED_ROLES.has(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  return next();
}

function parseDaysQuery(daysRaw) {
  const parsed = Number(daysRaw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 365;
  }

  return Math.min(Math.floor(parsed), 3650);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildNormalizedFieldsStage() {
  return {
    $addFields: {
      supplierNormalized: {
        $trim: {
          input: {
            $convert: {
              input: { $ifNull: ["$Supplier", ""] },
              to: "string",
              onError: "",
              onNull: "",
            },
          },
        },
      },
      palletsNumeric: {
        $convert: {
          input: { $ifNull: ["$N_Pallets", 0] },
          to: "double",
          onError: 0,
          onNull: 0,
        },
      },
      arrivalDateNormalized: {
        $convert: {
          input: { $ifNull: ["$Arrival_Date", null] },
          to: "date",
          onError: null,
          onNull: null,
        },
      },
    },
  };
}

router.get("/supplier", protect, requireDashboardAccess, async (req, res) => {
  try {
    const days = parseDaysQuery(req.query.days);
    const supplierQuery = String(req.query.supplier || "").trim();

    const sinceDate = new Date();
    sinceDate.setHours(0, 0, 0, 0);
    sinceDate.setDate(sinceDate.getDate() - days);

    const pipeline = [
      buildNormalizedFieldsStage(),
      {
        $match: {
          supplierNormalized: { $nin: ["", null] },
          arrivalDateNormalized: { $gte: sinceDate },
        },
      },
    ];

    if (supplierQuery) {
      pipeline.push({
        $match: {
          supplierNormalized: {
            $regex: `^${escapeRegex(supplierQuery)}$`,
            $options: "i",
          },
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: "$supplierNormalized",
          totalPallets: { $sum: "$palletsNumeric" },
          records: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          supplier: "$_id",
          totalPallets: { $round: ["$totalPallets", 2] },
          records: 1,
        },
      },
      { $sort: { totalPallets: -1, supplier: 1 } },
    );

    const supplierData = await DashboardData.aggregate(pipeline);
    return res.status(200).json(supplierData);
  } catch (error) {
    console.error("Dashboard supplier error:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

export default router;
