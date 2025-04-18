import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyD7YFWaMQobtphzKltZmZRLDPcb9u1VkhM',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'kaleidoplan-513ab.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'kaleidoplan-513ab',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'kaleidoplan-513ab.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
