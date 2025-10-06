// Configuration module to abstract environment variable access
// This approach helps avoid TS1343 errors with Jest and import.meta usage

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  // Add other environment variables here as needed
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
