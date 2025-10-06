-- Weather Monitoring System Database Setup
-- Run this script to create the database and tables

-- Create database
CREATE DATABASE IF NOT EXISTS weather_monitoring;
USE weather_monitoring;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
);

-- Create weather_readings table
CREATE TABLE IF NOT EXISTS weather_readings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  city_name VARCHAR(100) NOT NULL,
  temperature_c FLOAT NOT NULL,
  humidity_percent INT NOT NULL,
  recorded_at DATETIME NOT NULL,
  INDEX idx_city_name (city_name),
  INDEX idx_recorded_at (recorded_at),
  INDEX idx_city_recorded (city_name, recorded_at)
);

-- Verify tables
SHOW TABLES;

-- Show table structures
DESCRIBE users;
DESCRIBE weather_readings;
