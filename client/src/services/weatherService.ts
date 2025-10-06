import api from './api';
import { WeatherAnalytics } from '../types';

export const getAnalytics = async (hours: number = 24): Promise<WeatherAnalytics[]> => {
  const response = await api.get(`/weather/analytics?hours=${hours}`);
  return response.data.data.analytics;
};

export const getRecentReadings = async (limit: number = 50) => {
  const response = await api.get(`/weather/recent?limit=${limit}`);
  return response.data.data;
};
