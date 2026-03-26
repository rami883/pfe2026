import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { protect, adminOnly } from "../middleware/auth.js";
const router = express.Router();




router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;
    try {
        if (!username || !email || !password|| !role) {
            return res.status(400).json({ message: "Please fill all the fields " });
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
        const user = await User.create({username, email, password,role });
        const token = generateToken(user._id);
        res.status(201).json({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token,
    });
  } catch (error) {
   
    console.error("Registration Error: ", error); 
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
//Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {expiresIn: "30d" })

}
 export default router;