# Weather Monitoring System - Architecture Documentation

## System Overview

This document describes the architecture of a secure, scalable weather monitoring system that ingests live weather data from external APIs, provides real-time updates via WebSockets, and offers historical analytics through a modern React dashboard.

## Technology Stack

- **Frontend**: React.js 18 with TypeScript
- **State Management**: Redux Toolkit for complex state patterns
- **Backend**: Node.js with Express.js and TypeScript
- **Database**: MySQL/MariaDB with Knex.js migrations
- **Real-time Communication**: Socket.io for WebSocket connections
- **External API**: Open-Meteo (no API key) or OpenWeatherMap (requires API key)
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing

## Data Flow Architecture

```
┌─────────────────┐
│  External API   │ (OpenWeatherMap / Open-Meteo)
│  (Weather Data) │
└────────┬────────┘
         │ HTTP Request (every 10 min)
         ↓
┌─────────────────────────┐
│  Ingestion Service      │
│  - Periodic job (cron)  │
│  - Retry mechanism      │
│  - Error handling       │
└────────┬────────────────┘
         │
         ├──→ MySQL Database (weather_readings table)
         │
         └──→ WebSocket Server (Socket.io)
                    │
                    ↓
         ┌──────────────────────┐
         │   Connected Clients  │
         │   (React Dashboard)  │
         └──────────────────────┘
                    ↑
                    │ HTTP Request
         ┌──────────┴──────────┐
         │   REST API Server   │
         │   - /api/auth/*     │
         │   - /api/weather/*  │
         └─────────────────────┘
```

### Detailed Flow

1. **Data Ingestion**:
   - Ingestion service runs as a separate process with cron scheduling
   - Fetches weather data for configured cities (London, Dubai, Tokyo) every 10 minutes
   - Implements exponential backoff retry mechanism (3 attempts with 5s initial delay)
   - Persists readings to `weather_readings` table
   - Broadcasts new readings to all connected WebSocket clients

2. **Client Authentication**:
   - User registers/logs in via REST API
   - Password hashed with bcrypt (10 salt rounds)
   - JWT token issued with 24-hour expiration
   - Token stored in localStorage and sent with subsequent requests

3. **Real-time Updates**:
   - Client establishes WebSocket connection on dashboard load
   - Server emits `weather:update` events when new data is ingested
   - Redux store updates with new readings
   - UI updates automatically via React state changes

4. **Historical Analytics**:
   - Client requests analytics via protected REST endpoint
   - Server executes optimized SQL query with GROUP BY
   - Returns min/max temperature and average humidity per city for last 24 hours
   - Results cached in Redux store

## Database Schema

### users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
);
```

### weather_readings Table
```sql
CREATE TABLE weather_readings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  city_name VARCHAR(100) NOT NULL,
  temperature_c FLOAT NOT NULL,
  humidity_percent INT NOT NULL,
  recorded_at DATETIME NOT NULL,
  INDEX idx_city_name (city_name),
  INDEX idx_recorded_at (recorded_at),
  INDEX idx_city_recorded (city_name, recorded_at)
);
```

## Database Optimization Strategy

### Indexing Rationale

1. **Single Column Indexes**:
   - `idx_city_name`: Enables fast filtering by city in WHERE clauses
   - `idx_recorded_at`: Optimizes time-based queries (e.g., last 24 hours)

2. **Composite Index**:
   - `idx_city_recorded (city_name, recorded_at)`: Critical for analytics query
   - Covers both GROUP BY and WHERE clauses in a single index scan
   - Eliminates need for filesort in aggregation queries

### Analytics Query Optimization

```sql
SELECT 
  city_name,
  MIN(temperature_c) as min_temperature,
  MAX(temperature_c) as max_temperature,
  AVG(humidity_percent) as avg_humidity
