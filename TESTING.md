# Testing Guide

This document provides comprehensive testing instructions for the Weather Monitoring System.

## Manual Testing Checklist

### Phase 1: Backend Authentication

#### 1.1 User Registration
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

**Test Cases:**
- ✓ Valid registration succeeds
- ✓ Duplicate username returns 409 error
- ✓ Duplicate email returns 409 error
- ✓ Password < 6 characters returns 400 error
- ✓ Missing fields return 400 error

#### 1.2 User Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    }
  }
}
```

**Test Cases:**
- ✓ Valid credentials return JWT token
- ✓ Invalid username returns 401 error
- ✓ Invalid password returns 401 error
- ✓ Missing fields return 400 error

### Phase 2: Weather Data Ingestion

#### 2.1 Verify Ingestion Service
Check the ingestion service logs for:
```
=== Weather Data Ingestion Service ===
Tracked cities: London, Dubai, Tokyo
Ingestion interval: 10 minutes
✓ Ingestion service started successfully

[2025-10-02T12:00:00.000Z] Starting weather data ingestion...
Fetching data for cities: London, Dubai, Tokyo
✓ Successfully fetched weather for London
✓ Saved reading for London (ID: 1)
✓ Broadcasted update for London to WebSocket clients
```

**Test Cases:**
- ✓ Service starts without errors
- ✓ Fetches data for all configured cities
- ✓ Saves readings to database
- ✓ Broadcasts to WebSocket clients
- ✓ Handles API failures gracefully
- ✓ Retries on network errors

#### 2.2 Verify Database Entries
```bash
mysql -u root -p weather_monitoring -e "
  SELECT id, city_name, temperature_c, humidity_percent, recorded_at 
  FROM weather_readings 
  ORDER BY recorded_at DESC 
  LIMIT 10;
"
```

**Expected Output:**
```
+----+-----------+---------------+------------------+---------------------+
| id | city_name | temperature_c | humidity_percent | recorded_at         |
+----+-----------+---------------+------------------+---------------------+
|  3 | Tokyo     |         15.20 |               65 | 2025-10-02 12:00:00 |
|  2 | Dubai     |         32.50 |               45 | 2025-10-02 12:00:00 |
|  1 | London    |         12.80 |               78 | 2025-10-02 12:00:00 |
+----+-----------+---------------+------------------+---------------------+
```

### Phase 3: Analytics Endpoint

#### 3.1 Get Analytics (Protected Route)
```bash
# First, get a token by logging in
TOKEN="your_jwt_token_here"

curl -X GET "http://localhost:3001/api/weather/analytics?hours=24" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "period_hours": 24,
    "analytics": [
      {
        "city_name": "Dubai",
        "min_temperature": 28.5,
        "max_temperature": 35.2,
        "avg_humidity": 42.3
      },
      {
        "city_name": "London",
        "min_temperature": 10.2,
        "max_temperature": 15.8,
        "avg_humidity": 75.6
      },
      {
        "city_name": "Tokyo",
        "min_temperature": 12.1,
        "max_temperature": 18.9,
        "avg_humidity": 68.4
      }
    ]
  }
}
```

**Test Cases:**
- ✓ Returns aggregated data for all cities
- ✓ Calculates min/max temperature correctly
- ✓ Calculates average humidity correctly
- ✓ Filters by time period (24 hours)
- ✓ Requires valid JWT token
- ✓ Returns 401 without token
- ✓ Returns 403 with invalid token

#### 3.2 Query Performance Test
```bash
mysql -u root -p weather_monitoring -e "
  EXPLAIN SELECT 
    city_name,
    MIN(temperature_c) as min_temperature,
    MAX(temperature_c) as max_temperature,
    AVG(humidity_percent) as avg_humidity
  FROM weather_readings
  WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
  GROUP BY city_name;
"
```

**Expected:**
- ✓ Uses index `idx_city_recorded`
- ✓ No temporary tables
- ✓ No filesort operations

### Phase 4: WebSocket Real-time Updates

#### 4.1 Test WebSocket Connection
Create a test file `test-websocket.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Test</title>
  <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
