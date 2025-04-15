// Main Express application entry point for the unified Kaleidoplan API server
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { initFirebaseAdmin } = require('./config/firebase');
const { connectToMongoDB } = require('./config/mongodb');
const errorHandler = require('./middleware/errorHandler');

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

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin SDK
initFirebaseAdmin();

// Connect to MongoDB
connectToMongoDB();

// Middleware
const corsOptions = {
  origin: ['http://localhost:3001', 'http://localhost:3000', process.env.CORS_ORIGIN].filter(Boolean),
  credentials: true, // Important for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
    'Expires'
  ]
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/public', publicRoutes);

app.use('/api/events', eventsRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Kaleidoplan unified API server running on port ${PORT}`);
});

module.exports = app;