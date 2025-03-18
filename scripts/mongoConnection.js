const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load environment variables from .env file

// Get MongoDB connection string from env or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'kaleidoplan';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  // If we have cached values, use them
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Connect to MongoDB
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  // Cache the connection
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

module.exports = { connectToDatabase };