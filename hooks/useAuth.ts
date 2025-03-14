import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../app/firebase';
import { createUserInDatabase, getUserById } from '../services/dbService';
import React from 'react';

export interface User {
  id: string;
  email: string;
  role: 'guest' | 'organizer' | 'admin';
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Create the context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null
});

// Use React.createElement instead of JSX to avoid syntax errors
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get user data from MSSQL
          let userData = await getUserById(firebaseUser.uid);
          
          if (!userData) {
            // User exists in Firebase Auth but not in our database
            // Create the user in our database
            await createUserInDatabase(
              firebaseUser.uid,
              firebaseUser.email || '', 
              firebaseUser.displayName || 'User',
              'guest'
            );
            
            userData = await getUserById(firebaseUser.uid);
          }
          
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: userData?.role || 'guest',
            displayName: firebaseUser.displayName || userData?.displayName,
            photoURL: firebaseUser.photoURL || userData?.photoURL,
          });
        } else {
          setUser(null);
        }
      } catch (err: any) {
        setError(err.message);
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Use React.createElement instead of JSX syntax
  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading, error } },
    children
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}