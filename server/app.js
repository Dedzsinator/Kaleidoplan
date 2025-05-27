import http from 'http';
// const { initFirebaseAdmin } = require('./config/firebase');
import fs from 'fs';
import path from 'path';

import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import express from 'express';

import notificationService from './services/notification.service';
import { scheduleWeeklyEmails } from './services/subscription.service';
import errorHandler from './middleware/errorHandler';
import admin from './config/firebase';
import { connectToMongoDB } from './config/mongodb';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000', process.env.CORS_ORIGIN].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io/', // Make sure this matches the client's path
});

notificationService.initializeNotificationService(io);

// In your socket.io connection handler section

// Add debug logging for all socket connections
io.on('connection', (socket) => {
  // Debug log all events emitted by this socket
  const originalEmit = socket.emit;
  socket.emit = function (...args) {
    return originalEmit.apply(this, args);
  };

  // Authenticate user if token provided
  socket.on('authenticate', async (token) => {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      socket.userId = decodedToken.uid;

      // Join user-specific room
      socket.join(`user:${decodedToken.uid}`);
      // Always join authenticated room regardless of role
      socket.join('authenticated');

      // Add to role-specific rooms
      if (decodedToken.role === 'admin') {
        socket.join('admins');
      }

      if (decodedToken.role === 'organizer') {
        socket.join('organizers');
      }

      // Send confirmation back to client
      socket.emit('authenticated', {
        success: true,
        userId: decodedToken.uid,
        role: decodedToken.role || 'user',
      });
    } catch (error) {
      console.error(`❌ Socket authentication error:`, error);
      socket.emit('authenticated', { success: false, error: 'Authentication failed' });
    }
  });

  socket.on('subscribe-to-event', (eventId) => {
    socket.join(`event:${eventId}`);
    socket.emit('subscribed', { eventId, status: 'success' });
  });

  socket.on('unsubscribe-from-event', (eventId) => {
    socket.leave(`event:${eventId}`);
  });

  socket.on('disconnect', () => {});
});

// Make io accessible to routes
app.set('io', io);

// Connect to MongoDB
connectToMongoDB();

// Schedule weekly email sending
scheduleWeeklyEmails();

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/events');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3001', 'http://localhost:3000', process.env.CORS_ORIGIN].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Add PATCH here
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires'],
};

// Apply core middleware
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
  // Strictly match upload routes and multipart content type
  if (
    (req.originalUrl === '/api/events/images/upload' || req.originalUrl === '/api/events/images/upload-multiple') &&
    req.headers['content-type'] &&
    req.headers['content-type'].includes('multipart/form-data')
  ) {
    return next();
  }

  // Continue to next middleware for all other requests
  next();
});

// Apply regular body parsers AFTER the special handling middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Import routes
import authRoutes from './routes/auth.routes';
import eventsRoutes from './routes/events.routes';
import tasksRoutes from './routes/tasks.routes';
import spotifyRoutes from './routes/spotify.routes';
import sponsorRoutes from './routes/sponsor.routes';
import playlistRoutes from './routes/playlist.routes';
import userRoutes from './routes/user.routes';
import publicRoutes from './routes/public.routes';
import adminRoutes from './routes/admin.routes';
import subscriptionRoutes from './routes/subscription.routes';

// Import models - they should be loaded before routes that use them
require('./models/performer.model');
require('./models/playlist.model');
require('./models/user.model');
require('./models/event.model');
require('./models/event-interest.model');
require('./models/event-sponsor.model');
require('./models/organizer-event.model');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date(),
    version: '1.0.0',
  });
});

// Error handling middleware - must be last
app.use(errorHandler);

// Start server
server.listen(PORT, () => {});

module.exports = { app, server, io };