FROM weather_readings
WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY city_name
ORDER BY city_name;
```

**Optimization Features**:
- Composite index `idx_city_recorded` enables index-only scan
- WHERE clause uses indexed `recorded_at` column
- GROUP BY uses indexed `city_name` column
- No temporary tables or filesort operations required
- Query execution time: O(log n) for index seek + O(k) for scan (where k = matching rows)

### Performance Characteristics

- **Expected rows per city per day**: ~144 (10-minute intervals)
- **Total rows per day**: ~432 (3 cities)
- **Index size**: Minimal overhead (~2-3% of table size)
- **Query time**: <10ms for 24-hour analytics with proper indexes

## API Integration & Error Handling

### Weather API Selection

**Primary Choice: Open-Meteo**
- **Pros**: No API key required, reliable, free tier sufficient
- **Cons**: Limited to predefined city coordinates
- **Use Case**: Development and demonstration

**Alternative: OpenWeatherMap**
- **Pros**: More cities, additional data points
- **Cons**: Requires API key registration, rate limits
- **Use Case**: Production deployment

### Error Handling Strategy

1. **Retry Mechanism**:
   ```typescript
   - Max retries: 3
   - Initial delay: 5 seconds
   - Backoff: Exponential (5s, 10s, 15s)
   - Timeout: 10 seconds per request
   ```

2. **Failure Scenarios**:
   - **Network timeout**: Retry with backoff
   - **API rate limit**: Log error, skip iteration
   - **Invalid response**: Log error, continue with other cities
   - **Database error**: Log error, continue ingestion

3. **Graceful Degradation**:
   - Failed city fetch doesn't block other cities
   - WebSocket disconnection doesn't affect REST API
   - Frontend displays connection status to user

### API Key Security

- Stored in `.env` file (never committed to version control)
- Accessed via `process.env.WEATHER_API_KEY`
- Validated on service startup
- Error thrown if required but missing

## TypeScript Benefits

### Type Safety Across Stack

1. **Compile-time Error Detection**:
   - Catches type mismatches before runtime
   - Prevents null/undefined errors with strict mode
   - Ensures API contract consistency

2. **Enhanced Developer Experience**:
   - IntelliSense autocomplete in IDEs
   - Refactoring safety with type checking
   - Self-documenting code with interfaces

3. **Reduced Runtime Errors**:
   - Strict null checks prevent common bugs
   - Type guards ensure data validity
   - Generic types provide reusable patterns

### Example Type Safety

```typescript
// Backend: Ensures correct data structure
interface WeatherReading {
  city_name: string;
  temperature_c: number;
  humidity_percent: number;
  recorded_at: Date;
}

// Frontend: Redux state type safety
interface WeatherState {
  liveReadings: WeatherReading[];
  analytics: WeatherAnalytics[];
  loading: boolean;
  error: string | null;
}
```

## Security Considerations

### Authentication & Authorization

1. **Password Security**:
   - Bcrypt hashing with 10 salt rounds
   - Passwords never stored in plain text
   - Minimum 6-character requirement

2. **JWT Implementation**:
   - Signed with secret key from environment variable
   - 24-hour expiration
   - Payload contains minimal user data (id, username)
   - Verified on every protected route

3. **API Protection**:
   - All weather endpoints require valid JWT
   - Token validation middleware
   - Automatic logout on token expiration

### SQL Injection Prevention

- Knex.js query builder with parameterized queries
- No raw SQL string concatenation
- Input validation on all endpoints

### CORS Configuration

- Configured for specific frontend origin
- Credentials enabled for cookie/token support
- Prevents unauthorized cross-origin requests

## Scalability Considerations

### Current Architecture Limitations

- Single ingestion service instance
- In-memory WebSocket connections
- No caching layer

### Scaling Strategies

1. **Horizontal Scaling**:
   - Deploy multiple API server instances behind load balancer
   - Use Redis for WebSocket adapter (Socket.io Redis adapter)
   - Separate ingestion service from API server

2. **Database Scaling**:
   - Read replicas for analytics queries
   - Partitioning by date for large datasets
   - Archive old data to cold storage

3. **Caching**:
   - Redis cache for analytics results (5-minute TTL)
   - CDN for static frontend assets
   - Browser caching for API responses

## Monitoring & Observability

### Logging Strategy

- Console logging with timestamps
- Error logging for failed API calls
- Connection/disconnection events for WebSocket
- Database query logging in development

### Recommended Production Additions

- Structured logging (Winston/Pino)
- Application Performance Monitoring (APM)
- Database query performance monitoring
- WebSocket connection metrics
- Error tracking (Sentry)

## Testing Infrastructure

### Test Framework Setup

- **Testing Framework**: Jest 29.7.0 with ts-jest
- **Test Environment**: jsdom for DOM-based tests
- **Mocking Library**: axios-mock-adapter for API mocking
- **React Testing**: @testing-library/react for component tests
- **Coverage**: Configured with text, lcov, and HTML reporters

### Test Structure

```
tests/
├── setup.ts                          # Global test configuration
├── models/
│   └── weatherModel.test.ts         # Database model logic tests
├── services/
│   └── weatherApiService.test.ts    # API service & retry logic tests
└── store/
    └── weatherSlice.test.ts         # Redux state management tests
