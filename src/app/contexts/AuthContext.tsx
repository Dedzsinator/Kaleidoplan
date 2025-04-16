import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile, signInWithPopup,
  GoogleAuthProvider, User as FirebaseUser
} from 'firebase/auth';
// Import the Firebase app instance
import { auth } from '../config/firebase'; // Import the pre-initialized auth
import { fetchWithAuth } from '../../services/api';

// Define user types
export type UserRole = 'user' | 'organizer' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  managedEvents?: string[];
}

interface AuthContextType {
  currentUser: User | null;
  user: User | null; // Add alias for currentUser to fix HomeScreen
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  firebaseUser: FirebaseUser | null; // Add this to expose the raw Firebase user

  // Add missing methods used in components
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<User | null>;
  refreshUserToken: () => Promise<void>; // Add this method to force token refresh
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null); // Store Firebase user
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

  const refreshUserToken = async () => {
    if (firebaseUser) {
      const idTokenResult = await firebaseUser.getIdTokenResult(true);
      const role = idTokenResult.claims.role || 'user';

      // Update user data with refreshed role
      if (currentUser) {
        const updatedUser = { ...currentUser, role: role as UserRole };
        setCurrentUser(updatedUser);
        setIsAdmin(role === 'admin');
        setIsOrganizer(role === 'admin' || role === 'organizer');
      }
    }
  };

  // Authentication methods - use the imported auth instance
  const login = async (email: string, password: string): Promise<User> => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setFirebaseUser(userCredential.user); // Store Firebase user

      // Force token refresh to get updated custom claims
      const idTokenResult = await userCredential.user.getIdTokenResult(true);

      // Extract role from Firebase claims
      const role = idTokenResult.claims.role || 'user';

      console.log('Login successful with role:', role, 'Claims:', idTokenResult.claims);

      // Create user object with role
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email || '',
        displayName: userCredential.user.displayName || undefined,
        photoURL: userCredential.user.photoURL || undefined,
        role: role as UserRole
      };

      // Update state
      setCurrentUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(role === 'admin');
      setIsOrganizer(role === 'admin' || role === 'organizer');

      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<User> => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setFirebaseUser(result.user);

      // Force token refresh to get updated custom claims
      const idTokenResult = await result.user.getIdTokenResult(true);

      // Extract role from Firebase claims
      const role = idTokenResult.claims.role || 'user';

      // Create user object with role
      const userData: User = {
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || undefined,
        photoURL: result.user.photoURL || undefined,
        role: role as UserRole
      };

      setCurrentUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(role === 'admin');
      setIsOrganizer(role === 'admin' || role === 'organizer');

      return userData; // Return the user data
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string): Promise<void> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update profile with display name
    await updateProfile(userCredential.user, {
      displayName: displayName
    });

    // User data will be set by the auth state listener
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
    setCurrentUser(null);
  };

  const refreshUserData = async (): Promise<User | null> => {
    try {
      const response = await fetchWithAuth('/api/auth/me');
      if (!response.ok) {
        throw new Error('Failed to refresh user data');
      }

      const userData = await response.json();
      setCurrentUser(userData);
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return currentUser;
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          // Store the Firebase user
          setFirebaseUser(fbUser);

          // Force token refresh to get latest claims
          const idTokenResult = await fbUser.getIdTokenResult(true);

          // Get role from Firebase custom claims
          const role = idTokenResult.claims.role || 'user';

          console.log('User authenticated with role from Firebase:', role);

          // Set user data with role from Firebase claims
          setCurrentUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || undefined,
            photoURL: fbUser.photoURL || undefined,
            role: role as UserRole
          });

          setIsAuthenticated(true);
          setIsAdmin(role === 'admin');
          setIsOrganizer(role === 'admin' || role === 'organizer');
        } else {
          setFirebaseUser(null);
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsOrganizer(false);
        }
      } catch (error) {
        console.error('Error processing authentication:', error);
        setFirebaseUser(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsOrganizer(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    currentUser,
    user: currentUser,
    firebaseUser, // Expose the Firebase user
    loading,
    isAuthenticated,
    isAdmin,
    isOrganizer,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshUserData,
    refreshUserToken // Add the new method
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}