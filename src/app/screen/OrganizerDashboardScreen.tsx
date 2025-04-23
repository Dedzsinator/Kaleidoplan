import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../../services/api'
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

interface Task {
  _id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed';
  deadline: string;
  eventId: string | { _id: string; id?: string } | any; // Fixed to handle different eventId formats
  priority: 'low' | 'medium' | 'high';
}

const OrganizerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [managedEvents, setManagedEvents] = useState<ManagedEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskCompletingIds, setTaskCompletingIds] = useState<string[]>([]); // Track tasks being completed
  const [error, setError] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const relevantTasks = React.useMemo(() => {
    if (!managedEvents || !tasks) return [];

    // Get all managed event IDs (in both formats)
    const managedEventIds = new Set(
      managedEvents.map(event => event.id || event._id)
    );

    // Filter tasks to only include those associated with managed events
    return tasks.filter(task => {
      // Extract the task's eventId in string format
      let taskEventId = '';
      if (typeof task.eventId === 'string' || typeof task.eventId === 'number') {
        taskEventId = String(task.eventId);
      } else if (task.eventId && typeof task.eventId === 'object') {
        taskEventId = String(task.eventId._id || task.eventId.id || '');
      }

      // Check if this task belongs to any of the managed events
      return taskEventId && managedEventIds.has(taskEventId);
    });
  }, [tasks, managedEvents]);

  // Count metrics based on relevant tasks only
  const taskMetrics = React.useMemo(() => {
    return {
      total: relevantTasks.length,
      pending: relevantTasks.filter(t => t.status !== 'completed').length,
      completed: relevantTasks.filter(t => t.status === 'completed').length
    };
  }, [relevantTasks]);

  const tasksByEvent = tasks.reduce((acc, task) => {
    // Extract the event ID, handling all possible formats
    let taskEventId = '';

    if (!task.eventId) {
      // Skip if eventId is not defined
      return acc;
    }

    if (typeof task.eventId === 'string' || typeof task.eventId === 'number') {
      // Simple string or number ID (MongoDB stores these as numbers)
      taskEventId = String(task.eventId);
    } else if (typeof task.eventId === 'object') {
      // Object with potential _id or id property
      taskEventId = String(task.eventId?._id || task.eventId?.id || '');
    }

    if (!taskEventId) {
      // Still no eventId found, try logging for debugging and skip
      console.log('Task without valid eventId:', task);
      return acc;
    }

    // Initialize array if needed
    if (!acc[taskEventId]) {
      acc[taskEventId] = [];
    }

    // Add task to the appropriate event group
    acc[taskEventId].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Toggle expanded state for an event
  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setTaskCompletingIds(prev => [...prev, taskId]);
      setError('');

      console.log(`Completing task with ID: ${taskId}`);

      // Use api.put with the correct endpoint format
      await api.put(`/tasks/${taskId}`, {
        status: 'completed',
      });

      console.log(`Task ${taskId} marked as completed`);

      // Update local task state
      setTasks(prevTasks => prevTasks.map(task =>
        task._id === taskId
          ? { ...task, status: 'completed' }
          : task
      ));
    } catch (err: any) {
      setError(`Failed to complete task: ${err.message || 'Unknown error'}`);
      console.error('Error completing task:', err);
    } finally {
      setTaskCompletingIds(prev => prev.filter(id => id !== taskId));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        console.log('Fetching events and tasks...');

        // Use api.get with the correct paths
        const [eventsData, tasksData] = await Promise.all([
          api.get('/events/managed'),
          api.get('/tasks')
        ]);

        console.log("Received events:", eventsData);
        console.log("Received tasks:", tasksData);

        // Handle different response formats
        const formattedEvents = eventsData?.events || eventsData || [];

        // tasksData is already JSON parsed when using api.get
        const formattedTasks = tasksData?.tasks || tasksData || [];

        console.log("Formatted tasks:", formattedTasks);

        // Initialize all events as expanded
        const initialExpandedState = formattedEvents.reduce((acc: Record<string, boolean>, event: ManagedEvent) => {
          const eventId = event?.id || event?._id;
          if (eventId) {
            acc[eventId] = true;
          }
          return acc;
        }, {});

        setManagedEvents(formattedEvents);
        setTasks(formattedTasks);
        setExpandedEvents(initialExpandedState);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Debug logging
  useEffect(() => {
    console.log("Tasks by event:", tasksByEvent);
    console.log("All tasks:", tasks);
    console.log("Managed events:", managedEvents);
  }, [tasksByEvent, tasks, managedEvents]);

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
          <h3>Total Tasks</h3>
          <p className="summary-value">{taskMetrics.total}</p>
        </div>

        <div className="summary-card">
          <h3>Pending Tasks</h3>
          <p className="summary-value">{taskMetrics.pending}</p>
        </div>

        <div className="summary-card">
          <h3>Completed Tasks</h3>
          <p className="summary-value">{taskMetrics.completed}</p>
        </div>
      </div>

      <div className="action-buttons">
        <Link to="/events/create" className="create-button">
          Create New Event
        </Link>
        <Link to="/tasks" className="tasks-button">
          Manage Tasks
        </Link>
      </div>

      <h2>Your Events & Tasks</h2>

      {loading ? (
        <div className="loading-spinner">Loading events and tasks...</div>
      ) : (
        <div className="events-with-tasks">
          {managedEvents.length === 0 ? (
            <p>You don't have any events to manage yet.</p>
          ) : (
            managedEvents.map((event) => {
              // Get the event ID in both formats
              const eventId = event.id || event._id;

              return (
                <div key={eventId} className="event-container">
                  <div className="event-header" onClick={() => toggleEventExpanded(eventId)}>
                    <div className="event-indicator" style={{
                      backgroundColor: event.status === 'ongoing' ? '#4CAF50' :
                        event.status === 'upcoming' ? '#2196F3' : '#9E9E9E'
                    }}></div>
                    <h3 className="event-title">{event.name}</h3>
                    <span className={`status-badge ${event.status}`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                    <span className="event-date">
                      {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                    </span>
                    <span className="expand-indicator">
                      {expandedEvents[eventId] ? '▼' : '►'}
                    </span>
                  </div>

                  {expandedEvents[eventId] && (
                    <div className="event-details">
                      <div className="task-section">
                        <h4>Tasks</h4>
                        {/* Check for tasks using both ID formats */}
                        {(!tasksByEvent[eventId] && !tasksByEvent[event._id]) ||
                          (tasksByEvent[eventId]?.length === 0 && tasksByEvent[event._id]?.length === 0) ? (
                          <p className="no-tasks">No tasks assigned to this event</p>
                        ) : (
                          <ul className="task-list">
                            {/* Try both event ID formats for task lookup */}
                            {(tasksByEvent[eventId] || tasksByEvent[event._id] || []).map(task => (
                              <li
                                key={task._id}
                                className={`task-item ${task.status}`}
                              >
                                <div className="task-name">
                                  {task.status === 'completed' ? '✓ ' : ''}
                                  {task.name}
                                </div>
                                <div className="task-metadata">
                                  <span className={`priority-badge ${task.priority}`}>
                                    {task.priority}
                                  </span>
                                  <span className="deadline">
                                    Due: {new Date(task.deadline).toLocaleDateString()}
                                  </span>
                                </div>

                                {/* Add Complete button if task is not already completed */}
                                {task.status !== 'completed' && (
                                  <button
                                    className="complete-button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCompleteTask(task._id);
                                    }}
                                    disabled={taskCompletingIds.includes(task._id)}
                                  >
                                    {taskCompletingIds.includes(task._id) ? 'Working...' : 'Complete'}
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="task-actions">
                          <Link to={`/tasks?eventId=${eventId}`} className="view-tasks">
                            Manage Tasks
                          </Link>
                          <Link to={`/tasks/create?eventId=${eventId}`} className="add-task">
                            Add Task
                          </Link>
                        </div>
                      </div>

                      <div className="event-actions">
                        <Link to={`/events/edit/${eventId}`} className="edit-link">
                          Edit Event
                        </Link>
                        <Link to={`/analytics/${eventId}`} className="analytics-link">
                          View Analytics
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;
