import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../../services/api';

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
}

interface Event {
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

export const CrudOperationsTab: React.FC = () => {
    const [activeEntity, setActiveEntity] = useState('users');
    const [users, setUsers] = useState<UserData[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        fetchData();
    }, [activeEntity, page]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let endpoint = '';
            let stateUpdater: (data: any) => void;

            switch (activeEntity) {
                case 'users':
                    // Remove /api prefix because fetchWithAuth adds it
                    endpoint = `/users?page=${page}`;
                    stateUpdater = (data) => {
                        console.log("Users data received:", data);
                        // Handle different response formats
                        if (Array.isArray(data)) {
                            setUsers(data);
                            setTotalPages(1); // No pagination info available
                        } else if (data.users) {
                            setUsers(data.users);
                            setTotalPages(data.pagination?.pages || 1);
                        } else {
                            setUsers([]);
                            setTotalPages(1);
                        }
                    };
                    break;
                case 'events':
                    endpoint = `/events?page=${page}`;
                    stateUpdater = (data) => {
                        console.log("Events data received:", data);
                        // Handle different response formats
                        if (Array.isArray(data)) {
                            setEvents(data);
                            setTotalPages(1); // No pagination info available
                        } else if (data.events) {
                            setEvents(data.events);
                            setTotalPages(data.pagination?.pages || 1);
                        } else {
                            setEvents([]);
                            setTotalPages(1);
                        }
                    };
                    break;
                default:
                    return;
            }

            console.log(`Fetching ${activeEntity} from endpoint:`, endpoint);

            const response = await fetchWithAuth(endpoint);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error response when fetching ${activeEntity}:`, response.status, errorText);
                throw new Error(`Failed to fetch ${activeEntity}`);
            }

            const data = await response.json();
            console.log(`${activeEntity} data:`, data);
            stateUpdater(data);
        } catch (err) {
            console.error(`Error fetching ${activeEntity}:`, err);
            alert(`Failed to load ${activeEntity}. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (item: any) => {
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
                role: 'user'
            });
        } else if (activeEntity === 'events') {
            setFormData({
                name: '',
                description: '',
                location: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                isPublic: true
            });
        }

        setIsCreating(true);
        setIsEditing(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev: Record<string, any>) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev: Record<string, any>) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            console.log("Submitting form data:", formData);
            let endpoint = '';
            let method = '';
            let dataToSend = { ...formData };

            // Remove empty string values to allow defaults on the server
            Object.keys(dataToSend).forEach(key => {
                if (dataToSend[key] === '') {
                    delete dataToSend[key];
                }
            });

            if (isEditing) {
                // Update existing item
                if (activeEntity === 'users') {
                    // For user updates, check if only the role is changing
                    const roleChanged = selectedItem.role !== formData.role;
                    const otherFieldsChanged = Object.keys(formData).some(
                        key => key !== 'role' && formData[key] !== selectedItem[key]
                    );

                    if (roleChanged && !otherFieldsChanged) {
                        // If only the role is changing, use the dedicated role update endpoint with PATCH
                        endpoint = `/users/${selectedItem.uid || selectedItem._id}/role`;
                        method = 'PATCH';
                        dataToSend = { role: formData.role };
                        console.log(`Updating only role with PATCH to ${endpoint}`);
                    } else {
                        // Otherwise update the whole user
                        endpoint = `/user/${selectedItem.uid || selectedItem._id}`; // Try with /user/ instead of /users/
                        method = 'PUT';
                    }
                } else if (activeEntity === 'events') {
                    endpoint = `/events/${selectedItem.id}`;
                    method = 'PUT';
                }
            } else {
                // Create new item
                if (activeEntity === 'users') {
                    endpoint = '/user'; // Try with /user/ instead of /users/
                    method = 'POST';
                } else if (activeEntity === 'events') {
                    endpoint = '/events';
                    method = 'POST';
                }
            }

            console.log(`Making ${method} request to ${endpoint}`);
            console.log("Sending data:", dataToSend);

            let response = await fetchWithAuth(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });

            // If first attempt fails with 404, try alternative endpoint format
            if (!response.ok && response.status === 404 && activeEntity === 'users') {
                const altEndpoint = endpoint.replace('/user/', '/users/').replace('/users/', '/user/');
                console.log(`First attempt failed, trying alternative endpoint: ${altEndpoint}`);

                response = await fetchWithAuth(altEndpoint, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSend)
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Server response:", response.status, errorText);

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

            // Reset form and refresh data
            setIsEditing(false);
            setIsCreating(false);
            setSelectedItem(null);
            setFormData({});

            // Show success message
            alert(`${activeEntity.slice(0, -1)} ${isEditing ? 'updated' : 'created'} successfully!`);

            // Refresh data
            fetchData();
        } catch (err) {
            console.error(`Error ${isEditing ? 'updating' : 'creating'} ${activeEntity}:`, err);
            alert(err instanceof Error ? err.message : `An error occurred while ${isEditing ? 'updating' : 'creating'} ${activeEntity}`);
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
                // Remove /api prefix because fetchWithAuth adds it
                endpoint = `/users/${id}`;
            } else if (activeEntity === 'events') {
                endpoint = `/events/${id}`;
            }

            console.log(`Deleting ${activeEntity.slice(0, -1)} with ID:`, id);
            console.log(`Making DELETE request to endpoint:`, endpoint);

            const response = await fetchWithAuth(endpoint, {
                method: 'DELETE'
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
            if (selectedItem && (
                (activeEntity === 'users' && selectedItem._id === id) ||
                (activeEntity === 'events' && selectedItem.id === id)
            )) {
                setSelectedItem(null);
                setIsEditing(false);
            }
        } catch (err) {
            console.error(`Error deleting ${activeEntity}:`, err);
            alert(err instanceof Error ? err.message : `An error occurred while deleting ${activeEntity.slice(0, -1)}`);
        }
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
                <div className="crud-list-panel">
                    <div className="crud-header">
                        <h3>{activeEntity.charAt(0).toUpperCase() + activeEntity.slice(1)}</h3>
                        <button className="create-button" onClick={handleCreateClick}>
                            Create New
                        </button>
                    </div>

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
                                        {users.map(user => (
                                            <tr
                                                key={user._id}
                                                className={selectedItem && selectedItem._id === user._id ? 'selected-row' : ''}
                                            >
                                                <td>{user.displayName || 'No Name'}</td>
                                                <td>{user.email}</td>
                                                <td>{user.role}</td>
                                                <td className="action-buttons">
                                                    <button
                                                        className="edit-button"
                                                        onClick={() => handleEditClick(user)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="delete-button"
                                                        onClick={() => handleDelete(user._id)}
                                                    >
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
                                        {events.map(event => (
                                            <tr
                                                key={event.id}
                                                className={selectedItem && selectedItem.id === event.id ? 'selected-row' : ''}
                                            >
                                                <td>{event.name}</td>
                                                <td>{new Date(event.startDate).toLocaleDateString()}</td>
                                                <td>{event.location}</td>
                                                <td>{event.status}</td>
                                                <td className="action-buttons">
                                                    <button
                                                        className="edit-button"
                                                        onClick={() => handleEditClick(event)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="delete-button"
                                                        onClick={() => handleDelete(event.id)}
                                                    >
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
                                <button
                                    className="pagination-button"
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    Previous
                                </button>
                                <span className="pagination-info">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    className="pagination-button"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(page + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Edit/Create Form */}
                {(isEditing || isCreating) && (
                    <div className="crud-form-panel">
                        <h3>{isEditing ? 'Edit' : 'Create'} {activeEntity.slice(0, -1)}</h3>
                        <form onSubmit={handleSubmit}>
                            {activeEntity === 'users' && (
                                <>
                                    <div className="form-group">
                                        <label>Email:</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email || ''}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Display Name:</label>
                                        <input
                                            type="text"
                                            name="displayName"
                                            value={formData.displayName || ''}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Role:</label>
                                        <select
                                            name="role"
                                            value={formData.role || 'user'}
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
                                                value={formData.password || ''}
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
                                            value={formData.name || ''}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Description:</label>
                                        <textarea
                                            name="description"
                                            value={formData.description || ''}
                                            onChange={handleFormChange}
                                            rows={4}
                                        ></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>Location:</label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={formData.location || ''}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Start Date:</label>
                                            <input
                                                type="date"
                                                name="startDate"
                                                value={formData.startDate ? formData.startDate.split('T')[0] : ''}
                                                onChange={handleFormChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>End Date:</label>
                                            <input
                                                type="date"
                                                name="endDate"
                                                value={formData.endDate ? formData.endDate.split('T')[0] : ''}
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
                                                checked={formData.isPublic}
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
                                            value={formData.coverImageUrl || ''}
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