</head>
<body>
  <h1>WebSocket Test</h1>
  <div id="status">Connecting...</div>
  <div id="messages"></div>
  
  <script>
    const socket = io('http://localhost:3001');
    
    socket.on('connect', () => {
      document.getElementById('status').textContent = 'Connected ✓';
      console.log('Connected to WebSocket');
    });
    
    socket.on('disconnect', () => {
      document.getElementById('status').textContent = 'Disconnected ✗';
      console.log('Disconnected from WebSocket');
    });
    
    socket.on('weather:update', (data) => {
      console.log('Weather update:', data);
      const div = document.createElement('div');
      div.textContent = `${data.city_name}: ${data.temperature_c}°C, ${data.humidity_percent}%`;
      document.getElementById('messages').prepend(div);
    });
  </script>
</body>
</html>
```

**Test Cases:**
- ✓ Connection establishes successfully
- ✓ Receives `weather:update` events
- ✓ Data format matches WeatherReading interface
- ✓ Reconnects after disconnection
- ✓ Multiple clients receive same updates

### Phase 5: Frontend Testing

#### 5.1 Registration Flow
1. Navigate to http://localhost:5173/register
2. Fill in registration form:
   - Username: testuser2
   - Email: test2@example.com
   - Password: password123
   - Confirm Password: password123
3. Click "Register"

**Expected:**
- ✓ Success message appears
- ✓ Redirects to login after 2 seconds
- ✓ Form validation works (password match, length)
- ✓ Error messages display for invalid input

#### 5.2 Login Flow
1. Navigate to http://localhost:5173/login
2. Enter credentials:
   - Username: testuser2
   - Password: password123
3. Click "Sign In"

**Expected:**
- ✓ Redirects to dashboard
- ✓ Token stored in localStorage
- ✓ User info displayed in header
- ✓ Error message for invalid credentials

#### 5.3 Dashboard - Analytics View
**Test Cases:**
- ✓ Analytics cards display for each city
- ✓ Min/Max temperature shown correctly
- ✓ Average humidity displayed
- ✓ Temperature colors change based on value
- ✓ Refresh button updates data
- ✓ Loading spinner shows during fetch
- ✓ Empty state shown when no data

#### 5.4 Dashboard - Live Feed
**Test Cases:**
- ✓ WebSocket connection status badge shows "Connected"
- ✓ New readings appear in real-time
- ✓ Readings sorted by most recent first
- ✓ Table shows city, temperature, humidity, time
- ✓ Timestamps formatted correctly
- ✓ Empty state shown when no readings
- ✓ Disconnection warning appears when WebSocket drops

#### 5.5 Redux State Management
Open browser DevTools → Redux DevTools:

**Test Cases:**
- ✓ `auth` slice contains user and token
- ✓ `weather` slice contains liveReadings and analytics
- ✓ Actions dispatched on user interactions
- ✓ State updates trigger UI re-renders
- ✓ Logout clears auth state

### Phase 6: Security Testing

#### 6.1 Password Hashing
```bash
mysql -u root -p weather_monitoring -e "
  SELECT username, password_hash FROM users LIMIT 1;
"
```

**Expected:**
- ✓ Password is bcrypt hash (starts with $2b$)
- ✓ Hash is 60 characters long
- ✓ Plain password not stored

#### 6.2 JWT Token Validation
```bash
# Try accessing protected route without token
curl -X GET http://localhost:3001/api/weather/analytics

# Try with invalid token
curl -X GET http://localhost:3001/api/weather/analytics \
  -H "Authorization: Bearer invalid_token"
```

**Expected:**
- ✓ Returns 401 without token
- ✓ Returns 403 with invalid token
- ✓ Token expires after 24 hours

#### 6.3 SQL Injection Prevention
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin\" OR \"1\"=\"1",
    "password": "anything"
  }'
```

**Expected:**
- ✓ Returns 401 (invalid credentials)
- ✓ No SQL error
- ✓ Parameterized queries prevent injection

