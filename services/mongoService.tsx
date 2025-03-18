import { MongoClient, Db } from 'mongodb';
import Constants from 'expo-constants';

// Get the MongoDB connection string from environment variables
const MONGODB_URI = Constants.expoConfig?.extra?.mongodbUri || 'mongodb://localhost:27017';
const DB_NAME = 'kaleidoplan';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
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