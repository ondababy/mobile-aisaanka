import express from 'express';
import { generateCommuteGuide, getRouteByName, getRoutes } from '../controllers/routeController.js';

const router = express.Router();

router.get('/', getRoutes);
router.get('/:name', getRouteByName);
router.post('/commute/guide', generateCommuteGuide);

export default router;