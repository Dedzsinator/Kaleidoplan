import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,updateProfile} from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, updateDoc, getDoc, getDocs, query, where} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import environment variables
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID
} from '@env';

// Firebase configuration with environment variables
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Authentication functions
export const loginUser = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerUser = async (email: string, password: string, displayName: string) => {
  // Create the user account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update the user profile
  await updateProfile(userCredential.user, {
    displayName: displayName
  });
  
  // Create a user document in Firestore
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email,
    displayName,
    role: 'guest', // Default role
    createdAt: new Date().toISOString()
  });
  
  return userCredential;
};

export const registerOrganizer = async (email: string, password: string, displayName: string) => {
  // Create the user account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update the user profile
  await updateProfile(userCredential.user, {
    displayName: displayName
  });
  
  // Create a user document in Firestore with organizer role
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email,
    displayName,
    role: 'organizer',
    createdAt: new Date().toISOString()
  });
  
  return userCredential;
};

export const logoutUser = () => {
  return signOut(auth);
};

// User management functions
export const updateUserRole = async (userId: string, role: 'guest' | 'organizer' | 'admin') => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { role });
};