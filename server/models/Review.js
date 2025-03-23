import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    issue: {
        type: String,
        required: true,
        max: 10
    },
    suggestion: {
        type: String,
        required: true,
        min: 6,
        max: 255
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    time: {
        type: Date,
        required: true,
        default: Date.now,
      },
    deleted: {
        type: Boolean,
        default: false
    },
});

const ReviewModel = mongoose.model("review", reviewSchema);
export default ReviewModel;
