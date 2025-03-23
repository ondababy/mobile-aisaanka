import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import UserModel from "../models/User.js";
dotenv.config();

export const verifyUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Extract token

    if (!token) {
        console.error("No token provided");
        return res.status(401).json({ message: "Not Authenticated: No Token Provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded JWT:", decoded); // Check the decoded token
        req.user = await UserModel.findById(decoded.id).select("-password"); // Attach user to req
        if (!req.user) {
            console.error("User not found");
            return res.status(401).json({ message: "Not Authenticated: Invalid User" });
        }
        console.log("Authenticated User:", req.user); // Log the authenticated user
        next();
    } catch (error) {
        console.error("JWT verification failed:", error);
        res.status(401).json({ message: "Not Authenticated: Invalid Token" });
    }
};

// ✅ Middleware to verify if the user is an admin
export const verifyAdmin = async (req, res, next) => {
    if (!req.user) {
        console.error("User not authenticated");
        return res.status(403).json({ message: "Access Denied: Admin Only" });
    }

    if (req.user.role !== "admin") {
        console.error("Access denied: Not an admin");
        return res.status(403).json({ message: "Access Denied: Admin Only" });
    }
    console.log("Admin Access Granted:", req.user); // Log the admin access
    next();
};