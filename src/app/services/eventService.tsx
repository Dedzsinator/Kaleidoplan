import { Event } from '@models/types';
import api from './api';

// Get an event by ID
export const getEventById = async (eventId: string): Promise<Event | null> => {
  try {
    return await api.get(`/events/${eventId}`);
  } catch (error) {
    console.error(`Error fetching event ${eventId} in eventService:`, error);
    throw error; // Let React Query handle the error
  }
};

export const getEvents = async (params: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sortBy?: string;
  startDate?: string;
  endDate?: string;
  forceRefresh?: boolean;
}) => {
  try {
    // Add timestamp to force fresh data
    const timestamp = Date.now();
    const { forceRefresh, ...apiParams } = params;

    // Build query params
    const queryParams = new URLSearchParams();

    // Add timestamp to bust cache
    queryParams.append('_t', timestamp.toString());

    // Add other params
    Object.entries(apiParams).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const response = await api.get(`/events${queryString ? `?${queryString}` : ''}`);

    let events: Event[] = [];

    // Handle different response formats
    if (Array.isArray(response)) {
      events = response;
    } else if (response && response.events) {
      events = response.events;
    }

    const processedEvents = events.map((event) => {
      // Create a deep copy to avoid reference issues
      const processedEvent = { ...event };

      // If no slideshowImages, initialize as empty array
      if (!processedEvent.slideshowImages) {
        processedEvent.slideshowImages = [];
      }

      // Check if slideshowImages is an array with a string that contains commas
      // This happens when the MongoDB data comes from CSV imports
      if (
        Array.isArray(processedEvent.slideshowImages) &&
        processedEvent.slideshowImages.length === 1 &&
        typeof processedEvent.slideshowImages[0] === 'string' &&
        processedEvent.slideshowImages[0].includes(',')
      ) {
        // Split the single string entry into multiple URLs
        processedEvent.slideshowImages = processedEvent.slideshowImages[0]
          .split(',')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0);
      }

      // Handle the case where slideshowImages might be a direct string
      if (typeof processedEvent.slideshowImages === 'string') {
        processedEvent.slideshowImages = processedEvent.slideshowImages
          .split(',')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0);
      }

      // If still no images and coverImageUrl exists, use it
      if (
        Array.isArray(processedEvent.slideshowImages) &&
        processedEvent.slideshowImages.length === 0 &&
        processedEvent.coverImageUrl
      ) {
        processedEvent.slideshowImages = [processedEvent.coverImageUrl];
      }

      return processedEvent;
    });

    return processedEvents;
  } catch (error) {
    console.error('Error fetching events in eventService:', error);
    throw error; // Maintain original error handling
  }
};

export const createEvent = async (eventData: Partial<Event>): Promise<Event> => {
  try {
    const response = await api.post('/events', eventData);
    return response as Event;
  } catch (error) {
    console.error('Error creating event in eventService:', error);
    throw error;
  }
};

// Update an existing event
export const updateEvent = async (eventId: string, eventData: Partial<Event>): Promise<Event> => {
  try {
    return await api.put(`/events/${eventId}`, eventData);
  } catch (error) {
    console.error(`Error updating event ${eventId} in eventService:`, error);
    throw error;
  }
};

// Delete an event
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    return await api.delete(`/events/${eventId}`);
  } catch (error) {
    console.error(`Error deleting event ${eventId} in eventService:`, error);
    throw error;
  }
};
