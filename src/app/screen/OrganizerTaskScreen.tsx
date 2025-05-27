import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '@services/api';
import { format, isAfter, isBefore, parseISO } from 'date-fns';

import { useAuth } from '../contexts/AuthContext';
import '../styles/OrganizerTaskScreen.css';

// Define interfaces for our data types
interface Event {
  _id: string;
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface TaskLog {
  _id: string;
  status: string;
  changedBy: string;
  changedAt: string;
  user?: {
    displayName: string;
    email: string;
  };
}

interface Task {
  _id: string;
  eventId: string | Event;
  name: string;
  description?: string;
  deadline: string;
  assignedTo: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdBy: string;
  updatedBy?: string;
  priority: 'low' | 'medium' | 'high';
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  logs?: TaskLog[];
}

const OrganizerTaskScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'management'>('pending');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [taskFormData, setTaskFormData] = useState<Partial<Task>>({
    status: 'pending',
    priority: 'medium',
  });
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [taskFilter, setTaskFilter] = useState<{
    status: string;
    priority: string;
    eventId: string;
    searchQuery: string;
  }>({
    status: '',
    priority: '',
    eventId: '',
    searchQuery: '',
  });

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all tasks assigned to or created by the current user
      const response = await fetchWithAuth('/api/tasks');

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }

      const data = await response.json();

      // Transform data if needed
      const tasksData = data.tasks || data;
      setTasks(tasksData);
    } catch (err: unknown) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/events/managed');

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (err: unknown) {
      console.error('Error fetching events:', err);
      // Don't set error state here since tasks are the primary focus
    }
  }, []);

  // Fetch task logs
  const fetchTaskLogs = useCallback(async (taskId: string) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}/logs`);

      if (!response.ok) {
        console.error(`Failed to fetch task logs: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data;
    } catch (err: unknown) {
      console.error('Error fetching task logs:', err);
      return [];
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchTasks(), fetchEvents()]);
    };

    loadData();
  }, [fetchTasks, fetchEvents]);

  // Filtered tasks based on current tab and filters
  const filteredTasks = tasks.filter((task) => {
    // If we're on the pending tab, only show non-completed tasks
    if (activeTab === 'pending' && task.status === 'completed') {
      return false;
    }

    // Apply filters if on management tab
    if (activeTab === 'management') {
      // Filter by status
      if (taskFilter.status && task.status !== taskFilter.status) {
        return false;
      }

      // Filter by priority
      if (taskFilter.priority && task.priority !== taskFilter.priority) {
        return false;
      }

      // Filter by event
      if (taskFilter.eventId) {
        const eventId = typeof task.eventId === 'string' ? task.eventId : task.eventId._id;
        if (eventId !== taskFilter.eventId) {
          return false;
        }
      }

      // Filter by search query
      if (taskFilter.searchQuery) {
        const query = taskFilter.searchQuery.toLowerCase();
        const name = task.name.toLowerCase();
        const description = task.description?.toLowerCase() || '';

        if (!name.includes(query) && !description.includes(query)) {
          return false;
        }
      }
    }

    return true;
  });

  // Group tasks by event for the pending tab
  const tasksByEvent = filteredTasks.reduce(
    (acc, task) => {
      const eventId = typeof task.eventId === 'string' ? task.eventId : task.eventId._id;
      if (!acc[eventId]) {
        acc[eventId] = [];
      }
      acc[eventId].push(task);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  // Handle task selection
  const handleSelectTask = async (task: Task) => {
    setSelectedTask(task);

    // Fetch logs for the selected task
    const logs = await fetchTaskLogs(task._id);
    setTaskLogs(logs);

    // Reset form data
    setTaskFormData({
      ...task,
      eventId: typeof task.eventId === 'string' ? task.eventId : task.eventId._id,
    });
  };

  // Handle creating a new task
  const handleCreateTask = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTask(null);
    setTaskLogs([]);
    setTaskFormData({
      status: 'pending',
      priority: 'medium',
      assignedTo: currentUser?.uid || '',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 1 week from now
    });
  };

  // Handle editing a task
  const handleEditTask = (task: Task) => {
    setIsEditing(true);
    setIsCreating(false);
    handleSelectTask(task);
  };

  // Handle form input changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTaskFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formData = {
        ...taskFormData,
        deadline: new Date(taskFormData.deadline as string).toISOString(),
      };

      let response;

      if (isCreating) {
        // Create new task
        response = await fetchWithAuth('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else if (isEditing && selectedTask) {
        // Update existing task
        response = await fetchWithAuth(`/api/tasks/${selectedTask._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      if (!response || !response.ok) {
        throw new Error(`Failed to ${isCreating ? 'create' : 'update'} task: ${response?.status}`);
      }

      // Reset state and refresh tasks
      setIsCreating(false);
      setIsEditing(false);
      setSelectedTask(null);
      setTaskFormData({
        status: 'pending',
        priority: 'medium',
      });

      await fetchTasks();
    } catch (err: unknown) {
      console.error(`Error ${isCreating ? 'creating' : 'updating'} task:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${isCreating ? 'create' : 'update'} task`);
    } finally {
      setLoading(false);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status}`);
      }

      // Reset state and refresh tasks
      setSelectedTask(null);
      setIsEditing(false);
      setIsCreating(false);

      await fetchTasks();
    } catch (err: unknown) {
      console.error('Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  // Handle task completion
  const handleCompleteTask = async (taskId: string) => {
    try {
      setLoading(true);

      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete task: ${response.status}`);
      }

      // If the completed task is the selected task, update it
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask({
          ...selectedTask,
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
      }

      await fetchTasks();
    } catch (err: unknown) {
      console.error('Error completing task:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setLoading(false);
    }
  };

  // Get event name by ID
  const getEventName = (eventId: string): string => {
    const event = events.find((e) => e._id === eventId || e.id === eventId);
    return event?.name || 'Unknown Event';
  };

  // Render priority badge with appropriate color
  const renderPriorityBadge = (priority: string) => {
    const colors = {
      low: 'var(--priority-low-color, #28a745)',
      medium: 'var(--priority-medium-color, #ffc107)',
      high: 'var(--priority-high-color, #dc3545)',
    };

    return (
      <span
        className={`priority-badge priority-${priority}`}
        style={{ backgroundColor: colors[priority as keyof typeof colors] }}
      >
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  // Helper to determine if a task is overdue
  const isTaskOverdue = (task: Task): boolean => {
    return task.status !== 'completed' && isBefore(parseISO(task.deadline), new Date());
  };

  // Render task deadline with appropriate styling
  const renderDeadline = (task: Task) => {
    const deadlineDate = parseISO(task.deadline);
    const isOverdue = isTaskOverdue(task);

    return (
      <span className={`deadline ${isOverdue ? 'overdue' : ''}`}>
        {format(deadlineDate, 'MMM d, yyyy')}
        {isOverdue && <span className="overdue-indicator"> (Overdue)</span>}
      </span>
    );
  };

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    const colors = {
      pending: 'var(--status-pending-color, #ffc107)',
      'in-progress': 'var(--status-in-progress-color, #17a2b8)',
      completed: 'var(--status-completed-color, #28a745)',
    };

    const displayText = status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <span
        className={`status-badge status-${status}`}
        style={{ backgroundColor: colors[status as keyof typeof colors] }}
      >
        {displayText}
      </span>
    );
  };

  return (
    <div className="organizer-task-screen">
      <header className="task-screen-header">
        <h1>Task Management</h1>
        <div className="back-button">
          <button onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
        </div>
      </header>

      <div className="tabs">
        <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          Pending Tasks
        </button>
        <button
          className={`tab ${activeTab === 'management' ? 'active' : ''}`}
          onClick={() => setActiveTab('management')}
        >
          Task Management
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && !tasks.length ? (
        <div className="loading">Loading tasks...</div>
      ) : (
        <div className="tab-content">
          {activeTab === 'pending' && (
            <div className="pending-tasks-tab">
              <div className="task-summary">
                <div className="summary-card">
                  <h3>Total Tasks</h3>
                  <p className="summary-value">{tasks.length}</p>
                </div>
                <div className="summary-card">
                  <h3>Pending</h3>
                  <p className="summary-value">{tasks.filter((t) => t.status === 'pending').length}</p>
                </div>
                <div className="summary-card">
                  <h3>In Progress</h3>
                  <p className="summary-value">{tasks.filter((t) => t.status === 'in-progress').length}</p>
                </div>
                <div className="summary-card">
                  <h3>Completed</h3>
                  <p className="summary-value">{tasks.filter((t) => t.status === 'completed').length}</p>
                </div>
                <div className="summary-card">
                  <h3>Overdue</h3>
                  <p className="summary-value error-text">{tasks.filter(isTaskOverdue).length}</p>
                </div>
              </div>

              <h2>Tasks By Event</h2>

              {Object.keys(tasksByEvent).length === 0 ? (
                <div className="no-tasks">
                  <p>No pending tasks found. Great job!</p>
                  <button className="create-button" onClick={handleCreateTask}>
                    Create New Task
                  </button>
                </div>
              ) : (
                Object.entries(tasksByEvent).map(([eventId, eventTasks]) => (
                  <div key={eventId} className="event-tasks">
                    <h3 className="event-name">{getEventName(eventId)}</h3>
                    <div className="task-list">
                      {eventTasks.map((task) => (
                        <div
                          key={task._id}
                          className={`task-card ${isTaskOverdue(task) ? 'overdue' : ''}`}
                          onClick={() => handleSelectTask(task)}
                        >
                          <div className="task-header">
                            <h4 className="task-name">{task.name}</h4>
                            {renderPriorityBadge(task.priority)}
                          </div>

                          <div className="task-body">
                            {task.description && <p className="task-description">{task.description}</p>}
                            <div className="task-meta">
                              <div className="task-status">{renderStatusBadge(task.status)}</div>
                              <div className="task-deadline">Due: {renderDeadline(task)}</div>
                            </div>
                          </div>

                          <div className="task-actions">
                            <button
                              className="edit-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTask(task);
                              }}
                            >
                              Edit
                            </button>

                            {task.status !== 'completed' && (
                              <button
                                className="complete-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteTask(task._id);
                                }}
                              >
                                Mark Complete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'management' && (
            <div className="task-management-tab">
              <div className="management-header">
                <h2>Task Management</h2>
                <button className="create-button" onClick={handleCreateTask}>
                  Create New Task
                </button>
              </div>

              <div className="filter-controls">
                <div className="filter-group">
                  <label htmlFor="statusFilter">Status:</label>
                  <select
                    id="statusFilter"
                    value={taskFilter.status}
                    onChange={(e) => setTaskFilter((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="priorityFilter">Priority:</label>
                  <select
                    id="priorityFilter"
                    value={taskFilter.priority}
                    onChange={(e) => setTaskFilter((prev) => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="">All</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="eventFilter">Event:</label>
                  <select
                    id="eventFilter"
                    value={taskFilter.eventId}
                    onChange={(e) => setTaskFilter((prev) => ({ ...prev, eventId: e.target.value }))}
                  >
                    <option value="">All Events</option>
                    {events.map((event) => (
                      <option key={event._id} value={event._id || event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group search-group">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={taskFilter.searchQuery}
                    onChange={(e) => setTaskFilter((prev) => ({ ...prev, searchQuery: e.target.value }))}
                  />
                </div>
              </div>

              <div className="task-grid">
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Event</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Deadline</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="no-tasks-message">
                          No tasks found matching your filters
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const eventId = typeof task.eventId === 'string' ? task.eventId : task.eventId._id;

                        return (
                          <tr
                            key={task._id}
                            className={`task-row ${task.status}-status ${isTaskOverdue(task) ? 'overdue' : ''}`}
                            onClick={() => handleSelectTask(task)}
                          >
                            <td>{task.name}</td>
                            <td>{getEventName(eventId)}</td>
                            <td>{renderPriorityBadge(task.priority)}</td>
                            <td>{renderStatusBadge(task.status)}</td>
                            <td>{renderDeadline(task)}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="edit-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTask(task);
                                  }}
                                >
                                  Edit
                                </button>

                                {task.status !== 'completed' && (
                                  <button
                                    className="complete-button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCompleteTask(task._id);
                                    }}
                                  >
                                    Complete
                                  </button>
                                )}

                                <button
                                  className="delete-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task._id);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Form Modal */}
      {(isCreating || isEditing) && (
        <div className="modal task-form-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{isCreating ? 'Create New Task' : 'Edit Task'}</h2>
              <button
                className="close-button"
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label htmlFor="name">Task Name*</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={taskFormData.name || ''}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={taskFormData.description || ''}
                  onChange={handleFormChange}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="eventId">Event*</label>
                  <select
                    id="eventId"
                    name="eventId"
                    value={
                      typeof taskFormData.eventId === 'string' ? taskFormData.eventId : taskFormData.eventId?._id || ''
                    }
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select Event</option>
                    {events.map((event) => (
                      <option key={event._id} value={event._id || event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="deadline">Deadline*</label>
                  <input
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={taskFormData.deadline ? (taskFormData.deadline as string).split('T')[0] : ''}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    name="priority"
                    value={taskFormData.priority || 'medium'}
                    onChange={handleFormChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={taskFormData.status || 'pending'}
                    onChange={handleFormChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button" disabled={loading}>
                  {loading ? 'Saving...' : isCreating ? 'Create Task' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && !isEditing && !isCreating && (
        <div className="modal task-details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Task Details</h2>
              <button className="close-button" onClick={() => setSelectedTask(null)}>
                &times;
              </button>
            </div>

            <div className="task-details">
              <div className="detail-header">
                <h3>{selectedTask.name}</h3>
                <div className="detail-meta">
                  {renderPriorityBadge(selectedTask.priority)}
                  {renderStatusBadge(selectedTask.status)}
                </div>
              </div>

              {selectedTask.description && (
                <div className="detail-description">
                  <h4>Description</h4>
                  <p>{selectedTask.description}</p>
                </div>
              )}

              <div className="detail-info">
                <div className="info-item">
                  <span className="info-label">Event:</span>
                  <span className="info-value">
                    {getEventName(
                      typeof selectedTask.eventId === 'string' ? selectedTask.eventId : selectedTask.eventId._id,
                    )}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Deadline:</span>
                  <span className="info-value">{renderDeadline(selectedTask)}</span>
                </div>

                {selectedTask.createdAt && (
                  <div className="info-item">
                    <span className="info-label">Created:</span>
                    <span className="info-value">{format(parseISO(selectedTask.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                )}

                {selectedTask.completedAt && (
                  <div className="info-item">
                    <span className="info-label">Completed:</span>
                    <span className="info-value">{format(parseISO(selectedTask.completedAt), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>

              {taskLogs.length > 0 && (
                <div className="task-history">
                  <h4>Task History</h4>
                  <div className="history-timeline">
                    {taskLogs.map((log) => (
                      <div key={log._id} className="timeline-item">
                        <div className="timeline-status">{renderStatusBadge(log.status)}</div>
                        <div className="timeline-info">
                          <div className="timeline-user">{log.user?.displayName || 'Unknown User'}</div>
                          <div className="timeline-date">{format(parseISO(log.changedAt), 'MMM d, yyyy h:mm a')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-actions">
                <button className="edit-button" onClick={() => handleEditTask(selectedTask)}>
                  Edit Task
                </button>

                {selectedTask.status !== 'completed' && (
                  <button className="complete-button" onClick={() => handleCompleteTask(selectedTask._id)}>
                    Mark as Complete
                  </button>
                )}

                <button
                  className="delete-button"
                  onClick={() => {
                    handleDeleteTask(selectedTask._id);
                    setSelectedTask(null);
                  }}
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerTaskScreen;