```

### Test Categories

1. **Model Tests** (`tests/models/weatherModel.test.ts`):
   - Aggregation calculations (MIN, MAX, AVG)
   - Time-based filtering logic (24-hour windows)
   - Multi-city aggregation
   - SQL query optimization validation
   - Edge case handling (empty datasets, single readings)

2. **Service Tests** (`tests/services/weatherApiService.test.ts`):
   - Successful API data fetching (Open-Meteo & OpenWeatherMap)
   - Retry mechanism with exponential backoff
   - Error handling (network errors, timeouts, 500 errors)
   - Multi-city fetch with partial failures
   - API key validation for OpenWeatherMap
   - Mock-based testing using axios-mock-adapter

3. **Redux Store Tests** (`tests/store/weatherSlice.test.ts`):
   - Reducer logic for all actions
   - Async thunk lifecycle (pending, fulfilled, rejected)
   - Live readings management (prepend, 100-item limit)
   - WebSocket connection state
   - Complex state scenarios (reconnection, error recovery)
   - State integrity validation

### Test Configuration

**jest.config.js**:
```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/server.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
}
```

**tests/setup.ts**:
- Environment variable configuration
- localStorage mock for client-side tests
- Window object mock for browser APIs
- Config module mocking

### Running Tests

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# View coverage report
open coverage/index.html
```

### Key Testing Patterns

1. **API Mocking Strategy**:
   - Use `axios-mock-adapter` for HTTP request mocking
   - Mock based on `config.params` for query parameters (not URL patterns)
   - Support multiple response scenarios (success, failure, timeout)

2. **Retry Logic Testing**:
   - Verify exponential backoff timing (5s, 10s, 15s delays)
   - Test max retry attempts (3 attempts)
   - Validate partial failure handling (continue with other cities)

3. **State Management Testing**:
   - Test reducer pure functions independently
   - Validate async thunk lifecycle states
   - Ensure state integrity across complex scenarios

### Coverage Goals

- **Target Coverage**: 80%+ for critical paths
- **Excluded from Coverage**:
  - Type definitions (`*.d.ts`)
  - Server entry point (`server.ts`)
  - Type-only modules

## Deployment Architecture

### Development Environment

```
Terminal 1: Backend API (npm run dev:backend)
Terminal 2: Ingestion Service (npm run dev:ingestion)
Terminal 3: Frontend Dev Server (npm run dev:frontend)
```

### Production Deployment

```
- Backend: PM2 process manager or Docker container
- Ingestion: Separate PM2 process or cron job
- Frontend: Static build served by Nginx
- Database: Managed MySQL service (AWS RDS, DigitalOcean)
- WebSocket: Sticky sessions on load balancer
```

## Conclusion

This architecture provides a solid foundation for a production-ready weather monitoring system with:

- **Security**: JWT authentication, password hashing, protected endpoints
- **Performance**: Optimized database queries with proper indexing
- **Scalability**: Modular design allows horizontal scaling
- **Reliability**: Retry mechanisms and error handling
- **Maintainability**: TypeScript throughout, clear separation of concerns
- **Real-time**: WebSocket integration for live updates
- **User Experience**: Modern React UI with Redux state management
- **Testing**: Comprehensive test suite with Jest covering models, services, and state management

The system successfully meets all requirements while following industry best practices for security, performance, code quality, and test coverage.