### Phase 7: Error Handling

#### 7.1 Database Connection Error
Stop MySQL service temporarily:
```bash
# Stop MySQL
sudo service mysql stop

# Check backend logs
```

**Expected:**
- ✓ Graceful error message
- ✓ Service doesn't crash
- ✓ Reconnects when database available

#### 7.2 Weather API Failure
Set invalid API key in `.env`:
```bash
WEATHER_API_KEY=invalid_key
```

**Expected:**
- ✓ Retry mechanism activates
- ✓ Error logged but service continues
- ✓ Other cities still processed
- ✓ No crash or hang

#### 7.3 Frontend API Error
Stop backend server:
```bash
# Stop backend
# Try to login on frontend
```

**Expected:**
- ✓ Error message displayed to user
- ✓ No console errors
- ✓ UI remains functional
- ✓ Can retry after backend restarts

### Phase 8: Performance Testing

#### 8.1 Database Query Performance
```bash
# Insert 10,000 test records
mysql -u root -p weather_monitoring << EOF
DELIMITER //
CREATE PROCEDURE insert_test_data()
BEGIN
  DECLARE i INT DEFAULT 0;
  WHILE i < 10000 DO
    INSERT INTO weather_readings (city_name, temperature_c, humidity_percent, recorded_at)
    VALUES 
      ('London', RAND() * 30, FLOOR(RAND() * 100), DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 168) HOUR)),
      ('Dubai', RAND() * 40 + 10, FLOOR(RAND() * 80), DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 168) HOUR)),
      ('Tokyo', RAND() * 35, FLOOR(RAND() * 90), DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 168) HOUR));
    SET i = i + 1;
  END WHILE;
END//
DELIMITER ;

CALL insert_test_data();
DROP PROCEDURE insert_test_data;
EOF

# Test query performance
mysql -u root -p weather_monitoring -e "
  SELECT BENCHMARK(1000, (
    SELECT city_name, MIN(temperature_c), MAX(temperature_c), AVG(humidity_percent)
    FROM weather_readings
    WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY city_name
  ));
"
```

**Expected:**
- ✓ Query completes in < 10ms
- ✓ Consistent performance with large dataset

#### 8.2 WebSocket Load Test
```javascript
// Create 100 concurrent connections
const io = require('socket.io-client');

for (let i = 0; i < 100; i++) {
  const socket = io('http://localhost:3001');
  socket.on('connect', () => console.log(`Client ${i} connected`));
  socket.on('weather:update', (data) => console.log(`Client ${i} received:`, data));
}
```

**Expected:**
- ✓ All connections establish successfully
- ✓ All clients receive broadcasts
- ✓ No memory leaks
- ✓ Server remains responsive

## Automated Testing (Future Enhancement)

### Unit Tests
```typescript
// Example: authController.test.ts
describe('AuthController', () => {
  test('register creates user with hashed password', async () => {
    // Test implementation
  });
  
  test('login returns JWT token for valid credentials', async () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
// Example: weatherApi.test.ts
describe('Weather API Integration', () => {
  test('fetches weather data from external API', async () => {
    // Test implementation
  });
  
  test('handles API failures gracefully', async () => {
    // Test implementation
  });
});
```

### E2E Tests (Playwright)
```typescript
// Example: dashboard.spec.ts
test('user can view live weather updates', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await page.fill('#username', 'testuser');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('.badge-success')).toContainText('Connected');
});
```

## Test Coverage Goals

- **Backend**: 80%+ code coverage
- **Frontend**: 70%+ code coverage
- **Integration**: All critical paths tested
- **E2E**: Core user flows automated

## Continuous Testing

### Pre-commit Checks
- TypeScript compilation
- Linting (ESLint)
- Unit tests pass

### CI/CD Pipeline
- Run all tests on push
- Build verification
- Database migration tests
- Security scanning

## Conclusion

This testing guide ensures all components of the Weather Monitoring System work correctly. Regular testing prevents regressions and maintains system reliability.
