import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@services/api';

import { useAuth } from '../contexts/AuthContext';
import '../styles/AdminPanel.css';

interface UserData {
  _id: string;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  lastLogin: string;
  managedEvents: string[];
}

interface Event {
  _id: string;
  name: string;
}

const UserManagementScreen: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');

  // Fetch users
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');

        let url = `/user?page=${page}`;
        if (roleFilter) {
          url += `&role=${roleFilter}`;
        }

        const response = await fetchWithAuth(url);

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin, page, roleFilter]);

  // Fetch events for assigning to organizers
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetchWithAuth('/events');

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        setEvents(data.events || []);
      } catch (err: unknown) {
        console.error('Error fetching events:', err);
      }
    };

    fetchEvents();
  }, []);

  // Handle role change
  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetchWithAuth(`/user/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      // Update the user in the local state
      setUsers(
        users.map((user) => {
          if (user._id === userId) {
            return { ...user, role: newRole };
          }
          return user;
        }),
      );

      // If viewing the selected user, update that too
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Assign event to organizer
  const assignEvent = async (userId: string, eventId: string) => {
    if (!eventId) return;

    try {
      const response = await fetchWithAuth(`/user/${userId}/events/${eventId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to assign event');
      }

      const data = await response.json();

      // Update user in list
      setUsers(
        users.map((user) => {
          if (user._id === userId) {
            return {
              ...user,
              role: 'organizer',
              managedEvents: data.user.managedEvents,
            };
          }
          return user;
        }),
      );

      // Update selected user if needed
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser({
          ...selectedUser,
          role: 'organizer',
          managedEvents: data.user.managedEvents,
        });
      }

      // Reset selected event
      setSelectedEvent('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Remove event from organizer
  const removeEvent = async (userId: string, eventId: string) => {
    try {
      const response = await fetchWithAuth(`/user/${userId}/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove event');
      }

      const data = await response.json();

      // Update user in list
      setUsers(
        users.map((user) => {
          if (user._id === userId) {
            return {
              ...user,
              role: data.user.role,
              managedEvents: data.user.managedEvents,
            };
          }
          return user;
        }),
      );

      // Update selected user if needed
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser({
          ...selectedUser,
          role: data.user.role,
          managedEvents: data.user.managedEvents,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (!isAdmin) {
    return <div className="unauthorized-message">You need admin privileges to access this page.</div>;
  }

  return (
    <div className="admin-container">
      <h1>User Management</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-filters">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="user">Users</option>
          <option value="organizer">Organizers</option>
          <option value="admin">Admins</option>
        </select>

        <button onClick={() => setPage(1)}>Refresh</button>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading users...</div>
      ) : (
        <div className="admin-layout">
          <div className="users-list">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className={selectedUser?._id === user._id ? 'selected' : ''}>
                    <td>{user.displayName || 'N/A'}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <button onClick={() => setSelectedUser(user)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                Next
              </button>
            </div>
          </div>

          {selectedUser && (
            <div className="user-details">
              <h2>{selectedUser.displayName || 'User Details'}</h2>
              <p>
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p>
                <strong>UID:</strong> {selectedUser.uid}
              </p>
              <p>
                <strong>Created:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}
              </p>
              <p>
                <strong>Last Login:</strong>{' '}
                {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}
              </p>

              <div className="role-management">
                <h3>Role Management</h3>
                <select value={selectedUser.role} onChange={(e) => changeUserRole(selectedUser._id, e.target.value)}>
                  <option value="user">User</option>
                  <option value="organizer">Organizer</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="help-text">
                  {selectedUser.role === 'organizer'
                    ? 'This user can manage events assigned to them.'
                    : selectedUser.role === 'admin'
                      ? 'This user has full administrative access.'
                      : 'This is a regular user with no special privileges.'}
                </p>
              </div>

              {selectedUser.role === 'organizer' && (
                <div className="managed-events">
                  <h3>Managed Events</h3>
                  {selectedUser.managedEvents && selectedUser.managedEvents.length > 0 ? (
                    <ul>
                      {selectedUser.managedEvents.map((eventId) => {
                        const event = events.find((e) => e._id === eventId);
                        return (
                          <li key={eventId}>
                            {event ? event.name : eventId}
                            <button onClick={() => removeEvent(selectedUser._id, eventId)}>Remove</button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>No events assigned to this organizer.</p>
                  )}

                  <div className="assign-event">
                    <h4>Assign New Event</h4>
                    <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
                      <option value="">Select an event</option>
                      {events.map((event) => (
                        <option key={event._id} value={event._id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => assignEvent(selectedUser._id, selectedEvent)} disabled={!selectedEvent}>
                      Assign
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagementScreen;
