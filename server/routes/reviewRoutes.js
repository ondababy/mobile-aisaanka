const express = require("express");
const { createreview, getreview, deletereview } = require("../controllers/reviewController.js");
const { verifyUser } = require("../middleware/auth.js");

const router = express.Router();

router.post("/", verifyUser, createreview);
router.get("/allReviews", getreview);  
router.delete("/:id", verifyUser, deletereview);  

module.exports = router;
