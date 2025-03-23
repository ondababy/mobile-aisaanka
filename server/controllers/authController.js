import bcrypt from "bcrypt";
import UserModel from "../models/User.js";
import { generateOtp } from "../utils/otp.js"; 
import { sendOtpEmail, sendPasswordResetEmail } from "../utils/mailer.js"; 
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
    try {
        const { name, username, email, age, gender, category, password } = req.body;
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOtp();
        const otpExpires = Date.now() + 3600000; // 1 hour

        sendOtpEmail(email, otp);

        const newUser = new UserModel({ 
            username, 
            name, 
            email, 
            age, 
            gender, // Added gender field
            category, 
            password: hashedPassword, 
            otp, 
            otpExpires, 
            role: "user" 
        });
        await newUser.save();

        res.status(201).json({ message: "User created. Please check your email for the OTP." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        console.log("Login attempt received:", req.body.email);
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Find user by email
        const user = await UserModel.findOne({ email });
        console.log("User found:", user ? "Yes" : "No");

        // Check if user exists
        if (!user) {
            return res.status(401).json({ message: "Invalid Email or Password" });
        }

        // Compare passwords - using try/catch to catch bcrypt errors
        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid Email or Password" });
            }
        } catch (bcryptError) {
            console.error("bcrypt error:", bcryptError);
            return res.status(500).json({ message: "Authentication error", details: bcryptError.message });
        }
        if (user.role === "user" && !user.isVerified) {
            return res.status(401).json({ 
                message: "Verify your email with the OTP.", 
                redirect: "/verify-otp" 
            });
        }

        // Check if banned
        if (user.status === "banned") {
            return res.status(403).json({ 
                message: "You have been banned by the admin. Please contact support." 
            });
        }

        // Update status if inactive
        let wasInactive = false;
        if (user.status === "inactive") {
            user.status = "active";
            wasInactive = true;
            await user.save();
        }

        // Generate JWT Token
        try {
            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );
            return res.status(200).json({
                message: "Success",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    gender: user.gender, // Added gender field
                    role: user.role,
                    status: user.status,
                    previousStatus: wasInactive ? "inactive" : user.status,
                },
            });
        } catch (jwtError) {
            console.error("JWT generation error:", jwtError);
            return res.status(500).json({ message: "Token generation failed", details: jwtError.message });
        }
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ 
            message: "An error occurred during login", 
            details: error.message 
        });
    }
};


export const logout = (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            res.status(err ? 500 : 200).json(err ? "Failed to logout" : "Logged out successfully");
        });
    } else {
        res.status(400).json({ error: "No session found" });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await UserModel.findOne({ email });

        if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // ✅ Mark user as verified
        user.isVerified = true;

        // ❌ Remove OTP so it cannot be reused
        user.otp = null;
        user.otpExpires = null;
        
        await user.save();

        res.status(200).json({ 
            message: "OTP verified successfully", 
            redirect: "/welcome"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate and save new OTP
        const newOtp = generateOtp();
        user.otp = newOtp;
        user.otpExpires = Date.now() + 3600000;

        try {
            await user.save();
        } catch (saveError) {
            console.error("❌ Error saving OTP:", saveError);
            return res.status(500).json({ message: "Failed to generate OTP. Please try again." });
        }

        // Send OTP via email
        try {
            await sendOtpEmail(email, newOtp);
        } catch (emailError) {
            console.error("❌ Error sending OTP email:", emailError);
            return res.status(500).json({ message: "Failed to send OTP email. Please try again." });
        }

        res.status(200).json({ message: "A new OTP has been sent to your email." });
    } catch (error) {
        console.error("❌ Unexpected Error:", error);
        res.status(500).json({ message: "Internal server error. Please try again later." });
    }
};

export const getProfile = async (req, res) => {
    try {
        // ✅ Get token from request headers
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        // ✅ Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // ✅ Find user in the database (excluding password)
        const user = await UserModel.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching profile" });
    }
};

export const updateProfile = async (req, res) => {
    try {
      const { currentPassword, name, username, email, gender, newPassword } = req.body;
      const userId = req.user.id; // From your auth middleware
      
      console.log("Profile update request received for user:", userId);
  
      // Find the user
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
  
      // Update the fields if provided
      if (name) user.name = name;
      if (gender) user.gender = gender; // Added gender field update
      if (username) {
        // Check if username is taken by another user
        const existingUser = await UserModel.findOne({ 
          username, 
          _id: { $ne: userId } 
        });
        
        if (existingUser) {
          return res.status(400).json({ error: "Username is already taken" });
        }
        
        user.username = username;
      }
      
      if (email) {
        // Check if email is taken by another user
        const existingUser = await UserModel.findOne({ 
          email, 
          _id: { $ne: userId } 
        });
        
        if (existingUser) {
          return res.status(400).json({ error: "Email is already taken" });
        }
        
        user.email = email;
      }
  
      // Update password if provided
      if (newPassword) {
        user.password = await bcrypt.hash(newPassword, 10);
      }
  
      // Save the updated user
      await user.save();
  
      // Generate a new token with the updated info
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
  
      // Return success response with updated user info
      res.status(200).json({
        message: "Profile updated successfully",
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          gender: user.gender, // Added gender field
          role: user.role,
          status: user.status,
          isVerified: user.isVerified
        }
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ 
        error: "Error updating profile", 
        details: error.message 
      });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        console.log("Forgot password request received for email:", req.body.email);
        const { email } = req.body;
        
        // Find the user
        const user = await UserModel.findOne({ email });
        if (!user) {
            console.log("User not found for email:", email);
            // For security, we still return success to prevent email enumeration
            return res.status(200).json({ 
                success: true, 
                message: "If a user with this email exists, a password reset link has been sent." 
            });
        }

        console.log("User found, generating reset token...");
        // Generate a reset token
        const resetToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Store token in the database with expiration
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        console.log("Reset token saved to user record");

        // Create reset URL
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
        console.log("Reset URL generated:", resetUrl);

        // Send email with reset link
        try {
            console.log("Attempting to send password reset email...");
            await sendPasswordResetEmail(email, resetUrl);
            console.log("Password reset email sent successfully to:", email);
            
            return res.status(200).json({ 
                success: true, 
                message: "Password reset link sent to your email" 
            });
        } catch (emailError) {
            console.error("Failed to send password reset email:", emailError);
            
            // Rollback token if email fails
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            
            return res.status(500).json({ 
                success: false, 
                message: "Failed to send password reset email",
                error: emailError.message
            });
        }
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error processing your request",
            error: error.message
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: "Token and new password are required" 
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid or expired token" 
            });
        }

        // Find user by token
        const user = await UserModel.findOne({
            _id: decoded.id,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: "Password reset token is invalid or has expired" 
            });
        }

        // Hash new password and save
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: "Password has been reset successfully" 
        });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error resetting password" 
        });
    }
};