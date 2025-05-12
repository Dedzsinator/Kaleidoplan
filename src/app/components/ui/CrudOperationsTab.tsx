import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '@services/api';
import { Event as AppEvent } from '@models/types';

// Define more precise interfaces for the API data
interface UserData {
  _id: string;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  lastLogin: string;
  photoURL?: string;
  managedEvents?: string[];
  password?: string; // Used in create form
}

// Rename to avoid conflict with global Event type
interface CrudEvent {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  coverImageUrl?: string;
  isPublic?: boolean;
}

interface PaginatedResponse {
  users?: UserData[];
  events?: CrudEvent[];
  pagination?: {
    pages: number;
    total: number;
    page: number;
  };
}

// Define more precise union types for form data
type FormDataType = Partial<UserData> | Partial<CrudEvent>;

// Define a type for the selected item
type SelectedItemType = UserData | CrudEvent | null;

// Type guard functions to distinguish between data types
function isUserData(item: unknown): item is UserData {
  return Boolean(item) && typeof item === 'object' && item !== null && '_id' in item && 'email' in item;
}

function isEventData(item: unknown): item is CrudEvent {
  return (
    Boolean(item) &&
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'startDate' in item &&
    'endDate' in item
  );
}

export const CrudOperationsTab: React.FC = () => {
  const navigate = useNavigate();
  const [activeEntity, setActiveEntity] = useState('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [events, setEvents] = useState<CrudEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItem, setSelectedItem] = useState<SelectedItemType>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FormDataType>({});

  // Wrap fetchData in useCallback to safely add to dependencies
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '';
      let stateUpdater: (data: unknown) => void;

      switch (activeEntity) {
        case 'users':
          endpoint = `/user?page=${page}`;
          stateUpdater = (data: unknown) => {
            // Handle different response formats with type safety
            if (Array.isArray(data)) {
              setUsers(data as UserData[]);
              setTotalPages(1);
            } else if (typeof data === 'object' && data !== null && 'users' in data) {
              const typedData = data as PaginatedResponse;
              setUsers(typedData.users || []);
              setTotalPages(typedData.pagination?.pages || 1);
            } else {
              setUsers([]);
              setTotalPages(1);
            }
          };
          break;
        case 'events':
          endpoint = `/events?page=${page}`;
          stateUpdater = (data: unknown) => {
            // Handle different response formats with type safety
            if (Array.isArray(data)) {
              setEvents(data as CrudEvent[]);
              setTotalPages(1);
            } else if (typeof data === 'object' && data !== null && 'events' in data) {
              const typedData = data as PaginatedResponse;
              setEvents(typedData.events || []);
              setTotalPages(typedData.pagination?.pages || 1);
            } else {
              setEvents([]);
              setTotalPages(1);
            }
          };
          break;
        default:
          return;
      }

      const response = await fetchWithAuth(endpoint);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response when fetching ${activeEntity}:`, response.status, errorText);
        throw new Error(`Failed to fetch ${activeEntity}`);
      }

      const data = await response.json();
      stateUpdater(data);
    } catch (err: unknown) {
      console.error(`Error fetching ${activeEntity}:`, err);
      alert(`Failed to load ${activeEntity}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [activeEntity, page]);

  // Now useEffect can safely include fetchData as dependency
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fix handleEditClick with proper typing
  const handleEditClick = (item: UserData | CrudEvent) => {
    setSelectedItem(item);
    setFormData(item);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleCreateClick = () => {
    setSelectedItem(null);

    if (activeEntity === 'users') {
      setFormData({
        email: '',
        displayName: '',
        role: 'user',
      } as Partial<UserData>);
    } else if (activeEntity === 'events') {
      setFormData({
        name: '',
        description: '',
        location: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isPublic: true,
      } as Partial<CrudEvent>);
    }

    setIsCreating(true);
    setIsEditing(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = '';
      let method = '';
      let dataToSend = { ...formData };

      // Remove empty string values to allow defaults on the server
      Object.keys(dataToSend).forEach((key) => {
        if (dataToSend[key as keyof typeof dataToSend] === '') {
          delete dataToSend[key as keyof typeof dataToSend];
        }
      });

      if (isEditing && selectedItem) {
        // Update existing item
        if (activeEntity === 'users' && isUserData(selectedItem)) {
          // For user updates, check if only the role is changing
          const userFormData = formData as Partial<UserData>;
          const roleChanged = selectedItem.role !== userFormData.role;
          const otherFieldsChanged = Object.keys(userFormData).some(
            (key) =>
              key !== 'role' &&
              userFormData[key as keyof typeof userFormData] !== selectedItem[key as keyof typeof selectedItem],
          );

          if (roleChanged && !otherFieldsChanged) {
            // If only the role is changing, use the dedicated role update endpoint with PATCH
            endpoint = `/user/${selectedItem.uid || selectedItem._id}/role`;
            method = 'PATCH';
            dataToSend = { role: userFormData.role };
          } else {
            // Otherwise update the whole user
            endpoint = `/user/${selectedItem.uid || selectedItem._id}`;
            method = 'PUT';
          }
        } else if (activeEntity === 'events' && isEventData(selectedItem)) {
          endpoint = `/events/${selectedItem.id}`;
          method = 'PUT';
        }
      } else {
        // Create new item
        if (activeEntity === 'users') {
          endpoint = '/user';
          method = 'POST';
        } else if (activeEntity === 'events') {
          endpoint = '/events';
          method = 'POST';
        }
      }

      let response = await fetchWithAuth(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      // If first attempt fails with 404, try alternative endpoint format
      if (!response.ok && response.status === 404 && activeEntity === 'users') {
        const altEndpoint = endpoint.replace('/user/', '/user/').replace('/user/', '/user/');

        response = await fetchWithAuth(altEndpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);

        let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} ${activeEntity}`;

        try {
          // Try to parse as JSON for structured error messages
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseErr) {
          // If we can't parse as JSON, use the raw text
          if (errorText) {
            errorMessage += `: ${errorText}`;
          }
        }

        throw new Error(errorMessage);
      }

      // Show success message
      alert(`${activeEntity.slice(0, -1)} ${isEditing ? 'updated' : 'created'} successfully!`);

      // Navigate to home page after event creation
      if (activeEntity === 'events' && isCreating) {
        navigate('/');
        return; // Exit early since we're navigating away
      }

      // Refresh data for other cases
      fetchData();
    } catch (err: unknown) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} ${activeEntity}:`, err);
      alert(
        err instanceof Error
          ? err.message
          : `An error occurred while ${isEditing ? 'updating' : 'creating'} ${activeEntity}`,
      );
    }
  };

  const handleDelete = async (id: string) => {
    // Confirm before deletion
    if (!window.confirm(`Are you sure you want to delete this ${activeEntity.slice(0, -1)}?`)) {
      return;
    }

    try {
      let endpoint = '';

      if (activeEntity === 'users') {
        endpoint = `/user/${id}`;
      } else if (activeEntity === 'events') {
        endpoint = `/events/${id}`;
      }

      const response = await fetchWithAuth(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response when deleting ${activeEntity}:`, response.status, errorText);

        let errorMessage = `Failed to delete ${activeEntity.slice(0, -1)}`;

        try {
          // Try to parse as JSON for structured error messages
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseErr) {
          // If we can't parse as JSON, use the raw text
          if (errorText) {
            errorMessage += `: ${errorText}`;
          }
        }

        throw new Error(errorMessage);
      }

      alert(`${activeEntity.slice(0, -1)} deleted successfully!`);

      // Refresh data
      fetchData();

      // Reset selected item if it was deleted
      if (
        selectedItem &&
        ((activeEntity === 'users' && isUserData(selectedItem) && selectedItem._id === id) ||
          (activeEntity === 'events' && isEventData(selectedItem) && selectedItem.id === id))
      ) {
        setSelectedItem(null);
        setIsEditing(false);
      }
    } catch (err: unknown) {
      console.error(`Error deleting ${activeEntity}:`, err);
      alert(err instanceof Error ? err.message : `An error occurred while deleting ${activeEntity.slice(0, -1)}`);
    }
  };

  const formatDateForInput = (dateValue: string | Date | undefined): string => {
    if (!dateValue) return '';

    if (typeof dateValue === 'string') {
      // Handle ISO string format (contains 'T')
      if (dateValue.includes('T')) {
        return dateValue.split('T')[0];
      }
      return dateValue;
    }

    // Handle Date object
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }

    return '';
  };

  return (
    <div className="crud-tab">
      <div className="entity-selector">
        <button
          className={`entity-button ${activeEntity === 'users' ? 'active' : ''}`}
          onClick={() => {
            setActiveEntity('users');
            setPage(1);
            setSelectedItem(null);
            setIsEditing(false);
            setIsCreating(false);
          }}
        >
          Users
        </button>
        <button
          className={`entity-button ${activeEntity === 'events' ? 'active' : ''}`}
          onClick={() => {
            setActiveEntity('events');
            setPage(1);
            setSelectedItem(null);
            setIsEditing(false);
            setIsCreating(false);
          }}
        >
          Events
        </button>
      </div>

      <div className="crud-container">
        {/* List Panel Section */}
        <div className="crud-list-panel">
          {/* Header */}
          <div className="crud-header">
            <h3>{activeEntity.charAt(0).toUpperCase() + activeEntity.slice(1)}</h3>
            <button className="create-button" onClick={handleCreateClick}>
              Create New
            </button>
          </div>

          {/* Table Section */}
          {loading ? (
            <div className="loading-spinner">Loading data...</div>
          ) : (
            <>
              {activeEntity === 'users' && (
                <table className="crud-table">
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
                      <tr
                        key={user._id}
                        className={
                          selectedItem && isUserData(selectedItem) && selectedItem._id === user._id
                            ? 'selected-row'
                            : ''
                        }
                      >
                        <td>{user.displayName || 'No Name'}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td className="action-buttons">
                          <button className="edit-button" onClick={() => handleEditClick(user)}>
                            Edit
                          </button>
                          <button className="delete-button" onClick={() => handleDelete(user._id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeEntity === 'events' && (
                <table className="crud-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Start Date</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        className={
                          selectedItem && isEventData(selectedItem) && selectedItem.id === event.id
                            ? 'selected-row'
                            : ''
                        }
                      >
                        <td>{event.name}</td>
                        <td>{new Date(event.startDate).toLocaleDateString()}</td>
                        <td>{event.location}</td>
                        <td>{event.status}</td>
                        <td className="action-buttons">
                          <button className="edit-button" onClick={() => handleEditClick(event)}>
                            Edit
                          </button>
                          <button className="delete-button" onClick={() => handleDelete(event.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Pagination */}
              <div className="pagination-controls">
                <button className="pagination-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <span className="pagination-info">
                  Page {page} of {totalPages}
                </span>
                <button className="pagination-button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        {/* Form Section */}
        {(isEditing || isCreating) && (
          <div className="crud-form-panel">
            <h3>
              {isEditing ? 'Edit' : 'Create'} {activeEntity.slice(0, -1)}
            </h3>
            <form onSubmit={handleSubmit}>
              {activeEntity === 'users' && (
                <>
                  <div className="form-group">
                    <label>Email:</label>
                    <input
                      type="email"
                      name="email"
                      value={(formData as Partial<UserData>).email || ''}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Display Name:</label>
                    <input
                      type="text"
                      name="displayName"
                      value={(formData as Partial<UserData>).displayName || ''}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Role:</label>
                    <select
                      name="role"
                      value={(formData as Partial<UserData>).role || 'user'}
                      onChange={handleFormChange}
                    >
                      <option value="user">User</option>
                      <option value="organizer">Organizer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {isCreating && (
                    <div className="form-group">
                      <label>Password:</label>
                      <input
                        type="password"
                        name="password"
                        value={(formData as Partial<UserData>).password || ''}
                        onChange={handleFormChange}
                        required={isCreating}
                      />
                    </div>
                  )}
                </>
              )}

              {activeEntity === 'events' && (
                <>
                  <div className="form-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      name="name"
                      value={(formData as Partial<CrudEvent>).name || ''}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description:</label>
                    <textarea
                      name="description"
                      value={(formData as Partial<CrudEvent>).description || ''}
                      onChange={handleFormChange}
                      rows={4}
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <label>Location:</label>
                    <input
                      type="text"
                      name="location"
                      value={(formData as Partial<CrudEvent>).location || ''}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Date:</label>
                      <input
                        type="date"
                        name="startDate"
                        value={formatDateForInput((formData as Partial<CrudEvent>).startDate)}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date:</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formatDateForInput((formData as Partial<CrudEvent>).endDate)}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="isPublic"
                        checked={(formData as Partial<CrudEvent>).isPublic || false}
                        onChange={handleFormChange}
                      />
                      Public Event
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Cover Image URL:</label>
                    <input
                      type="url"
                      name="coverImageUrl"
                      value={(formData as Partial<CrudEvent>).coverImageUrl || ''}
                      onChange={handleFormChange}
                    />
                  </div>
                </>
              )}

              <div className="form-actions">
                <button type="submit" className="primary-button">
                  {isEditing ? 'Save Changes' : 'Create'}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrudOperationsTab;
