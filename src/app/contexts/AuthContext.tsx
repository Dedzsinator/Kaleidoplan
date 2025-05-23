import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
// Import the Firebase app instance
import { auth } from '../config/firebase'; // Import the pre-initialized auth
import { fetchWithAuth } from '@services/api';
import TokenStorage from '@services/tokenStorage';

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
  firebaseUser: FirebaseUser | null;

  // Add missing methods used in components
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  loginWithGithub: () => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<User | null>;
  refreshUserToken: () => Promise<boolean>; // Add this method to force token refresh
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null); // Store Firebase user
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

  const register = async (email: string, password: string, displayName: string): Promise<void> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update profile with display name
    await updateProfile(userCredential.user, {
      displayName: displayName,
    });
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

  // In your login method in AuthContext.tsx
  const login = async (email: string, password: string): Promise<User> => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setFirebaseUser(userCredential.user);

      // Get ID token from Firebase
      const token = await userCredential.user.getIdToken();

      // Send token to backend to set up JWT cookies
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: token }),
        credentials: 'include', // Important for cookies
      });

      if (!response.ok) {
        let errorMessage = 'Server authentication failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Update state with user data from server
      const userData = data.user;
      setCurrentUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.role === 'admin');
      setIsOrganizer(userData.role === 'admin' || userData.role === 'organizer');

      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Similarly update other auth methods like loginWithGoogle:
  const loginWithGoogle = async (): Promise<User> => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setFirebaseUser(result.user);

      // Get token to send to backend
      const token = await result.user.getIdToken();

      // Send to backend to set up JWT cookies
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/google-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: token }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Server authentication failed');
      }

      const data = await response.json();

      // Update state with user data from server
      const userData = data.user;
      setCurrentUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.role === 'admin');
      setIsOrganizer(userData.role === 'admin' || userData.role === 'organizer');

      return userData;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGithub = async (): Promise<User> => {
    try {
      setLoading(true);
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setFirebaseUser(result.user);

      // Get token to send to backend
      const token = await result.user.getIdToken();

      // Send to backend to set up JWT cookies
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/github-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: token }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Server authentication failed');
      }

      const data = await response.json();

      // Update state with user data from server
      const userData = data.user;
      setCurrentUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.role === 'admin');
      setIsOrganizer(userData.role === 'admin' || userData.role === 'organizer');

      return userData;
    } catch (error) {
      console.error('GitHub login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update logout to clear cookies
  const logout = async (): Promise<void> => {
    try {
      // Sign out from Firebase
      await signOut(auth);

      // Clear server-side cookies
      await fetch(`${process.env.REACT_APP_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      // Clear local state
      setCurrentUser(null);
      setFirebaseUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsOrganizer(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Update refreshUserToken to handle JWT and silently fail during initial load
  const refreshUserToken = async (suppressErrors = false): Promise<boolean> => {
    try {
      // Call the refresh endpoint directly
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        if (!suppressErrors) {
          console.error(`Failed to refresh token: ${response.status} ${response.statusText}`);
        }
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();

      // Update user data with refreshed role
      if (data && data.user) {
        setCurrentUser(data.user);
        setIsAdmin(data.user.role === 'admin');
        setIsOrganizer(data.user.role === 'admin' || data.user.role === 'organizer');
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      if (!suppressErrors) {
        console.error('Error refreshing token:', error);
      }
      setIsAuthenticated(false);
      return false;
    }
  };

  // Update auth state change handler to suppress initial errors
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);

          // Try to get user data from server (using cookies)
          try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/profile`, {
              credentials: 'include',
            });

            if (response.ok) {
              // We have valid cookies
              const userData = await response.json();
              setCurrentUser(userData);
              setIsAdmin(userData.role === 'admin');
              setIsOrganizer(userData.role === 'admin' || userData.role === 'organizer');
              setIsAuthenticated(true);
            } else if (response.status === 401) {
              // Silently try to refresh token on initial load
              const refreshed = await refreshUserToken(true); // Pass true to suppress errors

              if (!refreshed) {
                // If refresh failed, silently get a new token from Firebase
                try {
                  const token = await fbUser.getIdToken(true);
                  const loginResponse = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ idToken: token }),
                    credentials: 'include',
                  });

                  if (loginResponse.ok) {
                    const data = await loginResponse.json();
                    setCurrentUser(data.user);
                    setIsAdmin(data.user.role === 'admin');
                    setIsOrganizer(data.user.role === 'admin' || data.user.role === 'organizer');
                    setIsAuthenticated(true);
                  }
                } catch (tokenError) {
                  console.warn('Silent authentication attempt failed during initialization');
                }
              }
            }
          } catch (error) {
            // Silently handle profile fetch errors during initialization
            console.warn('Initializing user data silently');
          }
        } else {
          setFirebaseUser(null);
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsOrganizer(false);
        }
      } catch (error) {
        console.error('Error processing authentication:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    currentUser,
    user: currentUser,
    firebaseUser,
    loading,
    isAuthenticated,
    isAdmin,
    isOrganizer,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshUserData,
    refreshUserToken,
    loginWithGithub,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
