import User from '../models/User.js';
import jwt from 'jsonwebtoken';
// this middleware will be used to protect routes,

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log("🔐 Token received:", token);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("📦 Decoded token:", decoded);
      req.user = await User.findById(decoded.id).select('-password');
      console.log("👤 User from DB:", req.user);
      return next();
    } catch (error) {
      console.error("❌ Token verification failed:", error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } 
  return res.status(401).json({ message: "Not authorized, no token" });     
};
//Authentication middleware to protect routes, 
// it will check if the token is valid and if the user exists
//Authorization : [bearer,< token>]


// this middleware will be used to restrict access to certain routes to only admin users

export const adminOnly = (req, res, next) => {
  console.log("🔒 adminOnly - req.user:", req.user);
  if (!req.user) {
    console.log("❌ No user attached");
    return res.status(403).json({ message: "Access denied" });
  }
  console.log("🔒 adminOnly - user role:", req.user.role);
  if (req.user.role !== "admin") {
    console.log(`❌ Role mismatch: expected "admin", got "${req.user.role}"`);
    return res.status(403).json({ message: "Access denied" });
  }
  console.log("✅ Admin access granted");
  next();
};
