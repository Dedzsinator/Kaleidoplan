import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth, UserRole } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, redirectTo = '/login' }) => {
  const { currentUser, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    // Redirect to login, but remember where they were trying to go
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  // Check role requirements if specified
  if (requiredRole && currentUser) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Check if user has one of the required roles
    if (!requiredRoles.includes(currentUser.role)) {
      // If admin route, redirect to home instead of showing forbidden
      if (requiredRoles.includes('admin')) {
        return <Navigate to="/" replace />;
      }

      // For other roles, show forbidden page
      return (
        <div className="forbidden-container">
          <h1>Access Denied</h1>
          <p>You don't have permission to access this page.</p>
          <p>Required role: {requiredRoles.join(' or ')}</p>
          <p>Your role: {currentUser.role}</p>
          <button onClick={() => window.history.back()}>Go Back</button>
        </div>
      );
    }
  }

  // If all checks pass, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
