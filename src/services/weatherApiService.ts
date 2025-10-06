import axios, { AxiosError } from 'axios';
import { ExternalWeatherData } from '../types';

interface OpenWeatherMapResponse {
  main: {
    temp: number;
    humidity: number;
  };
  name: string;
}

interface OpenMeteoResponse {
  current_weather: {
    temperature: number;
  };
  hourly: {
    relativehumidity_2m: number[];
  };
}

export class WeatherApiService {
  private apiKey: string | undefined;
  private apiUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 5000; // 5 seconds

  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY;
    this.apiUrl = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isOpenWeatherMap(): boolean {
    return this.apiUrl.includes('openweathermap.org');
  }

  async fetchWeatherData(city: string): Promise<ExternalWeatherData> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (this.isOpenWeatherMap()) {
          return await this.fetchFromOpenWeatherMap(city);
        } else {
          return await this.fetchFromOpenMeteo(city);
        }
      } catch (error) {
        lastError = error as Error;
        console.error(
          `Attempt ${attempt}/${this.maxRetries} failed for ${city}:`,
          error instanceof AxiosError ? error.message : error
        );

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt; // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `Failed to fetch weather data for ${city} after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  private async fetchFromOpenWeatherMap(city: string): Promise<ExternalWeatherData> {
    if (!this.apiKey) {
      throw new Error('WEATHER_API_KEY is required for OpenWeatherMap');
    }

    const response = await axios.get<OpenWeatherMapResponse>(this.apiUrl, {
      params: {
        q: city,
        appid: this.apiKey,
        units: 'metric',
      },
      timeout: 10000,
    });

    return {
      city: response.data.name,
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
    };
  }

  private async fetchFromOpenMeteo(city: string): Promise<ExternalWeatherData> {
    // City coordinates mapping for Open-Meteo
    const cityCoordinates: { [key: string]: { lat: number; lon: number } } = {
      London: { lat: 51.5074, lon: -0.1278 },
      Dubai: { lat: 25.2048, lon: 55.2708 },
      Tokyo: { lat: 35.6762, lon: 139.6503 },
      'New York': { lat: 40.7128, lon: -74.0060 },
      Paris: { lat: 48.8566, lon: 2.3522 },
      Sydney: { lat: -33.8688, lon: 151.2093 },
    };

    const coords = cityCoordinates[city];
    if (!coords) {
      throw new Error(`City ${city} not supported for Open-Meteo`);
    }

    const response = await axios.get<OpenMeteoResponse>(this.apiUrl, {
      params: {
        latitude: coords.lat,
        longitude: coords.lon,
        current_weather: true,
        hourly: 'relativehumidity_2m',
        forecast_days: 1,
      },
      timeout: 10000,
    });

    return {
      city,
      temperature: response.data.current_weather.temperature,
      humidity: response.data.hourly.relativehumidity_2m[0] || 50,
    };
  }

  async fetchMultipleCities(cities: string[]): Promise<ExternalWeatherData[]> {
    const results: ExternalWeatherData[] = [];
    const errors: string[] = [];

    // Fetch sequentially to avoid rate limiting
    for (const city of cities) {
      try {
        const data = await this.fetchWeatherData(city);
        results.push(data);
        console.log(`✓ Successfully fetched weather for ${city}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${city}: ${errorMessage}`);
        console.error(`✗ Failed to fetch weather for ${city}:`, errorMessage);
      }
    }

    if (errors.length > 0) {
      console.warn(`Failed to fetch ${errors.length}/${cities.length} cities:`, errors);
    }

    return results;
  }
}
