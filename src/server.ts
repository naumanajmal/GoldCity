import express, { Application } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import weatherRoutes from './routes/weatherRoutes';
import { IngestionService } from './services/ingestionService';
import { WeatherModel } from './models/weatherModel';
import db from './config/database';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// WebSocket connection handling
io.on('connection', async (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);

  // Send initial data to the newly connected client
  try {
    const recentReadings = await WeatherModel.getRecentReadings(10);
    if (recentReadings.length > 0) {
      // Send each recent reading as a weather:update event
      recentReadings.reverse().forEach(reading => {
        socket.emit('weather:update', reading);
      });
      console.log(`✓ Sent ${recentReadings.length} initial readings to client ${socket.id}`);
    } else {
      console.log(`ℹ No initial data available for client ${socket.id}`);
    }
  } catch (error) {
    console.error(`✗ Error sending initial data to client ${socket.id}:`, error);
  }

  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`);
  });

  socket.on('error', (error) => {
    console.error(`WebSocket error for ${socket.id}:`, error);
  });
});

// Initialize ingestion service
const ingestionService = new IngestionService();
ingestionService.setSocketIO(io);

// Start server
httpServer.listen(PORT, () => {
  console.log('\n=== Weather Monitoring System ===');
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`WebSocket server ready`);
  console.log('================================\n');

  // Start ingestion service
  ingestionService.start();
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down server...');
  
  ingestionService.stop();
  
  httpServer.close(() => {
    console.log('✓ HTTP server closed');
  });

  io.close(() => {
    console.log('✓ WebSocket server closed');
  });

  await db.destroy();
  console.log('✓ Database connections closed');
  
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
