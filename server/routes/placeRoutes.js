import express from 'express';
import { savePlace, getPlaces } from '../controllers/placeController.js';
import { verifyUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/saveplace', verifyUser, savePlace);
router.get('/', getPlaces);

export default router;