# Docker Deployment Guide

This document explains how to run the Weather Monitoring System using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start with Docker Compose

### 1. Configure Environment

Create a `.env` file in the project root (or use the existing one):

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DB_PASSWORD=your_secure_password
DB_USER=weather_user
DB_NAME=weather_monitoring

# JWT Secret (use a strong random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Weather API (Open-Meteo - no key needed)
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast

# Server
PORT=3001
NODE_ENV=production

# Ingestion
INGESTION_INTERVAL_MINUTES=10
TRACKED_CITIES=London,Dubai,Tokyo
```

### 2. Start All Services

```bash
docker-compose up -d
```

This will start:
- **MySQL database** on port 3306
- **Backend API** on port 3001
- **Ingestion service** (background process)

### 3. Check Service Status

```bash
docker-compose ps
```

Expected output:
```
NAME                  STATUS              PORTS
weather_mysql         Up (healthy)        0.0.0.0:3306->3306/tcp
weather_backend       Up                  0.0.0.0:3001->3001/tcp
weather_ingestion     Up
```

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f ingestion
docker-compose logs -f mysql
```

### 5. Stop Services

```bash
# Stop but keep data
docker-compose stop

# Stop and remove containers (data persists in volumes)
docker-compose down

# Stop and remove everything including data
docker-compose down -v
```

## Manual Docker Build

### Build Backend Image

```bash
docker build -t weather-monitoring-backend .
```

### Run Backend Container

```bash
docker run -d \
  --name weather_backend \
  -p 3001:3001 \
  -e DB_HOST=mysql \
  -e DB_PASSWORD=your_password \
  -e JWT_SECRET=your_secret \
  weather-monitoring-backend
```

## Docker Compose Services

### MySQL Service

- **Image**: `mysql:8.0`
- **Port**: 3306
- **Volume**: `mysql_data` (persistent storage)
- **Health Check**: Automatic MySQL ping every 10s

### Backend API Service

- **Build**: From local Dockerfile
- **Port**: 3001
- **Depends on**: MySQL (waits for healthy status)
- **Command**: Runs migrations then starts server
- **Health Check**: HTTP GET to `/health` endpoint

### Ingestion Service

- **Build**: From local Dockerfile
- **Depends on**: MySQL and Backend
- **Command**: Runs data ingestion cron job
- **No exposed ports**: Background service

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `mysql` | Database hostname |
| `DB_PORT` | `3306` | Database port |
| `DB_USER` | `weather_user` | Database username |
| `DB_PASSWORD` | `your_password` | Database password |
| `DB_NAME` | `weather_monitoring` | Database name |
| `JWT_SECRET` | - | JWT signing secret (required) |
| `WEATHER_API_URL` | Open-Meteo URL | Weather API endpoint |
| `WEATHER_API_KEY` | - | API key (if using OpenWeatherMap) |
| `PORT` | `3001` | Backend server port |
| `NODE_ENV` | `production` | Environment mode |
| `INGESTION_INTERVAL_MINUTES` | `10` | Data fetch interval |
| `TRACKED_CITIES` | `London,Dubai,Tokyo` | Cities to monitor |

## Networking

All services run on the `weather_network` bridge network, allowing them to communicate using service names as hostnames.

```
┌─────────────────────────────────────┐
│      weather_network (bridge)       │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │  MySQL   │  │ Backend  │       │
│  │  :3306   │◄─┤  :3001   │       │
│  └──────────┘  └──────────┘       │
│       ▲             ▲              │
│       │             │              │
│       │        ┌────────────┐     │
│       └────────┤ Ingestion  │     │
│                └────────────┘     │
└─────────────────────────────────────┘
         │
         ▼
   Host: localhost:3001
```

## Volume Management

### List Volumes

```bash
docker volume ls | grep weather
```

### Inspect Volume

```bash
docker volume inspect weather-monitoring-system_mysql_data
```

### Backup Database

