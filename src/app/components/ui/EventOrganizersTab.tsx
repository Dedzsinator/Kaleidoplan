import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { getAllUsers, updateUserRole } from '../../../services/userService';
import { assignOrganizerToEvent, getEventsWithOrganizers } from '../../../services/adminService';
import '../../styles/EventOrganizersTab.css';
import { Event, User } from '../../models/types';

export const EventOrganizersTab: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [organizerAssignments, setOrganizerAssignments] = useState<{ [eventId: string]: string[] }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');

  const normalizeEventId = (eventId: string | any): string => {
    // Convert to string and trim whitespace
    const idStr = String(eventId || '').trim();

    // For MongoDB ObjectIDs (24-character hex strings), ensure consistent format
    if (idStr.match(/^[0-9a-f]{24}$/i)) {
      return idStr.toLowerCase();
    }

    return idStr;
  };

  const getUserId = (user: any): string => {
    // Firebase uses uid, MongoDB might use _id, and your frontend might use id
    return user.uid || user._id || user.id || '';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching events and users...');

        // Use the updated service that explicitly requests organizer info
        const [eventsData, usersData] = await Promise.all([
          getEventsWithOrganizers(),
          getAllUsers()
        ]);

        console.log('Events data received:', eventsData);
        console.log('Users data received:', usersData);

        let assignments: { [eventId: string]: string[] } = {};

        try {
          const organizerAssignmentsResponse = await api.get('/admin/organizer-assignments');
          console.log('Organizer assignments response:', organizerAssignmentsResponse);

          // Normalize all assignment keys for consistent lookup
          if (organizerAssignmentsResponse && organizerAssignmentsResponse.assignments) {
            Object.keys(organizerAssignmentsResponse.assignments).forEach(eventId => {
              const normalizedId = normalizeEventId(eventId);
              assignments[normalizedId] = organizerAssignmentsResponse.assignments[eventId];
            });
          }
        } catch (assignmentsError) {
          console.error('Error fetching organizer assignments:', assignmentsError);
        }

        console.log('Final normalized organizer assignments:', assignments);

        // Add this debugging to see the ID mismatch
        console.log('Available keys in assignments:', Object.keys(assignments));

        // Rest of your function remains the same
        const allNormalizedUsers = usersData.map((user: any) => ({
          ...user,
          id: getUserId(user)
        }));

        // Also normalize the event IDs to be consistent
        const normalizedEvents = eventsData.map((event: any) => {
          const normalizedId = normalizeEventId(event._id || event.id);
          return {
            ...event,
            id: event.id || event._id,
            _id: event._id || event.id,
            // Add a normalized ID for consistent lookup
            normalizedId
          };
        });

        console.log('Normalized events:', normalizedEvents.map((e: Event) => ({
          id: e.id,
          _id: e._id,
          normalizedId: e.normalizedId,
          name: e.name
        })));

        const organizers = allNormalizedUsers.filter(user => user.role === 'organizer');
        const regularUsers = allNormalizedUsers.filter(user => user.role === 'user');

        // Use the normalized events instead
        setEvents(normalizedEvents);
        setUsers([...organizers, ...regularUsers]);
        setOrganizerAssignments(assignments);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAssignOrganizer = async () => {
    if (!selectedEvent || !selectedUser) {
      setError('Please select both an event and a user.');
      return;
    }

    try {
      setLoading(true);
      setError(''); // Clear any previous errors

      // Find the complete event object to get the MongoDB _id
      const selectedEventObj = events.find(e => e.id === selectedEvent);

      if (!selectedEventObj) {
        setError('Selected event no longer exists.');
        setLoading(false);
        return;
      }

      // Use MongoDB _id if available (for proper ObjectId format), otherwise fall back to id
      const eventIdForApi = selectedEventObj._id || selectedEventObj.id;
      const isDraftEvent = selectedEventObj?.status === 'draft';

      console.log(`Assigning user ${selectedUser} to ${isDraftEvent ? 'draft' : 'published'} event ${eventIdForApi}`);

      // First ensure user has organizer role
      const selectedUserObj = users.find(user => getUserId(user) === selectedUser);
      console.log('Selected user object:', selectedUserObj);

      if (selectedUserObj && selectedUserObj.role !== 'organizer') {
        console.log(`Updating role of user ${selectedUser} to organizer`);
        await updateUserRole(selectedUser, 'organizer');
      }

      // Then assign to event with the proper MongoDB ID
      console.log(`Making API call to assign user ${selectedUser} to event ${eventIdForApi}`);
      try {
        await assignOrganizerToEvent(eventIdForApi, selectedUser);

        // After successful assignment, reload all assignments from server
        await reloadOrganizerAssignments();

        setSelectedEvent('');
        setSelectedUser('');
        setSuccess('Organizer assigned successfully!');
      } catch (assignError) {
        console.error('Error in assignOrganizerToEvent:', assignError);
        if (assignError instanceof Error && assignError.message.includes('already an organizer')) {
          // This is actually a success case - the user is already an organizer
          setSuccess('This user is already an organizer for this event.');

          // Still update the UI if needed
          if (!organizerAssignments[selectedEvent]?.includes(selectedUser)) {
            setOrganizerAssignments(prev => ({
              ...prev,
              [selectedEvent]: [...(prev[selectedEvent] || []), selectedUser]
            }));
          }

          setSelectedEvent('');
          setSelectedUser('');
        } else {
          // Real error
          throw assignError;
        }
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error assigning organizer:', err);
      // Display more specific error message
      if (err instanceof Error) {
        setError(`Failed to assign organizer: ${err.message}`);
      } else {
        setError('Failed to assign organizer. Please check the server logs for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOrganizer = async (eventId: string, userId: string) => {
    try {
      setLoading(true);

      // Find the event to get the proper MongoDB _id
      const eventObj = events.find(e => e.id === eventId);
      if (!eventObj) {
        setError('Event not found. Please refresh the page.');
        setLoading(false);
        return;
      }

      // Use _id if available, otherwise fall back to id
      const eventIdForApi = eventObj._id || eventObj.id;

      await assignOrganizerToEvent(eventIdForApi, userId, 'remove');

      // After successful removal, reload all assignments from server
      await reloadOrganizerAssignments();

      setSuccess('Organizer removed successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error removing organizer:', err);
      setError('Failed to remove organizer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reloadOrganizerAssignments = async () => {
    try {
      // Fetch fresh organizer assignments from the server
      const organizerAssignmentsResponse = await api.get('/admin/organizer-assignments');

      if (organizerAssignmentsResponse && organizerAssignmentsResponse.assignments) {
        setOrganizerAssignments(organizerAssignmentsResponse.assignments);
        console.log('Reloaded organizer assignments:', organizerAssignmentsResponse.assignments);
      }
    } catch (assignmentsError) {
      console.error('Error reloading organizer assignments:', assignmentsError);
    }
  };

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
  (user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  const getOrganizerName = (userId: string) => {
    const user = users.find(u => getUserId(u) === userId);
    return user ? (user.displayName || user.email) : 'Unknown User';
  };

  return (
    <div className="event-organizers-tab">
      <h2>Assign Organizers to Events</h2>
      <p className="tab-description">
        Assign users as organizers to specific events. Organizers can manage details, content, and settings for their assigned events.
      </p>

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

      <div className="assignment-section">
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
              filteredEvents.map(event => (
                <div
                  key={event.id}
                  className={`event-item ${selectedEvent === event.id ? 'selected' : ''}`}
                  onClick={() => setSelectedEvent(event.id)}
                >
                  <div className="event-color" style={{ backgroundColor: event.color || '#3357FF' }}></div>
                  <div className="event-details">
                    <div className="event-name">{event.name}</div>
                    <div className="event-date">
                      {new Date(event.startDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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
                {filteredUsers.filter(user => user.role === 'organizer').length === 0 ? (
                  <p className="no-results-subgroup">No organizers found</p>
                ) : (
                  filteredUsers
                    .filter(user => user.role === 'organizer')
                    .map(user => (
                      <div
                        key={getUserId(user)}
                        className={`user-item ${selectedUser === getUserId(user) ? 'selected' : ''}`}
                        onClick={() => setSelectedUser(getUserId(user))}
                      >
                        <div className="user-avatar">
                          {user.photoURL ? (
                            <img src={user.photoURL || undefined} alt={"DISP"} />
                          ) : (
                            <div className="avatar-placeholder">
                              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.displayName || 'Unnamed User'}</div>
                          <div className="user-email">{user.email}</div>
                          <div className="user-role organizer-badge">Organizer</div>
                        </div>
                      </div>
                    ))
                )}

                {/* Regular Users Group - can be promoted to organizers */}
                <div className="user-group-header">Regular Users</div>
                {filteredUsers.filter(user => user.role === 'user').length === 0 ? (
                  <p className="no-results-subgroup">No regular users found</p>
                ) : (
                  filteredUsers
                    .filter(user => user.role === 'user')
                    .map(user => (
                      <div
                        key={getUserId(user)}
                        className={`user-item ${selectedUser === getUserId(user) ? 'selected' : ''}`}
                        onClick={() => setSelectedUser(getUserId(user))}
                      >
                        <div className="user-avatar">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={"DISP"} />
                          ) : (
                            <div className="avatar-placeholder">
                              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.displayName || 'Unnamed User'}</div>
                          <div className="user-email">{user.email}</div>
                          <div className="user-role user-badge">Will be promoted to Organizer</div>
                        </div>
                      </div>
                    ))
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="assign-button"
          disabled={!selectedEvent || !selectedUser || loading}
          onClick={handleAssignOrganizer}
        >
          {loading ? 'Processing...' : 'Assign Organizer to Event'}
        </button>
      </div>

      <div className="current-assignments">
        <h3>Current Organizer Assignments</h3>
        {events.length === 0 ? (
          <p className="no-results">No events available</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="event-assignment">
              <div className="event-header">
                <div className="event-color" style={{ backgroundColor: event.color || '#3357FF' }}></div>
                <h4 className="event-name">{event.name}</h4>
              </div>

              <div className="organizers-list">
                {(() => {
                  // Get event ID in multiple formats to ensure a match
                  const eventId = event.id;
                  const mongoId = event._id;
                  const normalizedId = event.normalizedId || normalizeEventId(eventId);

                  // Try multiple formats of the ID to find assignments
                  const assignments =
                    organizerAssignments[normalizedId] ||
                    organizerAssignments[eventId] ||
                    [];

                  // Log each event with its assignments to debug
                  console.log(`Event ${event.name}:`, {
                    eventId,
                    mongoId,
                    normalizedId,
                    hasAssignments: assignments.length > 0,
                    assignments
                  });

                  return assignments.length === 0 ? (
                    <p className="no-organizers">No organizers assigned</p>
                  ) : (
                    assignments.map(organizerId => (
                      <div key={organizerId} className="organizer-item">
                        <span className="organizer-name">{getOrganizerName(organizerId)}</span>
                        <button
                          className="remove-button"
                          onClick={() => handleRemoveOrganizer(event.id, organizerId)}
                          title="Remove organizer"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  );
                })()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
