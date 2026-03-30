import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { protect, adminOnly } from "../middleware/auth.js";
const router = express.Router();
const ALLOWED_ROLES = new Set(["gestionnaire", "directeur"]);




router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;
  const normalizedRole = String(role || "").trim().toLowerCase();
    try {
        if (!username || !email || !password|| !role) {
            return res.status(400).json({ message: "Please fill all the fields " });
        }// this will check if the role is valid, it should be either gestionnaire or directeur
        if (!ALLOWED_ROLES.has(normalizedRole)) {
            return res.status(400).json({ message: "Invalid role. Use gestionnaire or directeur." });
        }
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res
                .status(400)
                .json({ message: "User already exists with this email" });
        }
     
// this will create a new user in the database, 
// the password will be hashed before saving 
// it to the database because of the pre save hook we defined in the user model
          // ✅ CREATE USER AS PENDING
    const user = await User.create({
      username,
      email,
      password,
      role: normalizedRole,
      isApproved: false
    });

    res.status(201).json({
      message: "Account created. Waiting for admin approval."
    });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// this route will be used to login a user, 
// it will check if the email and password 
// are correct and return the user data if they are correct
router.post("/login", async (req, res) => {
const { email, password } = req.body;
try {
    if ( !email || !password) {
        return res
            .status(400)
            .json({ message: "Please fill all the fields" });
    }
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
        return res
            .status(401)
            .json({ message: "Invalid credentials" });
    }
    if (user.role !== "admin" && !user.isApproved) {
  return res.status(403).json({
    message: "Your account is pending approval by the admin"
  });
}
    
    // if the email and password are correct, 
    // we will return the user data, 
    // you can also return a token here if you want to implement
    //  authentication with tokens
    const token = generateToken(user._id);
    res.status(200).json({
    id: user._id,
    username: user.username,
     email: user.email,
     role: user.role,
        token,
    });

 } 
catch (error) {
    res.status(500).json({ message: "Server error" });
 }
})
// this route will be used to get the user data,
router.get("/me", protect , async (req, res) => {
  res.status(200).json( req.user);
// this route will be used to test if the user is an admin or not,

  router.get("/admin-data", protect, adminOnly, (req, res) => {
  res.json({ message: "Admin content" });
});

});

// Récupérer les utilisateurs en attente
router.get("/pending", protect, adminOnly, async (req, res) => {
  console.log("📋 Pending users request by:", req.user.username);
  const users = await User.find({ isApproved: false }).select("-password");
  res.json(users);
});

// Approuver ou refuser un utilisateur
router.patch("/approve/:id", protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

        user.isApproved = true;
        await user.save();
        res.json({ message: `Compte de ${user.username} approuvé.` });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// Refuser un utilisateur (le supprimer)
router.delete("/reject/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.deleteOne();

    res.json({ message: "User rejected and deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

//Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {expiresIn: "30d" })

}
 export default router;