```bash
docker exec weather_mysql mysqldump \
  -u root -pyour_password \
  weather_monitoring > backup.sql
```

### Restore Database

```bash
docker exec -i weather_mysql mysql \
  -u root -pyour_password \
  weather_monitoring < backup.sql
```

## Troubleshooting

### Backend Can't Connect to MySQL

**Problem**: `Access denied` or `Connection refused`

**Solution**:
1. Check MySQL is healthy: `docker-compose ps`
2. Verify environment variables: `docker-compose config`
3. Check logs: `docker-compose logs mysql`

### Migrations Not Running

**Problem**: Tables don't exist

**Solution**:
```bash
# Run migrations manually
docker-compose exec backend npm run migrate:latest
```

### Ingestion Service Not Fetching Data

**Problem**: No weather readings in database

**Solution**:
1. Check logs: `docker-compose logs ingestion`
2. Verify API URL is correct
3. Test API manually: `curl https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current_weather=true`

### Port Already in Use

**Problem**: `port is already allocated`

**Solution**:
```bash
# Change port in .env
PORT=3002

# Or stop conflicting service
lsof -ti:3001 | xargs kill
```

## Production Deployment

### Security Best Practices

1. **Use strong passwords**:
   ```bash
   # Generate random password
   openssl rand -base64 32
   ```

2. **Set secure JWT secret**:
   ```bash
   # Generate random secret
   openssl rand -hex 64
   ```

3. **Don't expose MySQL port**:
   ```yaml
   # In docker-compose.yml, remove:
   ports:
     - "3306:3306"
   ```

4. **Use Docker secrets** (Swarm mode):
   ```yaml
   secrets:
     db_password:
       external: true
   ```

### Resource Limits

Add resource constraints in `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Monitoring

#### Health Checks

```bash
# Check backend health
curl http://localhost:3001/health

# Check MySQL health
docker-compose exec mysql mysqladmin ping -h localhost -u root -p
```

#### Container Stats

```bash
docker stats weather_backend weather_mysql weather_ingestion
```

### Scaling

Scale ingestion service for redundancy:

```bash
docker-compose up -d --scale ingestion=2
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t weather-backend:${{ github.sha }} .
      
      - name: Run tests
        run: docker run weather-backend:${{ github.sha }} npm test
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push weather-backend:${{ github.sha }}
```

## Development with Docker

### Hot Reload Development

```yaml
# docker-compose.dev.yml
services:
  backend:
    build:
      context: .
      target: builder
    volumes:
      - ./src:/app/src
      - ./migrations:/app/migrations
    command: npm run dev:backend
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Run Tests in Docker

```bash
docker-compose exec backend npm test
```

## Useful Commands

```bash
# Restart a single service
docker-compose restart backend

# Rebuild after code changes
docker-compose up -d --build

# Execute command in container
docker-compose exec backend sh

# View container resource usage
docker-compose top

# Remove unused images
docker image prune -a

# Export logs
docker-compose logs --no-color > logs.txt
```

## Multi-Stage Build Explanation

The Dockerfile uses a multi-stage build:

1. **Builder Stage**:
   - Installs all dependencies (including dev dependencies)
   - Compiles TypeScript to JavaScript
   - Creates optimized build

2. **Production Stage**:
   - Installs only production dependencies
   - Copies compiled code from builder
   - Runs as non-root user
   - Smaller final image size

Benefits:
- **Security**: Non-root user, minimal attack surface
- **Performance**: Smaller image (~200MB vs ~500MB)
- **Efficiency**: Faster deployments and pulls

## Summary

Docker Compose provides a complete, production-ready deployment with:
- ✅ Automatic service orchestration
- ✅ Health checks and restart policies
- ✅ Persistent data storage
- ✅ Network isolation
- ✅ Easy scaling and updates
- ✅ Development and production configurations

For production, consider using Kubernetes or Docker Swarm for advanced orchestration features.
