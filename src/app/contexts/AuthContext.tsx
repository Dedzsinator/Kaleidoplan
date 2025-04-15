import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { signIn, register, signOut, signInWithGoogle, getUserProfile, UserProfile } from '../../services/authService';

// Interface for combined user data - Use Omit to remove the email property before extending
export interface AppUser extends Omit<UserProfile, 'email'> {
  firebaseUser: FirebaseUser; // Original Firebase user object
  uid: string;
  email: string | null; // Now we can define email as nullable without conflict
  displayName: string | null;
  photoURL: string | null;
  role: string;
}

// Updated interface to expose AppUser
interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  register: (email: string, password: string, displayName: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<FirebaseUser>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [combinedUser, setCombinedUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  // REMOVE navigate - this is causing the error
  // const navigate = useNavigate(); 

  // Combine Firebase user with backend profile
  useEffect(() => {
    if (firebaseUser && userProfile) {
      setCombinedUser({
        ...userProfile,
        firebaseUser,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role: userProfile.role || 'user'
      });
    } else {
      setCombinedUser(null);
    }
  }, [firebaseUser, userProfile]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (newFirebaseUser) => {
      setFirebaseUser(newFirebaseUser);

      if (newFirebaseUser) {
        try {
          // Get user profile from backend
          const profile = await getUserProfile();
          setUserProfile(profile);
        } catch (error) {
          console.error("Failed to load user profile", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle login - REMOVE navigation
  const login = async (email: string, password: string) => {
    try {
      const user = await signIn(email, password);
      // REMOVE: navigate('/home');
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Handle registration - REMOVE navigation
  const handleRegister = async (email: string, password: string, displayName: string) => {
    try {
      const user = await register(email, password, displayName);
      // REMOVE: navigate('/home');
      return user;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  // Handle logout - REMOVE navigation
  const handleLogout = async () => {
    try {
      await signOut();
      // REMOVE: navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Handle Google login - REMOVE navigation
  const handleGoogleLogin = async () => {
    try {
      const user = await signInWithGoogle();
      // REMOVE: navigate('/home');
      return user;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user: combinedUser,
    loading,
    login,
    register: handleRegister,
    logout: handleLogout,
    loginWithGoogle: handleGoogleLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};