import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './app/contexts/AuthContext';
import { NotificationProvider } from './app/contexts/NotificationContext';
import { QueryProvider } from './app/contexts/QueryContext';
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
import EventDetailScreen from './app/screen/EventDetailScreen';
import ConfirmationPage from './app/components/user/ConfirmationPage';
import SpotifyCallback from './app/components/actions/SpotifyCallback';
import { EventSubscriptionProvider } from './app/components/actions/EventSubscription';

// Import Firebase configuration to ensure it's initialized
import './app/config/firebase';

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <NotificationProvider>
          <EventSubscriptionProvider>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<GuestScreen />} />
                <Route path="/home" element={<Home />} />
                <Route path="/events" element={<GuestScreen />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/events/:eventId" element={<EventDetailScreen />} />
                <Route path="/confirm-subscription/:token" element={<ConfirmationPage />} />
                <Route path="/spotify-callback" element={<SpotifyCallback />} />

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
                  path="/admin/user"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </EventSubscriptionProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
