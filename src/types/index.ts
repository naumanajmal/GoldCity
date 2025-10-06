// User types
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at?: Date;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
}

// Weather types
export interface WeatherReading {
  id?: number;
  city_name: string;
  temperature_c: number;
  humidity_percent: number;
  recorded_at: Date;
}

export interface WeatherAnalytics {
  city_name: string;
  min_temperature: number;
  max_temperature: number;
  avg_humidity: number;
}

export interface ExternalWeatherData {
  city: string;
  temperature: number;
  humidity: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Request types with user
export interface AuthenticatedRequest extends Express.Request {
  user?: JWTPayload;
}
