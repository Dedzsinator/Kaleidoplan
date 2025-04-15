import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserWelcomeCard from '../components/user/UserWelcomeCard';
import QuickActions from '../components/user/QuicActions'; // Fix import path
import { User } from '../models/types';

const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Create an adapter user for components that need the exact User type
  const adaptedUser: User | null = user ? {
    id: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: user.role
  } : null;

  return (
    <div className="home-container">
      {user ? (
        <>
          <UserWelcomeCard user={adaptedUser!} />
          <QuickActions
            user={adaptedUser!}
            onLogout={handleLogout}
            onNavigate={(path: string) => navigate(path)}
          />
          {/* Rest of your components */}
        </>
      ) : (
        <div className="login-prompt">
          <h2>Please log in to view your dashboard</h2>
          <button onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;