import dotenv from 'dotenv';
import { Knex } from 'knex';
import path from 'path';

// Load .env from project root (two levels up from this file)
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'weather_monitoring',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: path.join(__dirname, '../../migrations'),
    extension: 'ts',
  },
};

export default config;
