import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../../services/api';
import '../styles/DashboardScreen.css';
import { Event } from '../models/types';

const DashboardScreen: React.FC = () => {
  // Call all hooks at the top level of the component
  const { currentUser, isOrganizer, isAdmin, refreshUserToken } = useAuth();
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Now use refreshUserToken from the destructured values
  const checkAdminRole = async () => {
    try {
      await refreshUserToken(); // Use the function from the top-level hook call
      console.log('Current user after refresh:', currentUser);
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError('');

      try {
        // First try to get events user is registered for (this might fail with 403)
        const registeredData = await api.get('/user/events').catch(err => {
          console.log('User events not accessible, using empty list', err);
          return { events: [] }; // Return empty array if endpoint fails
        });

        setUserEvents(registeredData.events || []);
      } catch (eventsError) {
        console.error('Error fetching registered events:', eventsError);
        setUserEvents([]);
      }

      // This events endpoint works fine
      try {
        const upcomingData = await api.get('/events');
        setUpcomingEvents(upcomingData.events || upcomingData || []);
      } catch (upcomingError) {
        console.error('Error fetching upcoming events:', upcomingError);
        setUpcomingEvents([]);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const setAdminRole = async () => {
    try {
      // Use api.post instead
      const response = await api.post('/user/set-admin-role', {});

      alert('Admin role has been set. Please log out and log back in to refresh your token.');

      // Refresh user data immediately
      await refreshUserToken();

    } catch (error: any) {
      console.error('Error setting admin role:', error);
      alert(`Error setting admin role: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      <h2>Welcome, {currentUser?.displayName || 'User'}</h2>

      {error && <div className="error-message">{error}</div>}

      {/* Role-specific notices and shortcuts */}
      {isAdmin && (
        <div className="role-notice admin">
          <p>You have admin privileges. Access the admin panel for site management.</p>
          <Link to="/admin" className="role-action-button">
            Admin Panel
          </Link>
        </div>
      )}

      {isOrganizer && !isAdmin && (
        <div className="role-notice organizer">
          <p>You are an event organizer. Manage your events from the organizer dashboard.</p>
          <Link to="/organizer" className="role-action-button">
            Organizer Dashboard
          </Link>
        </div>
      )}

      <div className="dashboard-section">
        <h3>Your Registered Events</h3>
        {loading ? (
          <div className="loading-spinner">Loading your events...</div>
        ) : userEvents.length > 0 ? (
          <div className="events-grid">
            {userEvents.map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-image">
                  {event.coverImageUrl && <img src={event.coverImageUrl} alt={event.name} />}
                  <div className={`event-status ${event.status}`}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </div>
                </div>
                <div className="event-content">
                  <h4>{event.name}</h4>
                  <p className="event-date">
                    {new Date(event.startDate).toLocaleDateString()} to {new Date(event.endDate).toLocaleDateString()}
                  </p>
                  <p className="event-location">{event.location}</p>
                  <Link to={`/events/${event.id}`} className="event-link">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>You haven't registered for any events yet.</p>
            <Link to="/events" className="action-button">
              Browse Events
            </Link>
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h3>Account Settings</h3>
        <div className="account-actions">
          <Link to="/profile" className="account-action-button">
            Edit Profile
          </Link>
          <Link to="/settings" className="account-action-button">
            Preferences
          </Link>
          <Link to="/notifications" className="account-action-button">
            Notifications
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
