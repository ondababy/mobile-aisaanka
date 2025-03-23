import express from "express";
import { signup, login, logout, verifyOtp, resendOtp, getProfile, updateProfile, forgotPassword, resetPassword } from "../controllers/authController.js";
import { verifyUser, verifyAdmin } from "../middleware/auth.js"; 

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", verifyUser, logout);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
// router.get('/travel-history/:id', getUserTravelHistory);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/profile", verifyUser, getProfile);
router.put("/profile/update", verifyUser, updateProfile);

router.get("/admin-dashboard", verifyUser, verifyAdmin, (req, res) => {
    res.json({ message: "Welcome, Admin!" });
});

export default router;
