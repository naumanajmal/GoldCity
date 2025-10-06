import dotenv from 'dotenv';
import cron from 'node-cron';
import { Server as SocketIOServer } from 'socket.io';
import { WeatherApiService } from './weatherApiService';
import { WeatherModel } from '../models/weatherModel';
import { WeatherReading } from '../types';
import db from '../config/database';

dotenv.config();

export class IngestionService {
  private weatherApi: WeatherApiService;
  private io: SocketIOServer | null = null;
  private cities: string[];
  private intervalMinutes: number;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.weatherApi = new WeatherApiService();
    this.cities = (process.env.TRACKED_CITIES || 'London,Dubai,Tokyo').split(',').map(c => c.trim());
    this.intervalMinutes = parseInt(process.env.INGESTION_INTERVAL_MINUTES || '10');
  }

  setSocketIO(io: SocketIOServer): void {
    this.io = io;
    console.log('✓ WebSocket server connected to ingestion service');
  }

  async ingestWeatherData(): Promise<void> {
    console.log(`\n[${new Date().toISOString()}] Starting weather data ingestion...`);
    console.log(`Fetching data for cities: ${this.cities.join(', ')}`);

    try {
      const weatherDataList = await this.weatherApi.fetchMultipleCities(this.cities);

      for (const weatherData of weatherDataList) {
        const reading: Omit<WeatherReading, 'id'> = {
          city_name: weatherData.city,
          temperature_c: weatherData.temperature,
          humidity_percent: Math.round(weatherData.humidity),
          recorded_at: new Date(),
        };

        // Save to database
        const id = await WeatherModel.create(reading);
        console.log(`✓ Saved reading for ${weatherData.city} (ID: ${id})`);

        // Emit to WebSocket clients
        if (this.io) {
          this.io.emit('weather:update', {
            ...reading,
            id,
          });
          console.log(`✓ Broadcasted update for ${weatherData.city} to WebSocket clients`);
        }
      }

      console.log(`✓ Ingestion completed successfully (${weatherDataList.length}/${this.cities.length} cities)`);
    } catch (error) {
      console.error('✗ Error during weather data ingestion:', error);
    }
  }

  start(): void {
    console.log('\n=== Weather Data Ingestion Service ===');
    console.log(`Tracked cities: ${this.cities.join(', ')}`);
    console.log(`Ingestion interval: ${this.intervalMinutes} minutes`);
    console.log(`Cron schedule: */${this.intervalMinutes} * * * *`);

    // Run immediately on start
    this.ingestWeatherData();

    // Schedule periodic ingestion
    const cronExpression = `*/${this.intervalMinutes} * * * *`;
    this.cronJob = cron.schedule(cronExpression, () => {
      this.ingestWeatherData();
    });

    console.log('✓ Ingestion service started successfully\n');
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('✓ Ingestion service stopped');
    }
  }
}

// Standalone execution
if (require.main === module) {
  const service = new IngestionService();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down ingestion service...');
    service.stop();
    await db.destroy();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down ingestion service...');
    service.stop();
    await db.destroy();
    process.exit(0);
  });

  service.start();
}

export default IngestionService;
