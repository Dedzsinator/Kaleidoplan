import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../../services/api';
import '../styles/DashboardScreen.css';
import { Event, UserEvent } from '../models/types';

const DashboardScreen: React.FC = () => {
  // Update all relevant state types to UserEvent
  const { currentUser, isOrganizer, isAdmin, refreshUserToken } = useAuth();
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<UserEvent[]>([]);
  const [interestedEvents, setInterestedEvents] = useState<UserEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Now use refreshUserToken from the destructured values
  const checkAdminRole = async () => {
    try {
      await refreshUserToken(); // Use the function from the top-level hook call
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError('');

      try {
        // Add /api prefix to match server-side routes
        const userEventsResponse = await api.get('/user/events');

        // Properly cast the response to UserEvent[]
        const events = (userEventsResponse.events || []) as UserEvent[];

        if (events.length > 0) {
          setUserEvents(events);

          // Filter events by interest level
          setAttendingEvents(events.filter((event) => event.interestLevel === 'attending'));
          setInterestedEvents(events.filter((event) => event.interestLevel === 'interested'));
        } else {
          setUserEvents([]);
          setAttendingEvents([]);
          setInterestedEvents([]);
        }
      } catch (eventsError) {
        console.error('Error fetching user events:', eventsError);
        setUserEvents([]);
        setAttendingEvents([]);
        setInterestedEvents([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
    } catch (error: unknown) {
      console.error('Error setting admin role:', error);
      alert(`Error setting admin role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const renderEventList = (events: (Event | UserEvent)[], emptyMessage: string) => {
    if (events.length === 0) {
      return (
        <div className="empty-state">
          <p>{emptyMessage}</p>
          <Link to="/events" className="action-button">
            Browse Events
          </Link>
        </div>
      );
    }

    return (
      <div className="events-grid">
        {events.map((event) => (
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
    );
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

      {/* Attending Events Section */}
      <div className="dashboard-section">
        <h3>Events You're Attending</h3>
        {loading ? (
          <div className="loading-spinner">Loading your events...</div>
        ) : (
          renderEventList(attendingEvents, "You haven't marked any events as attending yet.")
        )}
      </div>

      {/* Interested Events Section */}
      <div className="dashboard-section">
        <h3>Events You're Interested In</h3>
        {loading ? (
          <div className="loading-spinner">Loading your events...</div>
        ) : (
          renderEventList(interestedEvents, "You haven't marked any events as interested yet.")
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
