import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../../services/api';
import '../styles/EventManagementScreen.css';

interface ManagedEvent {
  _id: string;
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: string;
  location?: string;
  coverImageUrl?: string;
  attendeeCount: number;
  published: boolean;
}

const EventManagementScreen: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ManagedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const navigate = useNavigate();

  // Fetch managed events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError('');

        // Admin can see all events, organizers only see their managed events
        const endpoint = isAdmin ? '/api/events/all' : '/api/events/managed';
        const response = await fetchWithAuth(endpoint);

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        setEvents(data.events || []);
        setFilteredEvents(data.events || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [isAdmin]);

  // Filter events based on status and search term
  useEffect(() => {
    let result = [...events];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((event) => event.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (event) =>
          event.name.toLowerCase().includes(term) ||
          (event.description && event.description.toLowerCase().includes(term)) ||
          (event.location && event.location.toLowerCase().includes(term)),
      );
    }

    setFilteredEvents(result);
  }, [events, statusFilter, searchTerm]);

  // Handle event selection for bulk actions
  const handleSelectEvent = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter((id) => id !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  // Select/deselect all events
  const handleSelectAll = () => {
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(filteredEvents.map((event) => event._id));
    }
  };

  // Delete an event
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      // Remove event from state
      setEvents(events.filter((event) => event._id !== eventId));
      setSelectedEvents(selectedEvents.filter((id) => id !== eventId));
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  // Bulk delete events
  const handleBulkDelete = async () => {
    if (selectedEvents.length === 0) return;

    if (
      !window.confirm(`Are you sure you want to delete ${selectedEvents.length} events? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      const response = await fetchWithAuth('/api/events/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventIds: selectedEvents }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete events');
      }

      // Remove deleted events from state
      setEvents(events.filter((event) => !selectedEvents.includes(event._id)));
      setSelectedEvents([]);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  // Toggle event publish status
  const handleTogglePublish = async (eventId: string, currentStatus: boolean) => {
    try {
      const response = await fetchWithAuth(`/api/events/${eventId}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update event status');
      }

      // Update event in state
      setEvents(
        events.map((event) => {
          if (event._id === eventId) {
            return { ...event, published: !currentStatus };
          }
          return event;
        }),
      );
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <div className="event-management-container">
      <div className="management-header">
        <h1>Event Management</h1>
        <Link to="/events/create" className="create-event-button">
          Create New Event
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="management-tools">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
            <option value="all">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {selectedEvents.length > 0 && (
          <div className="bulk-actions">
            <span>{selectedEvents.length} events selected</span>
            <button className="bulk-delete-button" onClick={handleBulkDelete}>
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-spinner">Loading events...</div>
      ) : filteredEvents.length > 0 ? (
        <div className="events-table-container">
          <table className="events-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedEvents.length === filteredEvents.length && filteredEvents.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Event</th>
                <th>Status</th>
                <th>Date</th>
                <th>Location</th>
                <th>Attendees</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event._id)}
                      onChange={() => handleSelectEvent(event._id)}
                    />
                  </td>
                  <td>
                    <div className="event-info">
                      {event.coverImageUrl && (
                        <img src={event.coverImageUrl} alt={event.name} className="event-thumbnail" />
                      )}
                      <div>
                        <div className="event-name">{event.name}</div>
                        <div className="event-id">ID: {event.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${event.status}`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                  </td>
                  <td>{event.location || 'Online'}</td>
                  <td>{event.attendeeCount}</td>
                  <td>
                    <div className="publish-toggle">
                      <input
                        type="checkbox"
                        checked={event.published}
                        onChange={() => handleTogglePublish(event._id, event.published)}
                        id={`publish-${event._id}`}
                        className="toggle-checkbox"
                      />
                      <label htmlFor={`publish-${event._id}`} className="toggle-label"></label>
                    </div>
                  </td>
                  <td>
                    <div className="event-actions">
                      <Link to={`/events/edit/${event.id}`} className="edit-link">
                        Edit
                      </Link>
                      <Link to={`/analytics/${event.id}`} className="analytics-link">
                        Analytics
                      </Link>
                      <button className="delete-button" onClick={() => handleDeleteEvent(event._id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-events">
          <p>No events found matching your criteria.</p>
          {statusFilter !== 'all' || searchTerm ? (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSearchTerm('');
              }}
            >
              Clear Filters
            </button>
          ) : (
            <Link to="/events/create" className="create-link">
              Create your first event
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default EventManagementScreen;
