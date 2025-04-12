// MongoDB connection configuration
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kaleidoplan';
const DB_NAME = process.env.MONGODB_DB_NAME || 'kaleidoplan';

/**
 * Connect to MongoDB using Mongoose
 */
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`Connected to MongoDB database: ${DB_NAME}`);
    
    // Set up error handling for the connection
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

module.exports = {
  connectToMongoDB,
  mongoose
};