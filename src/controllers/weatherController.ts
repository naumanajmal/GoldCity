import { Response } from 'express';
import { WeatherModel } from '../models/weatherModel';
import { AuthRequest } from '../middleware/auth';

export class WeatherController {
  static async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hoursBack = parseInt(req.query.hours as string) || 24;

      if (hoursBack < 1 || hoursBack > 168) {
        res.status(400).json({
          success: false,
          error: 'Hours parameter must be between 1 and 168 (7 days)',
        });
        return;
      }

      const analytics = await WeatherModel.getAnalytics(hoursBack);

      res.json({
        success: true,
        data: {
          period_hours: hoursBack,
          analytics,
        },
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching analytics',
      });
    }
  }

  static async getRecentReadings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const readings = await WeatherModel.getRecentReadings(limit);

      res.json({
        success: true,
        data: readings,
      });
    } catch (error) {
      console.error('Recent readings error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching readings',
      });
    }
  }
}
