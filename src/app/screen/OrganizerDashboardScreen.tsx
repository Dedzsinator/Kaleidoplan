import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../../services/api';
import '../styles/DashboardScreen.css';

interface ManagedEvent {
    _id: string;
    id: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    status: string;
    attendeeCount: number;
    location?: string;
}

const OrganizerDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const [managedEvents, setManagedEvents] = useState<ManagedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchManagedEvents = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await fetchWithAuth('/api/events/managed');

                if (!response.ok) {
                    throw new Error('Failed to fetch managed events');
                }

                const data = await response.json();
                setManagedEvents(data.events || []);
            } catch (err: any) {
                setError(err.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchManagedEvents();
    }, []);

    return (
        <div className="dashboard-container organizer-dashboard">
            <h1>Organizer Dashboard</h1>
            <h2>Welcome, {currentUser?.displayName || 'Organizer'}</h2>

            {error && <div className="error-message">{error}</div>}

            <div className="dashboard-summary">
                <div className="summary-card">
                    <h3>Managed Events</h3>
                    <p className="summary-value">{managedEvents.length}</p>
                </div>

                <div className="summary-card">
                    <h3>Total Attendees</h3>
                    <p className="summary-value">
                        {managedEvents.reduce((total, event) => total + (event.attendeeCount || 0), 0)}
                    </p>
                </div>

                <div className="summary-card">
                    <h3>Active Events</h3>
                    <p className="summary-value">
                        {managedEvents.filter(event => event.status === 'ongoing').length}
                    </p>
                </div>
            </div>

            <div className="action-buttons">
                <Link to="/events/create" className="create-button">Create New Event</Link>
            </div>

            <h2>Your Events</h2>

            {loading ? (
                <div className="loading-spinner">Loading events...</div>
            ) : (
                <div className="event-list">
                    {managedEvents.length === 0 ? (
                        <p>You don't have any events to manage yet.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Event Name</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Attendees</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managedEvents.map(event => (
                                    <tr key={event._id}>
                                        <td>{event.name}</td>
                                        <td>
                                            <span className={`status-badge ${event.status}`}>
                                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                                        </td>
                                        <td>{event.attendeeCount || 0}</td>
                                        <td>
                                            <div className="action-links">
                                                <Link to={`/events/edit/${event.id}`} className="edit-link">Edit</Link>
                                                <Link to={`/analytics/${event.id}`} className="analytics-link">Analytics</Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrganizerDashboard;