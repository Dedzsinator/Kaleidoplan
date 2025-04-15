import { Event } from '../app/models/types';
import { fetchEventsFromApi, fetchEventByIdFromApi } from './api';

// Define proper API response types
interface ApiResponse {
  events?: any[];
  [key: string]: any;
}

// Fix the interface to only omit fields that need a different type
// and explicitly declare properties with different types
interface MongoDBEvent extends Omit<Event, "id" | "slideshowImages" | "startDate" | "endDate"> {
  _id?: string;
  id?: string;
  startDate: Date | string;
  endDate: Date | string;
  coverImage?: string;
  slideshowImages?: string[] | string; // This can be string in MongoDB but array in frontend
}

// Debug helper to log event data structure
const logEventData = (event: any, prefix: string = '') => {
  if (!event) return;
  console.log(`${prefix} Event ID:`, event._id || event.id);
  console.log(`${prefix} Fields:`, Object.keys(event));
  console.log(`${prefix} Images:`, {
    coverImage: event.coverImage?.substring(0, 30),
    coverImageUrl: event.coverImageUrl?.substring(0, 30),
    hasSlideshow: Array.isArray(event.slideshowImages),
    slideshowCount: Array.isArray(event.slideshowImages) ? event.slideshowImages.length : 0
  });
  console.log(`${prefix} Location:`, {
    location: event.location,
    coordinates: `${event.latitude},${event.longitude}`,
  });
};

// Calculate event status based on dates
const calculateStatus = (startDate: Date, endDate: Date): string => {
  const now = new Date();
  if (startDate <= now && endDate >= now) {
    return 'ongoing';
  } else if (startDate > now) {
    return 'upcoming';
  } else {
    return 'completed';
  }
};

// Get all events (for guest view) - MongoDB only implementation
export async function getEvents(options: { forceRefresh?: boolean } = {}): Promise<Event[]> {
  try {
    console.log('EventService: Fetching events from MongoDB server');

    // Always force refresh in dev mode
    const opts = {
      forceRefresh: process.env.NODE_ENV === 'development' || options.forceRefresh
    };

    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await fetchEventsFromApi({ ...opts, timestamp });

    console.log('API response type:', typeof response);

    // Handle both { events: [...] } and direct array formats
    let eventsData: any[] = [];
    if (Array.isArray(response)) {
      eventsData = response;
    } else if (response && typeof response === 'object' && 'events' in response && Array.isArray(response.events)) {
      eventsData = response.events;
    }

    if (!eventsData || eventsData.length === 0) {
      console.warn('EventService: MongoDB returned empty events array');
      return [];
    }

    console.log('EventService: Successfully got MongoDB data with', eventsData.length, 'events');
    console.log('Sample event fields:', Object.keys(eventsData[0] || {}));

    // Log the first event to debug structure issues
    if (eventsData[0]) {
      logEventData(eventsData[0], 'First event:');
    }

    // Map and normalize all events
    const normalizedEvents = eventsData.map((event: any) => {
      // Ensure we have a stable ID
      const eventId = event.id || (event._id ? event._id.toString() : `temp-${Math.random()}`);

      // Normalize image URLs
      const coverImageUrl = event.coverImageUrl || event.coverImage || '';

      // Handle slideshow images (could be array, string, or missing)
      let slideshowImages: string[] = [];
      if (Array.isArray(event.slideshowImages)) {
        slideshowImages = event.slideshowImages;
      } else if (typeof event.slideshowImages === 'string' && event.slideshowImages.trim() !== '') {
        slideshowImages = event.slideshowImages
          .split(',')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0);
      } else if (coverImageUrl) {
        slideshowImages = [coverImageUrl];
      }

      // Parse dates safely
      const startDate = new Date(event.startDate || Date.now());
      const endDate = new Date(event.endDate || Date.now());

      // Create normalized event object
      return {
        ...event,
        id: eventId,
        coverImageUrl,
        slideshowImages,
        startDate,
        endDate,
        status: event.status || calculateStatus(startDate, endDate),
        // Ensure location fields exist
        location: event.location || 'Location not specified',
        latitude: event.latitude || 0,
        longitude: event.longitude || 0,
        latitudeDelta: event.latitudeDelta || 0.01,
        longitudeDelta: event.longitudeDelta || 0.01,
        color: event.color || '#4285F4' // Provide a default color
      } as Event;
    });

    console.log(`EventService: Processed ${normalizedEvents.length} events from MongoDB`);
    return normalizedEvents;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

// Get single event by ID - MongoDB only implementation
export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    console.log(`EventService: Fetching event ${eventId} from MongoDB`);

    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const event = await fetchEventByIdFromApi(eventId, { timestamp });

    if (!event) {
      console.warn(`EventService: Event ${eventId} not found in MongoDB`);
      return null;
    }

    // Log full event data for debugging
    logEventData(event, 'Single event:');

    // Normalize fields
    let slideshowImages: string[] = [];
    if (Array.isArray(event.slideshowImages)) {
      slideshowImages = event.slideshowImages;
    } else if (typeof event.slideshowImages === 'string' && event.slideshowImages.trim() !== '') {
      slideshowImages = event.slideshowImages
        .split(',')
        .map((url: string) => url.trim())
        .filter((url: string) => url.length > 0);
    } else if (event.coverImageUrl || event.coverImage) {
      slideshowImages = [(event.coverImageUrl || event.coverImage || '')];
    }

    // Normalize fields just like in getEvents
    const normalizedEvent = {
      ...event,
      id: event.id || (event._id ? event._id.toString() : eventId),
      coverImageUrl: event.coverImageUrl || event.coverImage || '',
      slideshowImages,
      startDate: new Date(event.startDate || Date.now()),
      endDate: new Date(event.endDate || Date.now()),
      status: event.status || calculateStatus(
        new Date(event.startDate || Date.now()),
        new Date(event.endDate || Date.now())
      ),
      // Ensure location fields exist
      location: event.location || 'Location not specified',
      latitude: event.latitude || 0,
      longitude: event.longitude || 0,
      latitudeDelta: event.latitudeDelta || 0.01,
      longitudeDelta: event.longitudeDelta || 0.01,
      color: event.color || '#4285F4' // Provide a default color
    } as Event;

    return normalizedEvent;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    return null;
  }
}