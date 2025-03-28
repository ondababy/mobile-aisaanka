

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";

import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import placeRoutes from "./routes/placeRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
const app = express();

const PORT = process.env.PORT;
const IP = process.env.IP;

mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log('DB connected'))
    .catch(err => console.log(err));

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/user", userRoutes);
app.use("/api/place", placeRoutes);

app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// ✅ Connect to MongoDB and Log 

app.listen(PORT, IP, () => {
    // console.log(Server is running on http://${IP}:${PORT});
    console.log(`Server is running on http://${IP}:${PORT}`);
});