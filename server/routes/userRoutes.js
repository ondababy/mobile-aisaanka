import express from 'express';
import { getAllUsers, usersCount, 
    banUser, activateUser,getUserStats, getUserTravelHistory } from '../controllers/userController.js'; 
import { verifyUser } from '../middleware/auth.js'; 

const router = express.Router();

router.get('/allUsers', getAllUsers); 
router.get('/usersCount', usersCount); 
router.delete("/ban/:id", banUser);
router.put("/activate/:id", activateUser);
router.get('/stats', getUserStats);
router.get('/travel-history/:id', getUserTravelHistory);

export default router;
