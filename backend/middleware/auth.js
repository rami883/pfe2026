import User from '../models/User.js';
import jwt from 'jsonwebtoken';
// this middleware will be used to protect routes,
export const protect = async (req, res, next) => {
    let tocken;
// this will check if the authorization header is present 
// and starts with Bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
      tocken = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(tocken, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            return next();
        } catch (error) {
            console.error("tocken verification failed", error);
            return res.status(401).json({ message: "Not authorized, tocken failed" });

        }
    } 
    return res.status(401).json({ message: "Not authorized, no tocken" });     
}
//Authentication middleware to protect routes, 
// it will check if the token is valid and if the user exists
//Authorization : [bearer,< token>]


// this middleware will be used to restrict access to certain routes to only admin users
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "Administrateur") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};