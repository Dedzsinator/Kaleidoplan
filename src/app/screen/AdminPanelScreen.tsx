import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../../services/api';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
  DropResult
} from 'react-beautiful-dnd';
import Chart from 'chart.js/auto';
import '../styles/AdminPanel.css';

// Types
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

interface StatsData {
  events: {
    total: number;
    upcoming: number;
    ongoing: number;
    percentage: number;
  };
  tasks: {
    completed: number;
    pending: number;
    overdue: number;
    total: number;
    completionRate: number;
  };
  users: {
    total: number;
    new: number;
    organizers: number;
    growth: number;
  };
}

interface LoginActivity {
  date: string;
  count: number;
}

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AdminPanelScreen: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  return (
    <div className="admin-panel-container">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p className="subtitle">Manage and monitor your application</p>
      </div>

      <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {loading && activeTab === 'analytics' && <div className="loading-spinner">Loading analytics...</div>}
      {error && <div className="error-message">{error}</div>}

      {activeTab === 'analytics' && <AnalyticsTab />}
      {activeTab === 'roles' && <UserRolesTab />}
      {activeTab === 'crud' && <CrudOperationsTab />}
    </div>
  );
};

const AdminTabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="admin-tabs">
      <button
        className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => setActiveTab('analytics')}
      >
        <span className="tab-icon">📊</span>
        <span className="tab-text">Analytics</span>
      </button>

      <button
        className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
        onClick={() => setActiveTab('roles')}
      >
        <span className="tab-icon">👥</span>
        <span className="tab-text">User Roles</span>
      </button>

      <button
        className={`tab ${activeTab === 'crud' ? 'active' : ''}`}
        onClick={() => setActiveTab('crud')}
      >
        <span className="tab-icon">⚙️</span>
        <span className="tab-text">Data Management</span>
      </button>
    </div>
  );
};

// In the AnalyticsTab component, replace the chart initialization useEffect:

const AnalyticsTab: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);
  const [activeUsers, setActiveUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  const loginChartRef = useRef<HTMLCanvasElement>(null);
  const userRolesChartRef = useRef<HTMLCanvasElement>(null);
  const eventStatusChartRef = useRef<HTMLCanvasElement>(null);

  // Store chart instances so we can destroy them later
  const chartInstancesRef = useRef<{ [key: string]: Chart | null }>({
    login: null,
    roles: null,
    events: null
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        // Generate mock data for development since backend might not be ready
        const mockData = {
          events: {
            total: 25,
            upcoming: 12,
            ongoing: 5,
            percentage: 48
          },
          tasks: {
            completed: 45,
            pending: 23,
            overdue: 7,
            total: 75,
            completionRate: 60
          },
          users: {
            total: 84,
            organizers: 12,
            new: 8,
            growth: 24
          }
        };

        const mockLoginActivity = Array(30).fill(0).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - 29 + i);
          return {
            date: date.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 20) + 1
          };
        });

        // Try to fetch real data, fall back to mock data
        try {
          // Try to get stats from API
          const statsResponse = await fetchWithAuth('/admin/stats');
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setStats(statsData);
          } else {
            console.log('Using mock stats data');
            setStats(mockData);
          }

          // Try to get login activity
          const activityResponse = await fetchWithAuth('/admin/login-activity');
          if (activityResponse.ok) {
            const activityData = await activityResponse.json();
            setLoginActivity(activityData.activity);
          } else {
            console.log('Using mock login activity data');
            setLoginActivity(mockLoginActivity);
          }

          // Try to get active users
          const usersResponse = await fetchWithAuth('/admin/active-users');
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            setActiveUsers(usersData.users);
          } else {
            console.log('Error');
          }
        } catch (error) {
          console.error('Error fetching analytics data:', error);
          // Fall back to mock data
          setStats(mockData);
          setLoginActivity(mockLoginActivity);
        }
      } finally {
        // Always set loading to false, even if there's an error
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Cleanup function to destroy charts when component unmounts
    return () => {
      // Destroy any existing charts to prevent memory leaks
      Object.values(chartInstancesRef.current).forEach(chart => {
        if (chart) chart.destroy();
      });
    };
  }, []);

  useEffect(() => {
    if (loading || !stats) return;

    // Destroy existing charts before creating new ones
    Object.values(chartInstancesRef.current).forEach(chart => {
      if (chart) chart.destroy();
    });

    // Create login activity chart
    if (loginChartRef.current) {
      const ctx = loginChartRef.current.getContext('2d');
      if (ctx && loginActivity.length > 0) {
        chartInstancesRef.current.login = new Chart(ctx, {
          type: 'line',
          data: {
            labels: loginActivity.map(item => item.date),
            datasets: [{
              label: 'User Logins',
              data: loginActivity.map(item => item.count),
              borderColor: '#4285F4',
              backgroundColor: 'rgba(66, 133, 244, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Login Activity (Last 30 days)'
              },
              tooltip: {
                mode: 'index',
                intersect: false
              },
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }
    }

    // Create user roles chart
    if (userRolesChartRef.current) {
      const ctx = userRolesChartRef.current.getContext('2d');
      if (ctx && stats) {
        chartInstancesRef.current.roles = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Regular Users', 'Organizers', 'Admins'],
            datasets: [{
              data: [
                stats.users.total - stats.users.organizers - 3, // Assuming 3 admins
                stats.users.organizers,
                3 // Placeholder for admin count
              ],
              backgroundColor: [
                'rgba(66, 133, 244, 0.7)',
                'rgba(52, 168, 83, 0.7)',
                'rgba(251, 188, 4, 0.7)'
              ]
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'User Distribution by Role'
              },
              legend: {
                position: 'bottom'
              }
            }
          }
        });
      }
    }

    // Create event status chart
    if (eventStatusChartRef.current) {
      const ctx = eventStatusChartRef.current.getContext('2d');
      if (ctx && stats) {
        chartInstancesRef.current.events = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Upcoming', 'Ongoing', 'Completed'],
            datasets: [{
              label: 'Events',
              data: [
                stats.events.upcoming,
                stats.events.ongoing,
                stats.events.total - stats.events.upcoming - stats.events.ongoing
              ],
              backgroundColor: [
                'rgba(52, 168, 83, 0.7)',
                'rgba(66, 133, 244, 0.7)',
                'rgba(234, 67, 53, 0.7)'
              ]
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Events by Status'
              },
              legend: {
                display: false
              }
            }
          }
        });
      }
    }
  }, [loading, stats, loginActivity]);

  if (loading) {
    return <div className="loading-spinner">Loading analytics data...</div>;
  }

  return (
    <div className="analytics-tab">
      {/* KPI Summary */}
      <div className="kpi-summary">
        <div className="kpi-card">
          <h3>Total Users</h3>
          <div className="kpi-value">{stats?.users.total || 0}</div>
          <div className="kpi-trend">
            +{stats?.users.new || 0} new (last 7 days)
          </div>
        </div>

        <div className="kpi-card">
          <h3>Total Events</h3>
          <div className="kpi-value">{stats?.events.total || 0}</div>
          <div className="kpi-trend">
            {stats?.events.upcoming || 0} upcoming
          </div>
        </div>

        <div className="kpi-card">
          <h3>Tasks</h3>
          <div className="kpi-value">{stats?.tasks.total || 0}</div>
          <div className="kpi-trend">
            {stats?.tasks.completionRate || 0}% completion rate
          </div>
        </div>

        <div className="kpi-card">
          <h3>Organizers</h3>
          <div className="kpi-value">{stats?.users.organizers || 0}</div>
          <div className="kpi-trend">
            {Math.round((stats?.users.organizers || 0) / (stats?.users.total || 1) * 100)}% of users
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="analytics-charts">
        <div className="chart-container">
          <h3>Login Activity</h3>
          <canvas ref={loginChartRef}></canvas>
        </div>

        <div className="chart-container">
          <h3>User Roles</h3>
          <canvas ref={userRolesChartRef}></canvas>
        </div>

        <div className="chart-container">
          <h3>Event Status</h3>
          <canvas ref={eventStatusChartRef}></canvas>
        </div>
      </div>

      {/* Active Users */}
      <div className="active-users-section">
        <h3>Currently Active Users ({activeUsers.length})</h3>
        <div className="active-users-list">
          {activeUsers.length > 0 ? (
            activeUsers.map(user => (
              <div key={user._id} className="active-user-card">
                <div className="user-avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || user.email} />
                  ) : (
                    <div className="default-avatar">
                      {(user.displayName || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className={`status-indicator ${user.role}`}></span>
                </div>
                <div className="user-info">
                  <span className="user-name">{user.displayName || 'No Name'}</span>
                  <span className="user-email">{user.email}</span>
                  <span className="user-role">{user.role}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="no-data">No active users found</p>
          )}
        </div>
      </div>
    </div>
  );
};

const UserRolesTab: React.FC = () => {
  const [users, setUsers] = useState<{ [key: string]: UserData[] }>({
    users: [],
    organizers: [],
    admins: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');

        console.log("Fetching users from Firebase...");
        // Remove the /api prefix here since fetchWithAuth adds it
        let response = await fetchWithAuth('/users?limit=100');

        if (!response.ok) {
          console.error("Failed to fetch users with status:", response.status);
          const errorText = await response.text();
          throw new Error(`Failed to fetch users (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log("User data received:", data);

        // Group users by role
        const groupedUsers = {
          users: data.users?.filter((user: UserData) => user.role === 'user') || [],
          organizers: data.users?.filter((user: UserData) => user.role === 'organizer') || [],
          admins: data.users?.filter((user: UserData) => user.role === 'admin') || []
        };

        console.log("Grouped users:", groupedUsers);
        setUsers(groupedUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser && selectedUser.role === 'organizer') {
      const fetchUserEvents = async () => {
        try {
          // Fetch events managed by this organizer
          const eventsResponse = await fetchWithAuth(`/api/users/${selectedUser._id}/events`);
          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json();
            setUserEvents(eventsData.events || []);
          }

          // Fetch available events
          const availableResponse = await fetchWithAuth('/api/events?unassigned=true');
          if (availableResponse.ok) {
            const availableData = await availableResponse.json();
            setAvailableEvents(availableData.events || []);
          }
        } catch (err) {
          console.error('Error fetching events:', err);
        }
      };

      fetchUserEvents();
    }
  }, [selectedUser]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // No movement
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    // User was moved to a new role
    if (source.droppableId !== destination.droppableId) {
      // Get the user being moved
      const userToMove = users[source.droppableId].find(u => u._id === draggableId);
      if (!userToMove) return;

      const newRole = destination.droppableId;

      try {
        // Update user role in the backend
        const response = await fetchWithAuth(`/api/users/${draggableId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        });

        if (!response.ok) throw new Error('Failed to update user role');

        // Update local state
        const updatedUsers = { ...users };

        // Remove from source
        updatedUsers[source.droppableId] = users[source.droppableId]
          .filter(u => u._id !== draggableId);

        // Add to destination with new role
        updatedUsers[destination.droppableId] = [
          ...users[destination.droppableId],
          { ...userToMove, role: newRole }
        ];

        setUsers(updatedUsers);
      } catch (err) {
        console.error('Error updating user role:', err);
      }
    } else {
      // Reordering within the same list - implement if needed
    }
  };

  const assignEventToOrganizer = async (eventId: string) => {
    if (!selectedUser) return;

    try {
      const response = await fetchWithAuth(`/api/users/${selectedUser._id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      });

      if (!response.ok) throw new Error('Failed to assign event');

      // Update local state
      const assignedEvent = availableEvents.find(e => e.id === eventId);
      if (assignedEvent) {
        setUserEvents([...userEvents, assignedEvent]);
        setAvailableEvents(availableEvents.filter(e => e.id !== eventId));
      }
    } catch (err) {
      console.error('Error assigning event:', err);
    }
  };

  const removeEventFromOrganizer = async (eventId: string) => {
    if (!selectedUser) return;

    try {
      const response = await fetchWithAuth(`/api/users/${selectedUser._id}/events/${eventId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to remove event');

      // Update local state
      const removedEvent = userEvents.find(e => e.id === eventId);
      if (removedEvent) {
        setAvailableEvents([...availableEvents, removedEvent]);
        setUserEvents(userEvents.filter(e => e.id !== eventId));
      }
    } catch (err) {
      console.error('Error removing event:', err);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading user data...</div>;
  }

  return (
    <div className="user-roles-tab">
      <div className="roles-container">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="roles-columns">
            <div className="role-column users-column">
              <h3>Users <span className="count-badge">{users.users.length}</span></h3>
              <Droppable droppableId="users">
                {(provided: DroppableProvided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="role-dropzone"
                  >
                    {users.users.map((user, index) => (
                      <Draggable
                        key={user._id}
                        draggableId={user._id}
                        index={index}
                      >
                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`user-card ${snapshot.isDragging ? "dragging" : ""
                              } ${selectedUser && selectedUser._id === user._id ? "selected" : ""}`}
                            onClick={() => setSelectedUser(user)}
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

            <div className="role-column organizers-column">
              <h3>Organizers <span className="count-badge">{users.organizers.length}</span></h3>
              <Droppable droppableId="organizers">
                {(provided: DroppableProvided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="role-dropzone"
                  >
                    {users.organizers.map((user, index) => (
                      <Draggable
                        key={user._id}
                        draggableId={user._id}
                        index={index}
                      >
                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`user-card organizer ${snapshot.isDragging ? "dragging" : ""
                              } ${selectedUser && selectedUser._id === user._id ? "selected" : ""}`}
                            onClick={() => setSelectedUser(user)}
                          >
                            <div className="user-card-content">
                              <span className="user-name">{user.displayName || 'No Name'}</span>
                              <span className="user-email">{user.email}</span>
                              {user.managedEvents && (
                                <span className="event-count">
                                  {user.managedEvents.length} events
                                </span>
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

            <div className="role-column admins-column">
              <h3>Admins <span className="count-badge">{users.admins.length}</span></h3>
              <Droppable droppableId="admins">
                {(provided: DroppableProvided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="role-dropzone"
                  >
                    {users.admins.map((user, index) => (
                      <Draggable
                        key={user._id}
                        draggableId={user._id}
                        index={index}
                      >
                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`user-card admin ${snapshot.isDragging ? "dragging" : ""
                              } ${selectedUser && selectedUser._id === user._id ? "selected" : ""}`}
                            onClick={() => setSelectedUser(user)}
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

      {/* User Details Panel */}
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
              <p><strong>User ID:</strong> {selectedUser.uid}</p>
              <p><strong>Created At:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              <p><strong>Last Login:</strong> {
                selectedUser.lastLogin ?
                  new Date(selectedUser.lastLogin).toLocaleString() :
                  'Never'
              }</p>
            </div>

            {/* Event Assignment (for organizers) */}
            {selectedUser.role === 'organizer' && (
              <div className="event-assignment">
                <h4>Managed Events</h4>

                <div className="managed-events">
                  {userEvents.length > 0 ? (
                    <ul className="event-list">
                      {userEvents.map(event => (
                        <li key={event.id} className="event-item">
                          <div className="event-name">{event.name}</div>
                          <div className="event-date">
                            {new Date(event.startDate).toLocaleDateString()} -
                            {new Date(event.endDate).toLocaleDateString()}
                          </div>
                          <button
                            className="remove-event-button"
                            onClick={() => removeEventFromOrganizer(event.id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-events">No events assigned</p>
                  )}
                </div>

                <h4>Available Events</h4>
                <div className="available-events">
                  {availableEvents.length > 0 ? (
                    <ul className="event-list">
                      {availableEvents.map(event => (
                        <li key={event.id} className="event-item">
                          <div className="event-name">{event.name}</div>
                          <div className="event-date">
                            {new Date(event.startDate).toLocaleDateString()} -
                            {new Date(event.endDate).toLocaleDateString()}
                          </div>
                          <button
                            className="assign-event-button"
                            onClick={() => assignEventToOrganizer(event.id)}
                          >
                            Assign
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-events">No available events</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CrudOperationsTab: React.FC = () => {
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
          endpoint = `/api/users?page=${page}`;
          stateUpdater = (data) => {
            setUsers(data.users);
            setTotalPages(data.pagination.pages);
          };
          break;
        case 'events':
          endpoint = `/api/events?page=${page}`;
          stateUpdater = (data) => {
            setEvents(data.events);
            setTotalPages(data.pagination.pages);
          };
          break;
        default:
          return;
      }

      const response = await fetchWithAuth(endpoint);
      if (!response.ok) throw new Error(`Failed to fetch ${activeEntity}`);

      const data = await response.json();
      stateUpdater(data);
    } catch (err) {
      console.error(`Error fetching ${activeEntity}:`, err);
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
      let response;
      let endpoint = '';
      let method = '';

      if (isEditing) {
        // Update existing item
        if (activeEntity === 'users') {
          endpoint = `/api/users/${selectedItem._id}`;
          method = 'PUT';
        } else if (activeEntity === 'events') {
          endpoint = `/api/events/${selectedItem.id}`;
          method = 'PUT';
        }
      } else {
        // Create new item
        if (activeEntity === 'users') {
          endpoint = '/api/users';
          method = 'POST';
        } else if (activeEntity === 'events') {
          endpoint = '/api/events';
          method = 'POST';
        }
      }

      response = await fetchWithAuth(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} ${activeEntity}`);

      // Reset form and refresh data
      setIsEditing(false);
      setIsCreating(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} ${activeEntity}:`, err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      let endpoint = '';

      if (activeEntity === 'users') {
        endpoint = `/api/users/${id}`;
      } else if (activeEntity === 'events') {
        endpoint = `/api/events/${id}`;
      }

      const response = await fetchWithAuth(endpoint, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error(`Failed to delete ${activeEntity}`);

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

export default AdminPanelScreen;