import reviewModel from "../models/Review.js";

// Create Review (Authenticated User)
export const createreview = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: Please log in" });
        }

        const { issue, suggestion, rating } = req.body;

        // Validate input
        if (!issue || !suggestion || !rating) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const newReview = new reviewModel({
            user: req.user._id, // Associate review with logged-in user
            issue,
            suggestion,
            rating,
        });

        await newReview.save();
        res.status(201).json(newReview);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get All Reviews (Populate User Info)
export const getreview = async (req, res) => {
    try {
        const reviews = await reviewModel.find().populate("user", "name username category age"); // Show username & email
        res.status(200).json(reviews);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const getAverageRating = async (req, res) => {
    try {
        const ratings = await reviewModel.find({}, 'rating');
        const totalRatings = ratings.length;
        const sumRatings = ratings.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRatings ? (sumRatings / totalRatings).toFixed(2) : 0;
        res.status(200).json({ averageRating: parseFloat(averageRating) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Delete Review (Only Owner Can Delete)
export const deletereview = async (req, res) => {
    const { id } = req.params;

    try {
        const review = await reviewModel.findById(id);

        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        if (req.user._id.toString() !== review.user.toString()) {
            return res.status(403).json({ message: "Unauthorized: You can only delete your own review" });
        }

        await reviewModel.findByIdAndRemove(id);
        res.json({ message: "Review deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteReviewAsAdmin = async (req, res) => {
    const { id } = req.params;
  
    try {
      const review = await reviewModel.findById(id);
  
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
  
      review.deleted = true; // Mark as deleted
      await review.save();
  
      res.json({ message: "Review deleted successfully by admin" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  // Restore Review (Admin Only)
export const restoreReview = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Check if user is admin (assuming middleware has already verified this)
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
  
      const review = await reviewModel.findById(id);
  
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
  
      // Check if review is already active
      if (!review.deleted) {
        return res.status(400).json({ message: "Review is already active" });
      }
  
      // Restore the review by setting deleted to false
      review.deleted = false;
      await review.save();
  
      res.status(200).json({ 
        message: "Review restored successfully", 
        review: {
          id: review._id,
          issue: review.issue,
          suggestion: review.suggestion,
          rating: review.rating,
          user: review.user,
          createdAt: review.createdAt
        }
      });
    } catch (error) {
      console.error("Error restoring review:", error);
      res.status(500).json({ message: "Error restoring review", error: error.message });
    }
  };