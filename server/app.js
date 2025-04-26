// Main Express application entry point for the unified Kaleidoplan API server
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { initFirebaseAdmin } = require('./config/firebase');
const { connectToMongoDB } = require('./config/mongodb');
const errorHandler = require('./middleware/errorHandler');
const { scheduleWeeklyEmails } = require('./services/subscription.service');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const eventsRoutes = require('./routes/events.routes');
const tasksRoutes = require('./routes/tasks.routes');
const spotifyRoutes = require('./routes/spotify.routes');
const sponsorRoutes = require('./routes/sponsor.routes');
const playlistRoutes = require('./routes/playlist.routes');
const userRoutes = require('./routes/user.routes');
const publicRoutes = require('./routes/public.routes');
const adminRoutes = require('./routes/admin.routes');
const subscriptionRoutes = require('./routes/subscription.routes');

scheduleWeeklyEmails();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin SDK
const admin = require('./config/firebase');
// Firebase is already initialized when we require the module

// Connect to MongoDB
connectToMongoDB();

// Middleware
const corsOptions = {
  origin: ['http://localhost:3001', 'http://localhost:3000', process.env.CORS_ORIGIN].filter(Boolean),
  credentials: true, // Important for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires'],
};

app.use(cors(corsOptions));

const authMiddleware = require('./middleware/auth');

// Add cookie parser middleware
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Request logging

// models
require('./models/performer.model');
require('./models/playlist.model');
require('./models/user.model');
require('./models/event.model');
require('./models/event-interest.model'); // Add this line
require('./models/event-sponsor.model'); // Add this for completeness
require('./models/organizer-event.model'); // Add this for completeness

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

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {});

module.exports = app;
