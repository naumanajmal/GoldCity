import db from '../config/database';
import { WeatherReading, WeatherAnalytics } from '../types';

export class WeatherModel {
  static async create(reading: Omit<WeatherReading, 'id'>): Promise<number> {
    const [id] = await db('weather_readings').insert({
      city_name: reading.city_name,
      temperature_c: reading.temperature_c,
      humidity_percent: reading.humidity_percent,
      recorded_at: reading.recorded_at,
    });
    return id;
  }

  static async getAnalytics(hoursBack: number = 24): Promise<WeatherAnalytics[]> {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    // Optimized query using indexes on city_name and recorded_at
    const results = await db('weather_readings')
      .select('city_name')
      .min('temperature_c as min_temperature')
      .max('temperature_c as max_temperature')
      .avg('humidity_percent as avg_humidity')
      .where('recorded_at', '>=', cutoffTime)
      .groupBy('city_name')
      .orderBy('city_name');

    return results.map((row: any) => ({
      city_name: row.city_name,
      min_temperature: parseFloat(row.min_temperature),
      max_temperature: parseFloat(row.max_temperature),
      avg_humidity: parseFloat(row.avg_humidity),
    }));
  }

  static async getRecentReadings(limit: number = 50): Promise<WeatherReading[]> {
    return db('weather_readings')
      .select('*')
      .orderBy('recorded_at', 'desc')
      .limit(limit);
  }

  static async getReadingsByCity(cityName: string, limit: number = 100): Promise<WeatherReading[]> {
    return db('weather_readings')
      .where({ city_name: cityName })
      .orderBy('recorded_at', 'desc')
      .limit(limit);
  }
}
