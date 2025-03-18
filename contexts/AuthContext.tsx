import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeApp } from "firebase/app";

// Firebase configuration (ideally this should be imported from your firebaseConfig.js)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyD7YFWaMQobtphzKltZmZRLDPcb9u1VkhM",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "kaleidoplan-513ab.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "kaleidoplan-513ab",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "kaleidoplan-513ab.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "39427885895",
  appId: process.env.FIREBASE_APP_ID || "1:39427885895:web:584d4dbdad67d9230f1a62",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-XSGJ76DP5B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fix: onAuthStateChanged is a function that takes auth as its first parameter
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Assign a role (e.g., based on user email or custom claims)
        user.role = user.email === 'admin@example.com' ? 'admin' : 'organizer';
      }
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      throw error; // Re-throw to allow handling in UI
    }
  };

  const register = async (email, password) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      throw error; // Re-throw to allow handling in UI
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
      throw error; // Re-throw to allow handling in UI
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);