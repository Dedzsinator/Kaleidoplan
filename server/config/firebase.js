import admin from 'firebase-admin';
require('dotenv').config();

// Get service account from environment variable or JSON file
let serviceAccount;
try {
  // First try to use environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // Fix the private key format issue
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      // Check if it doesn't have the correct PEM format
      if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
        // Add PEM headers and footers
        serviceAccount.private_key = `-----BEGIN PRIVATE KEY-----\n${serviceAccount.private_key}\n-----END PRIVATE KEY-----\n`;
      }

      // Replace escaped newlines with actual newlines if needed
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\n\n/g, '\n'); // Fix any doubled newlines
    }
  } else {
    // Fallback to JSON file if environment variable not available
    serviceAccount = require('./serviceAccountKey.json');
  }
} catch (error) {
  console.error('Error loading Firebase service account:', error);
  process.exit(1);
}

admin.verifyAuthToken = async (token) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'user',
      claims: decodedToken,
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
};

module.exports = admin;

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`,
});

// Export the admin object directly
module.exports = admin;
