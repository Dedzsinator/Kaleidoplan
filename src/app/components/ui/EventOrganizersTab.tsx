import React, { useState, useEffect, useCallback } from 'react';
import api from '@services/api';
import { getAllUsers, updateUserRole } from '@services/userService';
import { assignOrganizerToEvent, getEventsWithOrganizers } from '@services/adminService';
import '../../styles/EventOrganizersTab.css';
// Use the main Event and User types directly
import { Event, User } from '@models/types';

const getUserId = (user: User): string => {
  return user.id;
};

// Helper function to safely get an event ID (handles _id, id)
// Ensures a non-undefined string is returned for use cases needing it
const getEventId = (event: Event | { _id?: string; id?: string }): string => {
  return event.id || event._id || '';
};

// Helper function to normalize event IDs for consistent lookup (e.g., in assignments map)
const normalizeEventId = (eventId: string | number | undefined | null): string => {
  const idStr = String(eventId || '').trim();
  // For MongoDB ObjectIDs (24-character hex strings), ensure consistent format
  if (idStr.match(/^[0-9a-f]{24}$/i)) {
    return idStr.toLowerCase();
  }
  return idStr;
};

export const EventOrganizersTab: React.FC = () => {
  // State uses the main Event and User types
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Keep selected IDs as strings, ensure they are never undefined when used
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [organizerAssignments, setOrganizerAssignments] = useState<{ [eventId: string]: string[] }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Memoize the assignment reload function
  const reloadOrganizerAssignments = useCallback(async () => {
    try {
      const response = await api.get('/admin/organizer-assignments');
      const normalizedAssignments: { [eventId: string]: string[] } = {};
      if (response && response.assignments) {
        Object.keys(response.assignments).forEach((key) => {
          normalizedAssignments[normalizeEventId(key)] = response.assignments[key];
        });
      }
      setOrganizerAssignments(normalizedAssignments);
    } catch (assignmentsError) {
      console.error('Error reloading organizer assignments:', assignmentsError);
      // Optionally set an error state here
    }
  }, []); // Empty dependency array means this function is created once

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(''); // Clear previous errors

        // Fetch raw data
        const [rawEventsData, rawUsersData] = await Promise.all([
          getEventsWithOrganizers(), // Assuming this returns data compatible with Event[]
          getAllUsers(), // Assuming this returns data compatible with User[]
        ]);

        // 1. Normalize Users: Ensure each user object conforms to the User type and has a definite 'id'
        const allNormalizedUsers: User[] = rawUsersData.map((user) => ({
          ...user, // Spread existing user data
          id: getUserId(user), // Ensure 'id' is set using the helper
          // Ensure other fields match the User type (handle nulls if necessary)
          email: user.email ?? null,
          displayName: user.displayName ?? null,
          photoURL: user.photoURL ?? null,
          role: user.role || 'user', // Default role if missing
        }));

        // 2. Normalize Events: Ensure each event object conforms to the Event type
        const normalizedEvents: Event[] = rawEventsData.map((event) => ({
          ...event, // Spread existing event data
          id: getEventId(event), // Ensure 'id' is set
          _id: event._id || getEventId(event), // Ensure _id is also present if needed
          normalizedId: normalizeEventId(event._id || event.id), // Add normalized ID for lookups
          // Ensure date fields are Date objects or valid strings if needed by Event type
          startDate: typeof event.startDate === 'string' ? new Date(event.startDate) : event.startDate,
          endDate: typeof event.endDate === 'string' ? new Date(event.endDate) : event.endDate,
          // Provide defaults for required fields if they might be missing
          name: event.name || 'Untitled Event',
          color: event.color || '#3357FF',
          status: event.status || 'upcoming',
        }));

        // 3. Fetch and Normalize Assignments
        await reloadOrganizerAssignments(); // Use the memoized function

        // Separate users by role after normalization
        const organizers = allNormalizedUsers.filter((user) => user.role === 'organizer');
        const regularUsers = allNormalizedUsers.filter((user) => user.role !== 'organizer'); // More robust check

        // Update state with fully typed data
        setEvents(normalizedEvents);
        setUsers([...organizers, ...regularUsers]); // Keep consistent order
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    fetchData();
  }, [reloadOrganizerAssignments]); // Add reloadOrganizerAssignments as a dependency

  const handleAssignOrganizer = async () => {
    // Use the state variables directly (selectedEventId, selectedUserId)
    if (!selectedEventId || !selectedUserId) {
      setError('Please select both an event and a user.');
      return;
    }

    // Find the event and user objects using the selected IDs
    const selectedEventObj = events.find((e) => getEventId(e) === selectedEventId);
    const selectedUserObj = users.find((u) => getUserId(u) === selectedUserId);

    if (!selectedEventObj) {
      setError('Selected event not found. Please refresh.');
      return;
    }
    if (!selectedUserObj) {
      setError('Selected user not found. Please refresh.');
      return;
    }

    // Use the definite event ID for the API call
    const eventIdForApi = getEventId(selectedEventObj); // Use helper to ensure it's a string

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Ensure user has organizer role if they don't already
      if (selectedUserObj.role !== 'organizer') {
        await updateUserRole(selectedUserId, 'organizer');
        // Optimistically update local state or refetch users
        setUsers((prevUsers) =>
          prevUsers.map((u) => (getUserId(u) === selectedUserId ? { ...u, role: 'organizer' } : u)),
        );
      }

      // Attempt to assign
      await assignOrganizerToEvent(eventIdForApi, selectedUserId);

      // Reload assignments and clear selections on success
      await reloadOrganizerAssignments();
      setSelectedEventId('');
      setSelectedUserId('');
      setSuccess('Organizer assigned successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      // Handle specific "already organizer" case gracefully
      if (err instanceof Error && err.message.includes('already an organizer')) {
        setSuccess('This user is already an organizer for this event.');
        // Ensure local assignments reflect this state if needed
        const normalizedEventLookupId = normalizeEventId(eventIdForApi);
        if (!organizerAssignments[normalizedEventLookupId]?.includes(selectedUserId)) {
          await reloadOrganizerAssignments(); // Reload to be sure
        }
        setSelectedEventId('');
        setSelectedUserId('');
      } else {
        setError(`Failed to assign organizer: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOrganizer = async (eventIdToRemoveFrom: string, userIdToRemove: string) => {
    // Ensure eventIdToRemoveFrom is a valid string ID
    if (!eventIdToRemoveFrom) {
      setError('Invalid event ID provided for removal.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Call API to remove assignment
      await assignOrganizerToEvent(eventIdToRemoveFrom, userIdToRemove, 'remove');

      // Reload assignments and show success
      await reloadOrganizerAssignments();
      setSuccess('Organizer removed successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error removing organizer:', err);
      setError(`Failed to remove organizer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtering logic remains largely the same, but uses helpers
  const filteredEvents = events.filter((event) => (event.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredUsers = users.filter(
    (user) =>
      (user.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (user.displayName || '').toLowerCase().includes(userSearchTerm.toLowerCase()),
  );

  // Helper to get display name, uses the main User type
  const getOrganizerName = (userId: string): string => {
    const user = users.find((u) => getUserId(u) === userId);
    return user ? user.displayName || user.email || 'Unknown User' : 'Unknown User';
  };

  // --- JSX Rendering ---
  // Uses helpers like getEventId and getUserId where necessary

  return (
    <div className="event-organizers-tab">
      <h2>Assign Organizers to Events</h2>
      <p className="tab-description">
        Assign users as organizers to specific events. Organizers can manage details, content, and settings for their
        assigned events.
      </p>

      {/* Error/Success Messages */}
      {error && (
        <div className="error-message-container">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <div className="error-title">Error</div>
            <div className="error-details">{error}</div>
          </div>
        </div>
      )}
      {success && <div className="success-message">{success}</div>}

      {/* Assignment Section */}
      <div className="assignment-section">
        {/* Event Selection */}
        <div className="event-selection">
          <h3>Select Event</h3>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="events-list">
            {loading ? (
              <div className="loading-spinner">Loading events...</div>
            ) : filteredEvents.length === 0 ? (
              <p className="no-results">No events found</p>
            ) : (
              filteredEvents.map((event) => {
                const eventId = getEventId(event); // Get definite string ID
                return (
                  <div
                    key={eventId} // Use definite ID
                    className={`event-item ${selectedEventId === eventId ? 'selected' : ''}`}
                    onClick={() => setSelectedEventId(eventId)} // Use definite ID
                  >
                    <div className="event-color" style={{ backgroundColor: event.color || '#3357FF' }}></div>
                    <div className="event-details">
                      <div className="event-name">{event.name}</div>
                      <div className="event-date">
                        {event.startDate instanceof Date
                          ? event.startDate.toLocaleDateString()
                          : new Date(event.startDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* User Selection */}
        <div className="user-selection">
          <h3>Select User</h3>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search users..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
            />
          </div>
          <div className="users-list">
            {loading ? (
              <div className="loading-spinner">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <p className="no-results">No users found</p>
            ) : (
              <>
                {/* Organizers Group */}
                <div className="user-group-header">Organizers</div>
                {filteredUsers.filter((user) => user.role === 'organizer').length === 0 ? (
                  <p className="no-results-subgroup">No organizers found</p>
                ) : (
                  filteredUsers
                    .filter((user) => user.role === 'organizer')
                    .map((user) => {
                      const userId = getUserId(user); // Get definite string ID
                      return (
                        <div
                          key={userId} // Use definite ID
                          className={`user-item ${selectedUserId === userId ? 'selected' : ''}`}
                          onClick={() => setSelectedUserId(userId)} // Use definite ID
                        >
                          <div className="user-avatar">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.displayName || 'User'} />
                            ) : (
                              <div className="avatar-placeholder">
                                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="user-details">
                            <div className="user-name">{user.displayName || 'Unnamed User'}</div>
                            <div className="user-email">{user.email || 'No email'}</div>
                            <div className="user-role organizer-badge">Organizer</div>
                          </div>
                        </div>
                      );
                    })
                )}

                {/* Regular Users Group */}
                <div className="user-group-header">Regular Users</div>
                {filteredUsers.filter((user) => user.role !== 'organizer').length === 0 ? (
                  <p className="no-results-subgroup">No regular users found</p>
                ) : (
                  filteredUsers
                    .filter((user) => user.role !== 'organizer')
                    .map((user) => {
                      const userId = getUserId(user); // Get definite string ID
                      return (
                        <div
                          key={userId} // Use definite ID
                          className={`user-item ${selectedUserId === userId ? 'selected' : ''}`}
                          onClick={() => setSelectedUserId(userId)} // Use definite ID
                        >
                          <div className="user-avatar">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.displayName || 'User'} />
                            ) : (
                              <div className="avatar-placeholder">
                                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="user-details">
                            <div className="user-name">{user.displayName || 'Unnamed User'}</div>
                            <div className="user-email">{user.email || 'No email'}</div>
                            <div className="user-role user-badge">Will be promoted to Organizer</div>
                          </div>
                        </div>
                      );
                    })
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="assign-button"
          disabled={!selectedEventId || !selectedUserId || loading}
          onClick={handleAssignOrganizer}
        >
          {loading ? 'Processing...' : 'Assign Organizer to Event'}
        </button>
      </div>

      {/* Current Assignments */}
      <div className="current-assignments">
        <h3>Current Organizer Assignments</h3>
        {loading ? (
          <div className="loading-spinner">Loading assignments...</div>
        ) : events.length === 0 ? (
          <p className="no-results">No events available</p>
        ) : (
          events.map((event) => {
            const eventId = getEventId(event); // Definite ID for key
            const normalizedLookupId = normalizeEventId(eventId); // Normalized for assignment lookup
            const assignments = organizerAssignments[normalizedLookupId] || [];

            return (
              <div key={eventId} className="event-assignment">
                <div className="event-header">
                  <div className="event-color" style={{ backgroundColor: event.color || '#3357FF' }}></div>
                  <h4 className="event-name">{event.name}</h4>
                </div>
                <div className="organizers-list">
                  {assignments.length === 0 ? (
                    <p className="no-organizers">No organizers assigned</p>
                  ) : (
                    assignments.map((organizerId) => (
                      <div key={organizerId} className="organizer-item">
                        <span className="organizer-name">{getOrganizerName(organizerId)}</span>
                        <button
                          className="remove-button"
                          onClick={() => handleRemoveOrganizer(eventId, organizerId)} // Pass definite event ID
                          title="Remove organizer"
                          disabled={loading} // Disable while loading
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
