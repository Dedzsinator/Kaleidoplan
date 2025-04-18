import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { auth } from '../app/config/firebase'; // Import the initialized auth
import axios from 'axios';

// Set up API client
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending/receiving cookies
});

// Get current authenticated user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Email sign in with backend sync
export const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Get ID token
    const token = await userCredential.user.getIdToken();

    // Send token to backend to validate and set cookie
    await api.post('/auth/login', { token });

    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Register new user
export const register = async (email: string, password: string, displayName: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update profile
    await firebaseUpdateProfile(userCredential.user, { displayName });

    // Get ID token
    const token = await userCredential.user.getIdToken();

    // Sync with backend and set cookie
    await api.post('/auth/login', { token });

    return userCredential.user;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);

    // Clear server-side cookie
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Update user profile
export const updateProfile = async (data: { displayName?: string; photoURL?: string }): Promise<User> => {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('No authenticated user');
    }

    await firebaseUpdateProfile(user, data);

    // Sync with backend
    await api.post('/auth/profile', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      ...data,
    });

    return user;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

// Google Sign In
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider();

    // Add scopes if needed
    provider.addScope('profile');
    provider.addScope('email');

    const result = await signInWithPopup(auth, provider);

    // Get the token
    const token = await result.user.getIdToken();

    // Send to backend to validate and set cookies
    await api.post('/auth/google-auth', { token });

    return result.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

// Get user profile from backend (with cached data)
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string;
  preferences?: {
    theme: string;
    notifications: boolean;
  };
}

export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const response = await api.get('/auth/profile');
    return response.data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};
