// Test setup file
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock the configuration module for Jest tests
jest.mock('../client/src/config/config', () => ({
  config: {
    apiUrl: process.env.VITE_API_URL || 'http://localhost:3001/api',
    isDevelopment: false,
    isProduction: false,
  },
}));

// Mock localStorage for client-side code
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
(global as any).localStorage = localStorageMock;

// Mock window object for client-side code
(global as any).window = {
  location: {
    href: '',
  },
};
