import express from "express";
import { createreview, 
    getreview, 
    deletereview, 
    getAverageRating, 
    deleteReviewAsAdmin,
    restoreReview,
} from "../controllers/reviewController.js";
import { verifyUser} from "../middleware/auth.js";

const router = express.Router();

router.post("/", verifyUser, createreview);
router.get("/allReviews", getreview);  
router.delete("/:id", verifyUser, deletereview);  
router.get('/average-rating', getAverageRating);
router.delete("/delete/:id", deleteReviewAsAdmin);
router.put('/restore/:id', verifyUser, restoreReview); 

export default router;
