import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../../services/api';
import '../styles/DashboardScreen.css';
import { Event } from '../models/types';

const DashboardScreen: React.FC = () => {
    const { currentUser, isOrganizer, isAdmin } = useAuth();
    const [userEvents, setUserEvents] = useState<Event[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                setError('');

                // Fetch user's registered events
                const registeredResponse = await fetchWithAuth('/api/user/events');

                if (!registeredResponse.ok) {
                    throw new Error('Failed to fetch your registered events');
                }

                const registeredData = await registeredResponse.json();
                setUserEvents(registeredData.events || []);

                // Fetch upcoming events
                const upcomingResponse = await fetchWithAuth('/api/events?status=upcoming&limit=5');

                if (!upcomingResponse.ok) {
                    throw new Error('Failed to fetch upcoming events');
                }

                const upcomingData = await upcomingResponse.json();
                setUpcomingEvents(upcomingData.events || []);

            } catch (err: any) {
                setError(err.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    return (
        <div className="dashboard-container">
            <h1>Dashboard</h1>
            <h2>Welcome, {currentUser?.displayName || 'User'}</h2>

            {error && <div className="error-message">{error}</div>}

            {/* Role-specific notices and shortcuts */}
            {isAdmin && (
                <div className="role-notice admin">
                    <p>You have admin privileges. Access the admin panel for site management.</p>
                    <Link to="/admin" className="role-action-button">Admin Panel</Link>
                </div>
            )}

            {isOrganizer && !isAdmin && (
                <div className="role-notice organizer">
                    <p>You are an event organizer. Manage your events from the organizer dashboard.</p>
                    <Link to="/organizer" className="role-action-button">Organizer Dashboard</Link>
                </div>
            )}

            <div className="dashboard-section">
                <h3>Your Registered Events</h3>
                {loading ? (
                    <div className="loading-spinner">Loading your events...</div>
                ) : userEvents.length > 0 ? (
                    <div className="events-grid">
                        {userEvents.map(event => (
                            <div key={event.id} className="event-card">
                                <div className="event-image">
                                    {event.coverImageUrl && (
                                        <img src={event.coverImageUrl} alt={event.name} />
                                    )}
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
                                    <Link to={`/events/${event.id}`} className="event-link">View Details</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>You haven't registered for any events yet.</p>
                        <Link to="/events" className="action-button">Browse Events</Link>
                    </div>
                )}
            </div>

            <div className="dashboard-section">
                <h3>Upcoming Events</h3>
                {loading ? (
                    <div className="loading-spinner">Loading events...</div>
                ) : upcomingEvents.length > 0 ? (
                    <div className="events-grid">
                        {upcomingEvents.map(event => (
                            <div key={event.id} className="event-card">
                                <div className="event-image">
                                    {event.coverImageUrl && (
                                        <img src={event.coverImageUrl} alt={event.name} />
                                    )}
                                </div>
                                <div className="event-content">
                                    <h4>{event.name}</h4>
                                    <p className="event-date">
                                        {new Date(event.startDate).toLocaleDateString()}
                                    </p>
                                    <p className="event-location">{event.location}</p>
                                    <Link to={`/events/${event.id}`} className="event-link">View Details</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No upcoming events at this time.</p>
                )}

                <div className="view-all">
                    <Link to="/events" className="view-all-link">View All Events</Link>
                </div>
            </div>

            <div className="dashboard-section">
                <h3>Account Settings</h3>
                <div className="account-actions">
                    <Link to="/profile" className="account-action-button">Edit Profile</Link>
                    <Link to="/settings" className="account-action-button">Preferences</Link>
                    <Link to="/notifications" className="account-action-button">Notifications</Link>
                </div>
            </div>
        </div>
    );
};

export default DashboardScreen;