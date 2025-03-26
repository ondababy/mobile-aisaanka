import UserModel from "../models/User.js";
import ReviewModel from "../models/Review.js";
import PlaceModel from "../models/Place.js";
import mongoose from "mongoose";

// Fetch inactive users, banned users, active users, and average rating
export const getUserStats = async (req, res) => {
  try {
    // Fetch inactive users
    const inactiveUsers = await UserModel.find({ status: "inactive" });

    // Fetch banned users
    const bannedUsers = await UserModel.find({ status: "banned" });

    // Fetch active users
    const activeUsers = await UserModel.find({ status: "active" });
    
    res.status(200).json({
      inactiveUsers: inactiveUsers.length,
      bannedUsers: bannedUsers.length,
      activeUsers: activeUsers.length,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    // Query the database using UserModel
    const users = await UserModel.find({});
    
    res.status(200).json({
      message: "Users fetched successfully",
      users,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const usersCount = async (req, res) => {
  try {
    const userCount = await UserModel.countDocuments(); // Counting total users
    res.status(200).json({ count: userCount });
  } catch (error) {
    res.status(500).json({ message: "Error getting users count" });
  }
};

export const banUser = async (req, res) => {
  const { id } = req.params;
  console.log("Banning User ID:", id); // Debugging

  try {
    // Find user
    const user = await UserModel.findById(id);
    if (!user) {
      console.log("User not found:", id); // Debugging
      return res.status(404).json({ error: "User not found" });
    }

    // Set user status to banned
    user.status = "banned";
    await user.save();

    res.status(200).json({ message: "User banned successfully" });
  } catch (err) {
    console.error("Error banning user:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

export const activateUser = async (req, res) => {
  const { id } = req.params;
  console.log("Activating User ID:", id); // Debugging

  try {
    // Find user
    const user = await UserModel.findById(id);
    if (!user) {
      console.log("User not found:", id); // Debugging
      return res.status(404).json({ error: "User not found" });
    }

    // Set user status to active
    user.status = "active";
    await user.save();

    res.status(200).json({ message: "User activated successfully" });
  } catch (err) {
    console.error("Error activating user:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

export const updateUserRole = async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.role = role;
    await user.save();

    res.status(200).json({ message: "User role updated successfully" });
  } catch (error) {
    console.error("Error updating user role", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get travel history for a specific user
export const getUserTravelHistory = async (req, res) => {
  const { id } = req.params;

  try {
    // Validate if the user ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Find the user first to confirm they exist
    const userExists = await UserModel.findById(id);
    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch places visited by the user, sorted by most recent first
    const places = await PlaceModel.find({ user: id })
      .sort({ date: -1 })  // sort by date (your field in PlaceModel) instead of time
      .select('place date'); // Only select fields that exist in your model

    // Fetch reviews by the user to get ratings and comments
    const reviews = await ReviewModel.find({ user: id })
      .sort({ time: -1 })
      .select('issue suggestion rating time');

    // Format the history by combining places with any matching reviews
    // (assuming reviews might be related to places)
    const formattedHistory = places.map(place => {
      // Try to find a matching review (this is an assumption - adjust logic if needed)
      const relatedReview = reviews.find(review => 
        // You might need a different way to match places with reviews
        // This is just a placeholder - perhaps you have a placeId in your review model?
        review.issue.includes(place.place)
      );

      return {
        id: place._id,
        place: place.place,
        time: place.date,  // use date from PlaceModel
        visitDate: place.date,
        // Include rating and comments only if a related review exists
        rating: relatedReview ? relatedReview.rating : null,
        comments: relatedReview ? relatedReview.suggestion : null,
      };
    });

    res.status(200).json({
      message: "User travel history fetched successfully",
      userId: id,
      username: userExists.username,
      totalPlaces: places.length,
      travelHistory: formattedHistory
    });
  } catch (error) {
    console.error("Error fetching user travel history:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};
