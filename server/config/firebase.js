// Firebase configuration and initialization
const { initializeApp, cert } = require('firebase-admin/app');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Initializes Firebase Admin SDK with service account credentials
 */
const initFirebaseAdmin = () => {
  try {
    let serviceAccount;
    
    // Try to get service account from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
      );
    } 
    // Or from service account file
    else {
      const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
      if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
      } else {
        throw new Error('Firebase service account not found. Please check your configuration.');
      }
    }
    
    // Initialize Firebase with service account
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('Firebase Admin SDK initialized successfully');
    return app;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
};

module.exports = { 
  initFirebaseAdmin,
  admin
};