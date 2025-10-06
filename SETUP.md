# Quick Setup Guide

Follow these steps to get the Weather Monitoring System up and running.

## Prerequisites

- Node.js v18+ installed
- MySQL or MariaDB installed and running
- npm or yarn package manager

## Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

## Step 2: Database Setup

### Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE weather_monitoring;
exit;
```

### Configure Environment

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` and update with your settings:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=weather_monitoring

# JWT Configuration (change this to a random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Weather API Configuration
# Option 1: Use Open-Meteo (No API key needed - RECOMMENDED)
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast

# Option 2: Use OpenWeatherMap (requires API key)
# WEATHER_API_KEY=your_api_key_here
# WEATHER_API_URL=https://api.openweathermap.org/data/2.5/weather

# Server Configuration
PORT=3001
NODE_ENV=development

# Ingestion Service Configuration
INGESTION_INTERVAL_MINUTES=10
TRACKED_CITIES=London,Dubai,Tokyo
```

### Run Migrations

```bash
npm run migrate:latest
```

## Step 3: Start the Application

Open **three separate terminal windows**:

### Terminal 1: Backend API Server
```bash
npm run dev:backend
```
Server will start on http://localhost:3001

### Terminal 2: Data Ingestion Service
```bash
npm run dev:ingestion
```
This will fetch weather data every 10 minutes

### Terminal 3: Frontend Development Server
```bash
npm run dev:frontend
```
Frontend will be available at http://localhost:5173

## Step 4: Test the Application

1. Open your browser to http://localhost:5173
2. Click "Register" to create a new account
3. Fill in username, email, and password (min 6 characters)
4. After registration, login with your credentials
5. You'll be redirected to the dashboard

### What You Should See

- **Historical Analytics**: Aggregated weather data for the last 24 hours (will be empty initially)
- **Live Weather Feed**: Real-time updates as new weather data is ingested
- **Connection Status**: Green "Connected" badge when WebSocket is active

## Step 5: Verify Everything Works

### Check Backend API
```bash
curl http://localhost:3001/health
```
Should return: `{"success":true,"message":"Server is running",...}`

### Check Database
```bash
mysql -u root -p weather_monitoring -e "SELECT * FROM users;"
mysql -u root -p weather_monitoring -e "SELECT * FROM weather_readings ORDER BY recorded_at DESC LIMIT 5;"
```

### Monitor Logs

- Backend logs will show API requests
- Ingestion service logs will show weather data fetching
- Frontend console will show WebSocket connections

## Troubleshooting

### Database Connection Error
- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `.env` file
- Ensure database exists: `SHOW DATABASES;`

### Migration Error
- Check database permissions
- Verify Knex configuration in `src/config/knexfile.ts`
- Try rollback: `npm run migrate:rollback`

### Weather API Error
- If using OpenWeatherMap, verify API key is valid
- Check API rate limits
- Switch to Open-Meteo (no API key needed)

### WebSocket Not Connecting
- Verify backend server is running on port 3001
- Check browser console for errors
- Ensure no firewall blocking WebSocket connections

### Port Already in Use
- Backend (3001): Change `PORT` in `.env`
- Frontend (5173): Change port in `client/vite.config.ts`

## Production Deployment

### Build for Production

```bash
# Build backend
npm run build:backend

# Build frontend
cd client
npm run build
cd ..
```

### Environment Variables

Update `.env` for production:
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET` (32+ random characters)
- Configure production database credentials
- Set `FRONTEND_URL` to your domain

### Run in Production

```bash
# Start backend with PM2
pm2 start dist/server.js --name weather-api

# Start ingestion service
pm2 start dist/services/ingestionService.js --name weather-ingestion

# Serve frontend with Nginx or serve static files
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Weather (Protected - requires JWT token)
- `GET /api/weather/analytics?hours=24` - Get aggregated analytics
- `GET /api/weather/recent?limit=50` - Get recent readings

### WebSocket Events
- `weather:update` - Emitted when new weather data is ingested

## Default Configuration

- **Tracked Cities**: London, Dubai, Tokyo
- **Ingestion Interval**: 10 minutes
- **Analytics Period**: 24 hours
- **JWT Expiration**: 24 hours
- **Password Min Length**: 6 characters

## Next Steps

- Add more cities to `TRACKED_CITIES` in `.env`
- Adjust `INGESTION_INTERVAL_MINUTES` as needed
- Customize the frontend styling
- Add more weather metrics (wind speed, pressure, etc.)
- Implement data visualization charts
- Set up monitoring and alerting

## Support

For issues or questions:
1. Check the logs in each terminal
2. Review `ARCHITECTURE.md` for system design
3. Verify all prerequisites are installed
4. Ensure all services are running

Enjoy monitoring the weather! 🌤️
