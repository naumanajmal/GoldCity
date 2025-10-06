import { Router } from 'express';
import { WeatherController } from '../controllers/weatherController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Protected routes - require authentication
router.get('/analytics', authenticateToken, WeatherController.getAnalytics);
router.get('/recent', authenticateToken, WeatherController.getRecentReadings);

export default router;
