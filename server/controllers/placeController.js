import PlaceModel from "../models/Place.js";

// Save a new place entry
export const savePlace = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: Please log in" });
    }

    const { destination, place, time, coordinates } = req.body;

    const newPlace = new PlaceModel({
      user: req.user._id, // Associate place with the logged-in user
      place: place || destination, // Accept either field name
      coordinates: coordinates, // Store coordinates if provided
      time: time || Date.now(), // Use provided time or current time
    });

    await newPlace.save();
    res.status(201).json(newPlace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all places for the logged-in user
export const getPlaces = async (req, res) => {
  try {
    const places = await PlaceModel.find().populate('user', 'name username email');
    res.status(200).json(places);
  } catch (error) {
    console.error("Error fetching places:", error); // Debugging log
    res.status(500).json({ message: error.message });
  }
};
