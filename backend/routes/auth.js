import express from "express";
import jwt from "jsonwebtoken";
import { adminOnly, protect } from "../middleware/auth.js";
import User from "../models/User.js";
import {
  getYazakiIdentifierErrorMessage,
  normalizeYazakiIdentifierInput,
} from "../utils/yazakiEmail.js";

const router = express.Router();

const ALLOWED_REGISTER_ROLES = new Set(["gestionnaire", "directeur"]);

function buildUserPayload(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    isApproved: Boolean(user.isApproved),
    isRejected: Boolean(user.isRejected),
  };
}

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

async function findApprovableUserById(userId) {
  if (!userId) {
    return null;
  }

  return User.findOne({
    _id: userId,
    role: { $in: Array.from(ALLOWED_REGISTER_ROLES) },
  });
}

router.post("/register", async (req, res) => {
  const { username, email, identifier, password, role } = req.body;
  const normalizedUsername = String(username || "").trim();
  const normalizedRole = String(role || "").trim().toLowerCase();
  const hasIdentifierField = Object.prototype.hasOwnProperty.call(
    req.body,
    "identifier",
  );
  const emailSource = hasIdentifierField ? identifier : email;

  try {
    if (!normalizedUsername || !password || !normalizedRole || !emailSource) {
      return res
        .status(400)
        .json({ message: "Veuillez completer tous les champs obligatoires." });
    }

    if (!ALLOWED_REGISTER_ROLES.has(normalizedRole)) {
      return res
        .status(400)
        .json({ message: "Role invalide. Utilisez gestionnaire ou directeur." });
    }

    const normalizedIdentifier = normalizeYazakiIdentifierInput(emailSource, {
      allowFullEmail: !hasIdentifierField,
    });

    if (!normalizedIdentifier.ok) {
      return res.status(400).json({
        message: getYazakiIdentifierErrorMessage(normalizedIdentifier.code, {
          allowFullEmail: !hasIdentifierField,
        }),
      });
    }

    const normalizedEmail = normalizedIdentifier.email;
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Un compte existe deja avec cet email." });
    }

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      isApproved: false,
      isRejected: false,
    });

    return res.status(201).json({
      message:
        "Inscription enregistree. Votre compte doit etre approuve par un administrateur.",
      user: buildUserPayload(user),
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

router.post("/login", async (req, res) => {
  const { email, identifier, password } = req.body;
  const emailSource = identifier || email;

  try {
    if (!emailSource || !password) {
      return res
        .status(400)
        .json({ message: "Veuillez completer tous les champs obligatoires." });
    }

    const normalizedIdentifier = normalizeYazakiIdentifierInput(emailSource, {
      allowFullEmail: true,
    });

    if (!normalizedIdentifier.ok) {
      return res.status(400).json({
        message: getYazakiIdentifierErrorMessage(normalizedIdentifier.code, {
          allowFullEmail: true,
        }),
      });
    }

    const user = await User.findOne({ email: normalizedIdentifier.email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    if (user.role !== "admin") {
      if (user.isRejected) {
        return res.status(403).json({
          message:
            "Votre compte a ete rejete. Contactez un administrateur pour plus d'informations.",
        });
      }

      if (!user.isApproved) {
        return res.status(403).json({
          message:
            "Votre compte est en attente de validation par un administrateur.",
        });
      }
    }

    return res.status(200).json({
      ...buildUserPayload(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

router.get("/me", protect, async (req, res) => {
  return res.status(200).json(req.user);
});

router.get("/admin-data", protect, adminOnly, (_req, res) => {
  return res.json({ message: "Admin content" });
});

router.get("/pending", protect, adminOnly, async (_req, res) => {
  try {
    const users = await User.find({
      role: { $in: Array.from(ALLOWED_REGISTER_ROLES) },
      isApproved: false,
      isRejected: false,
    })
      .select("-password")
      .sort({ createdAt: 1 });

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Fetch Pending Users Error:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

router.patch("/pending/:userId/approve", protect, adminOnly, async (req, res) => {
  try {
    const user = await findApprovableUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    user.isApproved = true;
    user.isRejected = false;
    await user.save();

    return res.status(200).json({
      message: "Utilisateur approuve avec succes.",
      user: buildUserPayload(user),
    });
  } catch (error) {
    console.error("Approve User Error:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

router.patch("/pending/:userId/reject", protect, adminOnly, async (req, res) => {
  try {
    const user = await findApprovableUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    user.isApproved = false;
    user.isRejected = true;
    await user.save();

    return res.status(200).json({
      message: "Utilisateur rejete avec succes.",
      user: buildUserPayload(user),
    });
  } catch (error) {
    console.error("Reject User Error:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
});

export default router;
