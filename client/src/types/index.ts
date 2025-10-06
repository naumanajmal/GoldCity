export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface WeatherReading {
  id: number;
  city_name: string;
  temperature_c: number;
  humidity_percent: number;
  recorded_at: string;
}

export interface WeatherAnalytics {
  city_name: string;
  min_temperature: number;
  max_temperature: number;
  avg_humidity: number;
}

export interface WeatherState {
  liveReadings: WeatherReading[];
  analytics: WeatherAnalytics[];
  loading: boolean;
  error: string | null;
  connected: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
