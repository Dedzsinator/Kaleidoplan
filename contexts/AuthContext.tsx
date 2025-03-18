import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  getIdTokenResult
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7YFWaMQobtphzKltZmZRLDPcb9u1VkhM",
  authDomain: "kaleidoplan-513ab.firebaseapp.com",
  projectId: "kaleidoplan-513ab",
  storageBucket: "kaleidoplan-513ab.firebasestorage.app",
  messagingSenderId: "39427885895",
  appId: "1:39427885895:web:584d4dbdad67d9230f1a62",
  measurementId: "G-XSGJ76DP5B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Create auth context with default values to help TypeScript
const AuthContext = createContext({
  user: null,
  loading: true,
  authError: null,
  login: async (email, password) => null,
  loginWithGoogle: async () => null,
  register: async (email, password, name) => null,
  resetPassword: async (email) => {},
  logout: async () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Store authentication state persistence
  const storeAuthState = async (currentUser) => {
    try {
      if (currentUser) {
        const token = await currentUser.getIdToken();
        await AsyncStorage.setItem('authToken', token);
      } else {
        await AsyncStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('Error storing auth state:', error);
    }
  };

  const restoreAuthFromToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return !!token;
    } catch (error) {
      console.error('Error restoring auth:', error);
      return false;
    }
  };

  // Check for persisted auth on initial load
  useEffect(() => {
    const checkPersistedAuth = async () => {
      try {
        const hasAuth = await restoreAuthFromToken();
        if (!hasAuth && !user) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking persisted auth:', error);
        setLoading(false);
      }
    };

    checkPersistedAuth();
  }, [user]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get user custom claims to determine role
          const tokenResult = await getIdTokenResult(firebaseUser);
          
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          // Create enhanced user object
          const enhancedUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || userData.name,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            role: tokenResult.claims.role || userData.role || 'organizer',
            createdAt: userData.createdAt,
            ...userData
          };
          
          setUser(enhancedUser);
          storeAuthState(firebaseUser);
        } else {
          setUser(null);
          storeAuthState(null);
        }
      } catch (error) {
        console.error('Error processing auth state change:', error);
      } finally {
        setLoading(false);
      }
    });
    
    // Clean up subscription
    return () => unsubscribe();
  }, []);

  // Email and password sign in
  const login = async (email, password) => {
    try {
      setAuthError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  // Google sign in
  const loginWithGoogle = async () => {
    try {
      setAuthError(null);
      
      // Different implementation for web and mobile
      if (Platform.OS === 'web') {
        // Web implementation
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        // Check if this is a new user
        const isNewUser = result._tokenResponse?.isNewUser;
        
        if (isNewUser) {
          // Create user document in Firestore
          await setDoc(doc(db, 'users', result.user.uid), {
            name: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
            role: 'organizer',
            createdAt: new Date().toISOString()
          });
        }
        
        return result.user;
      } else {
        // Mobile implementation
        throw new Error("Google Sign-In not implemented for mobile yet");
      }
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  // Registration with email and password
  const register = async (email, password, name) => {
    try {
      setAuthError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Set display name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: name,
        email: email,
        role: 'organizer',
        createdAt: new Date().toISOString()
      });
      
      return userCredential.user;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };
  
  // Password reset
  const resetPassword = async (email) => {
    try {
      setAuthError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };
  
  // Sign out
  const logout = async () => {
    try {
      setAuthError(null);
      await signOut(auth);
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  // Create context value object
  const contextValue = {
    user, 
    loading, 
    authError,
    login, 
    loginWithGoogle,
    register, 
    resetPassword,
    logout
  };

  // Return the Provider with the context value and children
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the useAuth hook
export const useAuth = () => useContext(AuthContext);