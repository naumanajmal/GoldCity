import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { WeatherApiService } from '../../src/services/weatherApiService';

describe('WeatherApiService', () => {
  let mock: MockAdapter;
  let weatherService: WeatherApiService;

  beforeEach(() => {
    // Clear all environment variables first
    delete process.env.WEATHER_API_KEY;
    delete process.env.WEATHER_API_URL;
    
    // Set Open-Meteo URL for testing BEFORE creating service
    process.env.WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
    
    mock = new MockAdapter(axios);
    weatherService = new WeatherApiService();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('fetchWeatherData - Success Cases', () => {
    it('should successfully fetch weather data from Open-Meteo', async () => {
      const mockResponse = {
        current_weather: {
          temperature: 15.5,
        },
        hourly: {
          relativehumidity_2m: [65, 70, 68],
        },
      };

      mock.onGet(/api\.open-meteo\.com/).reply(200, mockResponse);

      const result = await weatherService.fetchWeatherData('London');

      expect(result).toEqual({
        city: 'London',
        temperature: 15.5,
        humidity: 65,
      });
    });

    it('should fetch data for multiple cities', async () => {
      const mockResponse = {
        current_weather: {
          temperature: 20.0,
        },
        hourly: {
          relativehumidity_2m: [50],
        },
      };

      mock.onGet(/api\.open-meteo\.com/).reply(200, mockResponse);

      const cities = ['London', 'Dubai', 'Tokyo'];
      const results = await weatherService.fetchMultipleCities(cities);

      expect(results).toHaveLength(3);
      expect(results[0].city).toBe('London');
      expect(results[1].city).toBe('Dubai');
      expect(results[2].city).toBe('Tokyo');
    });
  });

  describe('fetchWeatherData - Error Handling & Retry Logic', () => {
    it('should retry on network error and eventually succeed', async () => {
      const mockResponse = {
        current_weather: {
          temperature: 18.0,
        },
        hourly: {
          relativehumidity_2m: [60],
        },
      };

      // Fail first two attempts, succeed on third
      mock
        .onGet(/api\.open-meteo\.com/)
        .replyOnce(500)
        .onGet(/api\.open-meteo\.com/)
        .replyOnce(500)
        .onGet(/api\.open-meteo\.com/)
        .replyOnce(200, mockResponse);

      const result = await weatherService.fetchWeatherData('London');

      expect(result).toEqual({
        city: 'London',
        temperature: 18.0,
        humidity: 60,
      });
    }, 20000);

    it('should fail after max retries (3 attempts)', async () => {
      mock.onGet(/api\.open-meteo\.com/).reply(500, { error: 'Server error' });

      await expect(weatherService.fetchWeatherData('London')).rejects.toThrow(
        /Failed to fetch weather data for London after 3 attempts/
      );
    }, 35000); // Increase timeout for retry delays

    it('should handle timeout errors with retry', async () => {
      mock.onGet(/api\.open-meteo\.com/).timeout();

      await expect(weatherService.fetchWeatherData('London')).rejects.toThrow();
    }, 35000);

    it('should handle network errors gracefully', async () => {
      mock.onGet(/api\.open-meteo\.com/).networkError();

      await expect(weatherService.fetchWeatherData('London')).rejects.toThrow(
        /Failed to fetch weather data for London after 3 attempts/
      );
    }, 35000);

    it('should continue with other cities if one fails', async () => {
      const mockResponse = {
        current_weather: {
          temperature: 25.0,
        },
        hourly: {
          relativehumidity_2m: [45],
        },
      };

      // Mock requests based on latitude parameters
      mock.onGet().reply((config) => {
        const params = config.params || {};
        
        // London fails (latitude=51.5074)
        if (params.latitude === 51.5074) {
          return [500, { error: 'Server error' }];
        }
        
        // Dubai succeeds (latitude=25.2048)
        if (params.latitude === 25.2048) {
          return [200, mockResponse];
        }
        
        // Tokyo succeeds (latitude=35.6762)
        if (params.latitude === 35.6762) {
          return [200, mockResponse];
        }
        
        // Default to 404 for unmatched requests
        return [404, { error: 'Not found' }];
      });

      const cities = ['London', 'Dubai', 'Tokyo'];
      const results = await weatherService.fetchMultipleCities(cities);

      // Should have 2 successful results (Dubai and Tokyo)
      expect(results.length).toBe(2);
      expect(results[0].city).toBe('Dubai');
      expect(results[1].city).toBe('Tokyo');
    }, 60000);
  });

  describe('fetchWeatherData - API Selection', () => {
    it('should use OpenWeatherMap when URL contains openweathermap.org', async () => {
      process.env.WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
      process.env.WEATHER_API_KEY = 'test_api_key';

      const mockResponse = {
        name: 'London',
        main: {
          temp: 16.5,
          humidity: 70,
        },
      };

      mock.onGet(/api\.openweathermap\.org/).reply(200, mockResponse);

      const service = new WeatherApiService();
      const result = await service.fetchWeatherData('London');

      expect(result).toEqual({
        city: 'London',
        temperature: 16.5,
        humidity: 70,
      });
    });

    it('should throw error if OpenWeatherMap is used without API key', async () => {
      process.env.WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
      delete process.env.WEATHER_API_KEY;

      const service = new WeatherApiService();

      await expect(service.fetchWeatherData('London')).rejects.toThrow(
        'WEATHER_API_KEY is required for OpenWeatherMap'
      );
    }, 35000);
  });

  describe('fetchWeatherData - Exponential Backoff', () => {
    it('should implement exponential backoff between retries', async () => {
      const startTime = Date.now();

      mock.onGet(/api\.open-meteo\.com/).reply(500);

      try {
        await weatherService.fetchWeatherData('London');
      } catch (error) {
        // Expected to fail
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 5s + 10s = 15s for 3 attempts with exponential backoff
      // (allowing some margin for test execution)
      expect(duration).toBeGreaterThan(10000);
    }, 20000); // Increase test timeout
  });
});
