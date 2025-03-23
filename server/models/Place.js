import mongoose from "mongoose";

const placeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  place: {
    type: String,
    required: true,
    min: 1,
    max: 1000,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

const PlaceModel = mongoose.model("place", placeSchema);
export default PlaceModel;