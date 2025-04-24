import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../services/api';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
  DropResult,
} from 'react-beautiful-dnd';
import '../../styles/UserRolesTab.css';

// Define role mappings between frontend containers and backend role values
const ROLE_MAPPINGS: Record<string, string> = {
  users: 'user',
  organizers: 'organizer',
  admins: 'admin',
};

// Define the UserData interface here for self-containment
interface UserData {
  _id?: string;
  uid: string;
  email: string;
  displayName?: string;
  role: string;
  createdAt?: string;
  lastLogin?: string;
  photoURL?: string;
  managedEvents?: string[];
}

// Add string indexing support for users state
interface GroupedUsers {
  users: UserData[];
  organizers: UserData[];
  admins: UserData[];
  [key: string]: UserData[]; // More explicit string indexer
}

export const UserRolesTab: React.FC = () => {
  const [users, setUsers] = useState<GroupedUsers>({ users: [], organizers: [], admins: [] });
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');

        console.log('Fetching users from Firebase...');
        // Try users endpoint
        let response = await fetchWithAuth('/user?limit=100');

        if (!response.ok) {
          console.error('Failed to fetch users with status:', response.status);
          // Try alternative endpoint
          response = await fetchWithAuth('/user?limit=100');

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch users (${response.status}): ${errorText}`);
          }
        }

        const data = await response.json();
        console.log('User data received:', data);

        // Create dummy data for testing if no users returned
        if (!data.users || data.users.length === 0) {
          console.log('No users returned, creating dummy data for testing');
          const dummyUsers = [
            { uid: 'dummy-user-1', email: 'user1@example.com', displayName: 'User One', role: 'user' },
            { uid: 'dummy-user-2', email: 'user2@example.com', displayName: 'User Two', role: 'user' },
            {
              uid: 'dummy-organizer-1',
              email: 'organizer1@example.com',
              displayName: 'Organizer One',
              role: 'organizer',
            },
            { uid: 'dummy-admin-1', email: 'admin1@example.com', displayName: 'Admin One', role: 'admin' },
          ];
          data.users = dummyUsers;
        }

        // Ensure all users have a uid property (for safety)
        const processedUsers =
          data.users?.map((user: UserData) => ({
            ...user,
            uid: user.uid || user._id || `user-${Math.random().toString(36).substring(2, 10)}`,
            // Ensure role is lowercase to match our mappings
            role: user.role?.toLowerCase() || 'user',
          })) || [];

        // Group users by role
        const groupedUsers: GroupedUsers = {
          users: processedUsers.filter((user: UserData) => user.role === 'user'),
          organizers: processedUsers.filter((user: UserData) => user.role === 'organizer'),
          admins: processedUsers.filter((user: UserData) => user.role === 'admin'),
        };

        console.log('Grouped users:', groupedUsers);

        // Debug log all UIDs to verify they're correct
        console.log('User UIDs:', {
          users: groupedUsers.users.map((u: UserData) => u.uid),
          organizers: groupedUsers.organizers.map((u: UserData) => u.uid),
          admins: groupedUsers.admins.map((u: UserData) => u.uid),
        });

        setUsers(groupedUsers);
      } catch (err: unknown) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const onBeforeDragStart = () => {
    // Set dragging state to avoid issues with onClick events
    setIsDragging(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    // Reset dragging state
    setIsDragging(false);

    console.log('Drag end result:', result);
    const { source, destination, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // No movement
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // User was moved to a new role
    if (source.droppableId !== destination.droppableId) {
      console.log(`Looking for user with draggableId: ${draggableId} in ${source.droppableId}`);

      // Get the user being moved
      const sourceUsers = users[source.droppableId];
      if (!sourceUsers) {
        console.error(`No users in container ${source.droppableId}`);
        return;
      }

      // Find the user by index (more reliable than ID)
      const userToMove = sourceUsers[source.index];

      if (!userToMove) {
        console.error('Could not find user at index:', source.index);
        console.error('Available users:', users[source.droppableId]);
        return;
      }

      console.log('Found user to move:', userToMove);

      // Convert from frontend container ID to backend role value
      const newRole = ROLE_MAPPINGS[destination.droppableId] || destination.droppableId;

      console.log(`Moving user ${userToMove.email} from ${source.droppableId} to ${newRole}`);

      try {
        // Update user role in the backend - try with uid which is the Firebase ID
        const userId = userToMove.uid;
        console.log(`Sending PATCH request to /user/${userId}/role with role ${newRole}`);

        const response = await fetchWithAuth(`/user/${userId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Role update failed:', errorText);
          throw new Error('Failed to update user role');
        }

        const updatedUsers: GroupedUsers = {
          users: [...users.users],
          organizers: [...users.organizers],
          admins: [...users.admins],
        };

        // Add type safety for source container
        const sourceKey = source.droppableId as keyof GroupedUsers;
        if (!updatedUsers[sourceKey]) {
          updatedUsers[sourceKey] = [];
        }
        // Remove from source with type safety
        updatedUsers[sourceKey].splice(source.index, 1);

        // Add type safety for destination container
        const destKey = destination.droppableId as keyof GroupedUsers;
        if (!updatedUsers[destKey]) {
          updatedUsers[destKey] = [];
        }
        // Insert at destination with type safety
        updatedUsers[destKey].splice(destination.index, 0, { ...userToMove, role: newRole });

        console.log('Updated users state:', updatedUsers);
        setUsers(updatedUsers);
      } catch (err: unknown) {
        console.error('Error updating user role:', err);
        if (err instanceof Error) {
          alert(`Error updating role: ${err.message}`);
        } else {
          alert('An unknown error occurred while updating the role');
        }
      }
    }
  };

  const handleUserClick = (user: UserData) => {
    if (!isDragging) {
      setSelectedUser(user);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading users...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="user-roles-tab">
      <div className="roles-container">
        <DragDropContext onBeforeDragStart={onBeforeDragStart} onDragEnd={handleDragEnd}>
          <div className="roles-columns">
            {/* Users column */}
            <div className="role-column users-column">
              <h3>
                Users <span className="count-badge">{users.users.length}</span>
              </h3>
              <Droppable droppableId="users">
                {(provided: DroppableProvided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="role-dropzone">
                    {users.users.map((user, index) => (
                      <Draggable key={user.uid} draggableId={user.uid} index={index}>
                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`user-card ${snapshot.isDragging ? 'dragging' : ''} 
                                                          ${selectedUser && selectedUser.uid === user.uid ? 'selected' : ''}`}
                            onClick={() => handleUserClick(user)}
                          >
                            <div className="user-card-content">
                              <span className="user-name">{user.displayName || 'No Name'}</span>
                              <span className="user-email">{user.email}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Organizers column */}
            <div className="role-column organizers-column">
              <h3>
                Organizers <span className="count-badge">{users.organizers.length}</span>
              </h3>
              <Droppable droppableId="organizers">
                {(provided: DroppableProvided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="role-dropzone">
                    {users.organizers.map((user, index) => (
                      <Draggable key={user.uid} draggableId={user.uid} index={index}>
                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`user-card organizer ${snapshot.isDragging ? 'dragging' : ''} 
                                                          ${selectedUser && selectedUser.uid === user.uid ? 'selected' : ''}`}
                            onClick={() => handleUserClick(user)}
                          >
                            <div className="user-card-content">
                              <span className="user-name">{user.displayName || 'No Name'}</span>
                              <span className="user-email">{user.email}</span>
                              {user.managedEvents && user.managedEvents.length > 0 && (
                                <span className="event-count">{user.managedEvents.length} events</span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Admins column */}
            <div className="role-column admins-column">
              <h3>
                Admins <span className="count-badge">{users.admins.length}</span>
              </h3>
              <Droppable droppableId="admins">
                {(provided: DroppableProvided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="role-dropzone">
                    {users.admins.map((user, index) => (
                      <Draggable key={user.uid} draggableId={user.uid} index={index}>
                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`user-card admin ${snapshot.isDragging ? 'dragging' : ''} 
                                                          ${selectedUser && selectedUser.uid === user.uid ? 'selected' : ''}`}
                            onClick={() => handleUserClick(user)}
                          >
                            <div className="user-card-content">
                              <span className="user-name">{user.displayName || 'No Name'}</span>
                              <span className="user-email">{user.email}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      </div>

      {/* User details panel */}
      {selectedUser && (
        <div className="user-details-panel">
          <h3>User Details</h3>
          <div className="user-profile">
            <div className="profile-header">
              <div className="user-avatar-large">
                {selectedUser.photoURL ? (
                  <img src={selectedUser.photoURL} alt={selectedUser.displayName || selectedUser.email} />
                ) : (
                  <div className="default-avatar-large">
                    {(selectedUser.displayName || selectedUser.email || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-info">
                <h4>{selectedUser.displayName || 'No Name'}</h4>
                <p className="user-email-large">{selectedUser.email}</p>
                <p className="user-role-badge">{selectedUser.role}</p>
              </div>
            </div>

            <div className="profile-details">
              <div className="detail-row">
                <span className="detail-label">User ID:</span>
                <span className="detail-value">{selectedUser.uid}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created:</span>
                <span className="detail-value">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Login:</span>
                <span className="detail-value">
                  {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create test users button */}
      {process.env.NODE_ENV !== 'production' && (
        <button
          className="debug-button"
          onClick={async () => {
            try {
              const response = await fetchWithAuth('/user/debug/create-users', {
                method: 'POST',
              });

              if (!response.ok) {
                throw new Error(await response.text());
              }

              alert('Created test users! Refreshing page...');
              window.location.reload();
            } catch (err: unknown) {
              if (err instanceof Error) {
                alert(`Error creating test users: ${err.message}`);
              } else {
                alert('An unknown error occurred');
              }
            }
          }}
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            padding: '8px 12px',
            background: '#007BFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 9999,
          }}
        >
          Create Test Users
        </button>
      )}
    </div>
  );
};
