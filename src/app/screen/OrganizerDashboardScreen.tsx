import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ManagedEvent, Task, TaskStatus } from '../models/types';
import { useAuth } from '../contexts/AuthContext';
import api from '@services/api';
import EventImageUploader from '../components/ui/EventImageUploader';
import EventImageGallery from '../components/ui/EventImageGallery';
import { uploadEventImage, uploadEventSlideshowImages } from '@services/imageUpload';
import { Event, ImageUploadResponse, EventImageGallery as EventImageGalleryType } from '../models/types';
import '../styles/DashboardScreen.css';

const OrganizerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [managedEvents, setManagedEvents] = useState<ManagedEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskCompletingIds, setTaskCompletingIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [eventImagesMap, setEventImagesMap] = useState<Record<string, EventImageGalleryType>>({});
  const [uploading, setUploading] = useState<boolean>(false);
  const [pendingUploads, setPendingUploads] = useState<Record<string, string[]>>({});
  const [uploadError, setUploadError] = useState<string>('');

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Partial<Task> | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  const updateEventAfterImageUpload = async (
    eventId: string,
    imageUrl: string,
    imageType: 'cover' | 'slideshow',
  ): Promise<void> => {
    try {
      setUploading(true);

      // Create update object based on image type
      const updateData: Partial<Event> = {};

      if (imageType === 'slideshow') {
        // First get current event data to append to existing slideshow images
        const currentEvent = managedEvents.find((e) => e.id === eventId || e._id === eventId);

        if (currentEvent) {
          // If slideshow images already exist, append the new one
          // Ensure proper type handling
          const currentSlideshow = currentEvent.slideshowImages || [];
          updateData.slideshowImages = Array.isArray(currentSlideshow) ? [...currentSlideshow, imageUrl] : [imageUrl];
        } else {
          updateData.slideshowImages = [imageUrl];
        }
      }

      // Update the event with the new image data
      await api.put(`/events/${eventId}`, updateData);

      // Refresh the events data to show the updated images
      const updatedEventsData = await api.get('/events/managed');
      const formattedEvents = updatedEventsData?.events || updatedEventsData || [];
      setManagedEvents(formattedEvents);

      // Add the new image to our local image gallery state
      setEventImagesMap((prevMap) => {
        const currentEventGallery = prevMap[eventId] || {
          eventId,
          images: [],
          isLoading: false,
          error: null,
        };

        return {
          ...prevMap,
          [eventId]: {
            ...currentEventGallery,
            images: imageType === 'slideshow' ? [...currentEventGallery.images, imageUrl] : currentEventGallery.images,
          },
        };
      });

      setUploadError('');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to update event with new image');
      console.error('Error updating event after image upload:', err);
    } finally {
      setUploading(false);
    }
  };

  const collectImageAfterUpload = (eventId: string, imageUrl: string, imageType: 'cover' | 'slideshow'): void => {
    if (imageType === 'slideshow') {
      // Add to pending uploads without trying to update the event
      setPendingUploads((prev) => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), imageUrl],
      }));

      // Update local UI state to show the image
      setEventImagesMap((prevMap) => {
        const currentEventGallery = prevMap[eventId] || {
          eventId,
          images: [],
          isLoading: false,
          error: null,
        };

        return {
          ...prevMap,
          [eventId]: {
            ...currentEventGallery,
            images: [...currentEventGallery.images, imageUrl],
            isPending: true,
          },
        };
      });
    } else if (imageType === 'cover') {
      // For cover images, update the pendingUploads too, but with a special marker
      setPendingUploads((prev) => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), `cover:${imageUrl}`],
      }));

      // Update local UI state to show the cover image
      setEventImagesMap((prevMap) => {
        const currentEventGallery = prevMap[eventId] || {
          eventId,
          images: [],
          isLoading: false,
          error: null,
        };

        return {
          ...prevMap,
          [eventId]: {
            ...currentEventGallery,
            coverImage: imageUrl,
            isPending: true,
          },
        };
      });
    }
  };

  const saveGalleryImages = async (eventId: string): Promise<void> => {
    try {
      setUploading(true);
      setError('');

      // Skip if no pending uploads
      if (!pendingUploads[eventId] || pendingUploads[eventId].length === 0) {
        return;
      }

      // Since we're not actually updating the server, just clear pending state
      setPendingUploads((prev) => {
        const newPending = { ...prev };
        delete newPending[eventId];
        return newPending;
      });

      // Update local image gallery state to remove pending state
      setEventImagesMap((prevMap) => {
        const currentEventGallery = prevMap[eventId];
        if (currentEventGallery) {
          return {
            ...prevMap,
            [eventId]: {
              ...currentEventGallery,
              isPending: false,
            },
          };
        }
        return prevMap;
      });

      setUploadError('');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to save gallery images');
      console.error('Error saving gallery images:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (eventId: string, imageIndex: number): Promise<void> => {
    try {
      // Get current event data
      const currentEvent = managedEvents.find((e) => e.id === eventId || e._id === eventId);

      if (currentEvent && currentEvent.slideshowImages && Array.isArray(currentEvent.slideshowImages)) {
        // Create a copy of the slideshow images and remove the selected image
        const updatedSlideshow = [...currentEvent.slideshowImages];
        updatedSlideshow.splice(imageIndex, 1);

        // Update the event with the modified slideshow
        await api.put(`/events/${eventId}`, { slideshowImages: updatedSlideshow });

        // Refresh events data
        const updatedEventsData = await api.get('/events/managed');
        const formattedEvents = updatedEventsData?.events || updatedEventsData || [];
        setManagedEvents(formattedEvents);

        // Update local image gallery state
        setEventImagesMap((prevMap) => {
          const currentEventGallery = prevMap[eventId];

          if (currentEventGallery) {
            const updatedImages = [...currentEventGallery.images];
            updatedImages.splice(imageIndex, 1);

            return {
              ...prevMap,
              [eventId]: {
                ...currentEventGallery,
                images: updatedImages,
              },
            };
          }

          return prevMap;
        });
      }
    } catch (err) {
      console.error('Error removing image:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove image');
    }
  };

  useEffect(() => {
    // When events are loaded, initialize the image galleries
    if (managedEvents.length > 0) {
      const initialEventImagesMap: Record<string, EventImageGalleryType> = {};

      managedEvents.forEach((event) => {
        const eventId = event.id || event._id;
        const slideshowImages = event.slideshowImages || [];

        initialEventImagesMap[eventId] = {
          eventId,
          images: Array.isArray(slideshowImages) ? slideshowImages : [],
          isLoading: false,
          error: null,
        };
      });

      setEventImagesMap(initialEventImagesMap);
    }
  }, [managedEvents]);

  const relevantTasks = React.useMemo(() => {
    if (!managedEvents || !tasks) return [];

    // Get all managed event IDs (in both formats)
    const managedEventIds = new Set(managedEvents.map((event) => event.id || event._id));

    // Filter tasks to only include those associated with managed events
    return tasks.filter((task) => {
      // Extract the task's eventId in string format
      let taskEventId = '';
      if (typeof task.eventId === 'string' || typeof task.eventId === 'number') {
        taskEventId = String(task.eventId);
      } else if (task.eventId && typeof task.eventId === 'object') {
        taskEventId = String(task.eventId._id);
      }

      // Check if this task belongs to any of the managed events
      return taskEventId && managedEventIds.has(taskEventId);
    });
  }, [tasks, managedEvents]);

  const taskMetrics = React.useMemo(() => {
    return {
      total: relevantTasks.length,
      pending: relevantTasks.filter((t) => t.status !== 'completed').length,
      completed: relevantTasks.filter((t) => t.status === 'completed').length,
    };
  }, [relevantTasks]);

  const tasksByEvent = tasks.reduce(
    (acc, task) => {
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
        taskEventId = String(task.eventId?._id);
      }

      if (!taskEventId) {
        // Still no eventId found, try logging for debugging and skip

        return acc;
      }

      // Initialize array if needed
      if (!acc[taskEventId]) {
        acc[taskEventId] = [];
      }

      // Add task to the appropriate event group
      acc[taskEventId].push(task);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setTaskCompletingIds((prev) => [...prev, taskId]);
      setError('');

      // Use api.put with the correct endpoint format
      await api.put(`/tasks/${taskId}`, {
        status: 'completed',
        updatedBy: currentUser?.uid,
        updatedAt: new Date().toISOString(),
      });

      // Update local task state
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task._id === taskId
            ? {
                ...task,
                status: 'completed',
                updatedBy: currentUser?.uid,
                updatedAt: new Date().toISOString(),
              }
            : task,
        ),
      );
    } catch (err: unknown) {
      setError(`Failed to complete task: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error completing task:', err);
    } finally {
      setTaskCompletingIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleCreateTask = (eventId: string) => {
    // Find the event to get its name
    const event = managedEvents.find((e) => e.id === eventId || e._id === eventId);

    setIsCreatingTask(true);
    setCurrentTask({
      eventId: eventId,
      eventName: event?.name || '',
      status: 'pending' as TaskStatus,
      priority: 'medium',
      assignedTo: currentUser?.uid || '',
      createdBy: currentUser?.uid || '',
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setIsTaskModalOpen(true);
  };

  const handleViewTask = (task: Task) => {
    setIsCreatingTask(false);
    setCurrentTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentTask((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;

    try {
      setTaskSubmitting(true);
      setError('');

      // Ensure we have all required fields for Task type
      const taskData: Partial<Task> = {
        ...currentTask,
        assignedTo: currentTask.assignedTo || currentUser?.uid || '',
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.uid,
      };

      if (isCreatingTask) {
        // Create new task
        const response = await api.post<Task>('/tasks', taskData);

        // Use type guards to safely check properties
        if (response && typeof response === 'object' && ('_id' in response || 'taskId' in response)) {
          setTasks((prev) => [...prev, response as Task]);
        } else {
          // Refresh all tasks to ensure we get the latest data
          const tasksData = await api.get('/tasks');
          setTasks(tasksData?.tasks || []);
        }
      } else {
        // Update existing task - use taskId instead of _id if available
        const idToUse = currentTask._id;
        await api.put(`/tasks/${idToUse}`, taskData);

        // Update task in state
        setTasks((prev) => prev.map((task) => (task._id === idToUse ? { ...task, ...taskData } : task)));
      }

      // Close modal on success
      setIsTaskModalOpen(false);
      setCurrentTask(null);
    } catch (err: unknown) {
      setError(
        `Failed to ${isCreatingTask ? 'create' : 'update'} task: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      console.error(`Error ${isCreatingTask ? 'creating' : 'updating'} task:`, err);
    } finally {
      setTaskSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Use api.get with the correct paths
        const [eventsData, tasksData] = await Promise.all([api.get('/events/managed'), api.get('/tasks')]);

        // Handle different response formats
        const formattedEvents = eventsData?.events || eventsData || [];

        // tasksData is already JSON parsed when using api.get
        const formattedTasks = tasksData?.tasks || tasksData || [];

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
      } catch (err: unknown) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="dashboard-container organizer-dashboard">
      {/* Task Creation/Edit Modal */}
      {isTaskModalOpen && currentTask && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{isCreatingTask ? 'Create New Task' : 'Edit Task'}</h3>
              <button
                className="close-button"
                onClick={() => {
                  setIsTaskModalOpen(false);
                  setCurrentTask(null);
                }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="form-group">
                <label htmlFor="name">Task Name:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={currentTask.name || ''}
                  onChange={handleTaskInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description:</label>
                <textarea
                  id="description"
                  name="description"
                  value={currentTask.description || ''}
                  onChange={handleTaskInputChange}
                  rows={4}
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="assignedTo">Assigned To:</label>
                <input
                  type="text"
                  id="assignedTo"
                  name="assignedTo"
                  value={currentTask.assignedTo || currentUser?.uid || ''}
                  onChange={handleTaskInputChange}
                  placeholder="Firebase UID of assignee"
                />
                <small className="helper-text">Leave empty to assign to yourself</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="priority">Priority:</label>
                  <select
                    id="priority"
                    name="priority"
                    value={currentTask.priority || 'medium'}
                    onChange={handleTaskInputChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Status:</label>
                  <select
                    id="status"
                    name="status"
                    value={currentTask.status || 'pending'}
                    onChange={handleTaskInputChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="deadline">Deadline:</label>
                <input
                  type="date"
                  id="deadline"
                  name="deadline"
                  value={currentTask.deadline ? currentTask.deadline.toString().split('T')[0] : ''}
                  onChange={handleTaskInputChange}
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setIsTaskModalOpen(false);
                    setCurrentTask(null);
                  }}
                  disabled={taskSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button" disabled={taskSubmitting}>
                  {taskSubmitting ? 'Saving...' : isCreatingTask ? 'Create Task' : 'Update Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h1>Organizer Dashboard</h1>
      <h2>Welcome, {currentUser?.displayName || 'Organizer'}</h2>

      {error && <div className="error-message">{error}</div>}
      {uploadError && <div className="error-message">{uploadError}</div>}

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

              // Get current slideshow images
              const slideshowImages = Array.isArray(event.slideshowImages) ? event.slideshowImages : [];

              return (
                <div key={eventId} className="event-container">
                  <div className="event-header" onClick={() => toggleEventExpanded(eventId)}>
                    <div
                      className="event-indicator"
                      style={{
                        backgroundColor:
                          event.status === 'ongoing' ? '#4CAF50' : event.status === 'upcoming' ? '#2196F3' : '#9E9E9E',
                      }}
                    ></div>
                    <h3 className="event-title">{event.name}</h3>
                    <span className={`status-badge ${event.status}`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                    <span className="event-date">
                      {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                    </span>
                    <span className="expand-indicator">{expandedEvents[eventId] ? '▼' : '►'}</span>
                  </div>

                  {expandedEvents[eventId] && (
                    <div className="event-details">
                      {/* Image Management Section */}
                      <div className="image-management-section">
                        <h4>Event Images</h4>

                        {/* Cover image display */}
                        <div className="cover-image-container">
                          <h5>Cover Image</h5>
                          {event.coverImageUrl ? (
                            <img
                              src={event.coverImageUrl}
                              alt={`${event.name} cover`}
                              className="event-cover-thumbnail"
                            />
                          ) : (
                            <div className="no-cover-image">No cover image</div>
                          )}

                          {/* Cover image uploader */}
                          <EventImageUploader
                            eventId={eventId}
                            imageType="cover"
                            buttonLabel="Upload Cover Image"
                            onImageUploaded={(imageUrl) => collectImageAfterUpload(eventId, imageUrl, 'cover')}
                          />
                        </div>

                        {/* Slideshow images section */}
                        <div className="slideshow-images-container">
                          <h5>Event Gallery Images</h5>

                          {/* Display gallery if there are images */}
                          {Array.isArray(slideshowImages) && slideshowImages.length > 0 ? (
                            <EventImageGallery
                              images={slideshowImages}
                              pendingImages={pendingUploads[eventId] || []}
                              allowRemove={true}
                              onRemoveImage={(index) => handleRemoveImage(eventId, index)}
                            />
                          ) : (
                            <div className="no-slideshow-images">No gallery images</div>
                          )}

                          {/* Slideshow image uploader */}
                          <EventImageUploader
                            eventId={eventId}
                            imageType="slideshow"
                            allowMultiple={true}
                            buttonLabel="Add Gallery Images"
                            onImageUploaded={(imageUrl) => collectImageAfterUpload(eventId, imageUrl, 'slideshow')}
                            onMultipleImagesUploaded={(imageUrls) =>
                              imageUrls.forEach((url) => collectImageAfterUpload(eventId, url, 'slideshow'))
                            }
                          />
                        </div>
                        {pendingUploads[eventId] && pendingUploads[eventId].length > 0 && (
                          <button
                            className="save-gallery-button"
                            onClick={() => saveGalleryImages(eventId)}
                            disabled={uploading}
                          >
                            {uploading ? 'Saving...' : `Save ${pendingUploads[eventId].length} Images to Event`}
                          </button>
                        )}
                      </div>

                      <div className="task-section">
                        <h4>Tasks</h4>
                        {/* Add create task button in the header */}
                        <button className="add-task-btn" onClick={() => handleCreateTask(eventId)}>
                          + Add Task
                        </button>

                        {(!tasksByEvent[eventId] && !tasksByEvent[event._id]) ||
                        (tasksByEvent[eventId]?.length === 0 && tasksByEvent[event._id]?.length === 0) ? (
                          <p className="no-tasks">No tasks assigned to this event</p>
                        ) : (
                          <ul className="task-list">
                            {tasksByEvent[eventId]?.map((task) => (
                              <li
                                key={task._id || `task-${Math.random()}`}
                                className={`task-item ${task.status}`}
                                onClick={() => handleViewTask(task)}
                              >
                                <div className="task-name">
                                  {task.status === 'completed' ? '✓ ' : ''}
                                  {task.name}
                                </div>
                                <div className="task-metadata">
                                  <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                                  <span className="deadline">Due: {new Date(task.deadline).toLocaleDateString()}</span>
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

                                {/* Add Edit button */}
                                <button
                                  className="edit-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewTask(task);
                                  }}
                                >
                                  Edit
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Keep existing action links */}
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
