import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Add missing methods used in components
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication methods - use the imported auth instance
  const login = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
    // User data will be set by the auth state listener
  };

  const loginWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // User data will be set by the auth state listener
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

  // Check if user has admin role
  const isAdmin = currentUser?.role === 'admin';

  // Check if user has organizer role (organizer or admin)
  const isOrganizer = currentUser?.role === 'organizer' || isAdmin;

  // Listen for Firebase auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from our API
        try {
          // Get token and get user data from backend
          const token = await firebaseUser.getIdToken();

          // This would typically fetch user data from your backend
          const userResponse = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            setCurrentUser(userData);
          } else {
            // If backend is not available, create a basic user object
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || undefined,
              photoURL: firebaseUser.photoURL || undefined,
              role: 'user' // Default role until we get server confirmation
            });
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          // Create basic user if backend fails
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || undefined,
            photoURL: firebaseUser.photoURL || undefined,
            role: 'user' // Default role
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Missing part: provide all required properties in the context value
  const value: AuthContextType = {
    currentUser,
    user: currentUser, // Add alias for currentUser to fix HomeScreen
    loading,
    isAuthenticated: Boolean(currentUser),
    isAdmin,
    isOrganizer,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshUserData
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