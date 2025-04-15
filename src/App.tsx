import React, { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './app/contexts/AuthContext';
import { MusicPlayerProvider } from './app/contexts/MusicPlayerContext';
import './app/config/firebase'

// Import screens
import HomeScreen from './app/screen/HomeScreen';
import LoginScreen from './app/screen/LoginScreen';
import RegisterScreen from './app/screen/RegisterScreen';
import GuestScreen from './app/screen/GuestScreen';
import AdminAnalyticsScreen from './app/screen/AdminPanelScreen';
import EventDetailScreen from './app/screen/EventDetailScreen';
import EventListScreen from './app/screen/EventListScreen';
import ResetPasswordScreen from './app/screen/ResetPasswordScreen';
import OrganizerTaskScreen from './app/screen/OrganizerTaskScreen';
import TaskDetailScreen from './app/screen/TaskDetailScreen';
import TaskLogScreen from './app/screen/TaskLogScreen';
import { useAuth } from './app/contexts/AuthContext';

// Protected route component props interface
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | null;
}

// Protected route component - defined inside a function that has router context
const AppContent = () => {
  // ProtectedRoute needs useAuth, which needs AuthProvider
  const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole = null
  }) => {
    const { user, loading } = useAuth();

    if (loading) {
      return <div className="loading">Loading...</div>;
    }

    if (!user) {
      return <Navigate to="/login" />;
    }

    if (requiredRole && user.role !== requiredRole) {
      return <Navigate to="/home" />;
    }

    return <>{children}</>;
  };

  // Admin route component props interface
  interface AdminRouteProps {
    children: ReactNode;
  }

  // Admin route component
  const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>;
  };

  // Render the routes
  return (
    <Routes>
      <Route path="/" element={<GuestScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/guest" element={<GuestScreen />} />

      <Route
        path="/home"
        element={<ProtectedRoute><HomeScreen /></ProtectedRoute>}
      />

      <Route
        path="/events"
        element={<ProtectedRoute><EventListScreen /></ProtectedRoute>}
      />

      <Route
        path="/events/:eventId"
        element={<ProtectedRoute><EventDetailScreen /></ProtectedRoute>}
      />

      <Route
        path="/tasks"
        element={<ProtectedRoute requiredRole="organizer"><OrganizerTaskScreen /></ProtectedRoute>}
      />

      <Route
        path="/tasks/:taskId"
        element={<ProtectedRoute requiredRole="organizer"><TaskDetailScreen /></ProtectedRoute>}
      />

      <Route
        path="/tasks/:taskId/logs"
        element={<ProtectedRoute requiredRole="organizer"><TaskLogScreen /></ProtectedRoute>}
      />

      <Route
        path="/admin"
        element={<AdminRoute><AdminAnalyticsScreen /></AdminRoute>}
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

// Main App component with proper provider nesting
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MusicPlayerProvider>
          <AppContent />
        </MusicPlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;