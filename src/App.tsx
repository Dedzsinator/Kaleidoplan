import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './app/contexts/AuthContext';
import ProtectedRoute from './app/components/user/ProtectedRoute';

import Home from './app/screen/HomeScreen';
import GuestScreen from './app/screen/GuestScreen';
import Login from './app/screen/LoginScreen';
import Register from './app/screen/RegisterScreen';
import Dashboard from './app/screen/DashboardScreen';
import OrganizerDashboard from './app/screen/OrganizerDashboardScreen';
import OrganizerTaskScreen from './app/screen/OrganizerTaskScreen';
import EventAnalytics from './app/screen/EventAnalyticsScreen';
import AdminPanel from './app/screen/AdminPanelScreen';
import UserManagement from './app/screen/UserManagementScreen';
import EventManagement from './app/screen/EventManagementScreen';

// Import Firebase configuration to ensure it's initialized
import './app/config/firebase';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<GuestScreen />} />
          <Route path="/home" element={<Home />} />
          <Route path="/events" element={<GuestScreen />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes - any authenticated user */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Organizer routes */}
          <Route
            path="/organizer"
            element={
              <ProtectedRoute requiredRole="organizer">
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/tasks" element={<OrganizerTaskScreen />} />

          <Route
            path="/analytics/:eventId"
            element={
              <ProtectedRoute requiredRole="organizer">
                <EventAnalytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/manage"
            element={
              <ProtectedRoute requiredRole="organizer">
                <EventManagement />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <UserManagement />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
