const { MongoClient } = require('mongodb');
const crypto = require('crypto');
require('dotenv').config();

// Get the MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'kaleidoplan';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

let cachedClient = null;
let cachedDb = null;

// Utility functions for encryption of sensitive data
const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedText = Buffer.from(textParts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

// Connect to MongoDB
const connectToDatabase = async () => {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb, encrypt, decrypt };
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db, encrypt, decrypt };
};

module.exports = { connectToDatabase, encrypt, decrypt };
