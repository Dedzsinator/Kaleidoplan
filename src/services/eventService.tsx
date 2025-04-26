import { Event, Performer } from '../app/models/types';
import { fetchEventsFromApi, fetchEventByIdFromApi } from './api';

// Define proper API response types
interface ApiResponse {
  events?: Record<string, unknown>[];
  [key: string]: unknown;
}

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

// Helper to safely parse dates from unknown input
const safeParseDate = (dateValue: unknown): Date => {
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
};

// Helper to safely parse numbers from unknown input
const safeParseNumber = (numValue: unknown, defaultValue: number): number => {
  if (typeof numValue === 'number') return numValue;
  if (typeof numValue === 'string') {
    const parsed = parseFloat(numValue);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
};

// Helper to normalize a single raw event object to the Event type
const normalizeRawEvent = (rawEvent: Record<string, unknown>, fallbackId?: string): Event => {
  // --- ID ---
  const eventId = String(rawEvent._id || rawEvent.id || fallbackId || '');

  // --- Images ---
  const coverImageUrl = String(rawEvent.coverImageUrl || rawEvent.coverImage || '');
  let slideshowImages: string[] = [];
  const rawSlideshow = rawEvent.slideshowImages;

  if (Array.isArray(rawSlideshow)) {
    slideshowImages = rawSlideshow.filter((img): img is string => typeof img === 'string');
  } else if (typeof rawSlideshow === 'string') {
    slideshowImages = rawSlideshow
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  } else if (coverImageUrl) {
    slideshowImages = [coverImageUrl];
  }

  // --- Dates ---
  const startDate = safeParseDate(rawEvent.startDate);
  const endDate = safeParseDate(rawEvent.endDate);

  // --- Status ---
  const status = typeof rawEvent.status === 'string' ? rawEvent.status : calculateStatus(startDate, endDate);

  // --- Location/Coords ---
  const latitude = safeParseNumber(rawEvent.latitude, 0);
  const longitude = safeParseNumber(rawEvent.longitude, 0);
  const latitudeDelta = safeParseNumber(rawEvent.latitudeDelta, 0.01);
  const longitudeDelta = safeParseNumber(rawEvent.longitudeDelta, 0.01);

  // --- Color ---
  const color = typeof rawEvent.color === 'string' ? rawEvent.color : '#4285F4';

  // --- Performers ---
  let performers: Performer[] | undefined = undefined;
  if (Array.isArray(rawEvent.performers)) {
    performers = rawEvent.performers.filter((p): p is Performer => typeof p === 'object' && p !== null);
  }

  // Construct the final Event object
  return {
    name: String(rawEvent.name || 'Unnamed Event'),
    startDate: startDate,
    endDate: endDate,
    color: color,
    status: status,
    id: eventId,
    _id: String(rawEvent._id || ''),
    description: typeof rawEvent.description === 'string' ? rawEvent.description : undefined,
    location: typeof rawEvent.location === 'string' ? rawEvent.location : undefined,
    coverImageUrl: coverImageUrl,
    slideshowImages: slideshowImages,
    playlistId: typeof rawEvent.playlistId === 'string' ? rawEvent.playlistId : undefined,
    createdBy: typeof rawEvent.createdBy === 'string' ? rawEvent.createdBy : undefined,
    createdAt: rawEvent.createdAt as string | Date | undefined,
    updatedAt: rawEvent.updatedAt as string | Date | undefined,
    themeColor: typeof rawEvent.themeColor === 'string' ? rawEvent.themeColor : undefined,
    performers: performers,
    latitude: latitude,
    longitude: longitude,
    latitudeDelta: latitudeDelta,
    longitudeDelta: longitudeDelta,
    sponsorIds: Array.isArray(rawEvent.sponsorIds)
      ? rawEvent.sponsorIds.filter((id): id is string => typeof id === 'string')
      : undefined,
    ticketUrl: typeof rawEvent.ticketUrl === 'string' ? rawEvent.ticketUrl : undefined,
    type: typeof rawEvent.type === 'string' ? rawEvent.type : undefined,
    website: typeof rawEvent.website === 'string' ? rawEvent.website : undefined,
    spotifyPlaylistId: typeof rawEvent.spotifyPlaylistId === 'string' ? rawEvent.spotifyPlaylistId : undefined,
    coverImage: typeof rawEvent.coverImage === 'string' ? rawEvent.coverImage : undefined,
  };
};

export async function getEvents(options: { forceRefresh?: boolean } = {}): Promise<Event[]> {
  try {
    const opts = {
      forceRefresh: process.env.NODE_ENV === 'development' || options.forceRefresh,
    };
    const timestamp = new Date().getTime();

    try {
      const response = await fetchEventsFromApi({ ...opts, timestamp });

      let rawEventsData: Record<string, unknown>[] = [];
      if (Array.isArray(response)) {
        rawEventsData = response;
      } else if (response && typeof response === 'object' && Array.isArray(response.events)) {
        rawEventsData = response.events;
      }

      if (!rawEventsData.length) {
        console.warn('EventService: API returned empty events array');
        return [];
      }

      const normalizedEvents: Event[] = rawEventsData.map((rawEvent) => normalizeRawEvent(rawEvent));
      return normalizedEvents;
    } catch (error) {
      console.error('Error fetching events from API:', error);
      return [];
    }
  } catch (error) {
    console.error('Error in getEvents service:', error);
    return [];
  }
}

export const getEventById = async (eventId: string): Promise<Event> => {
  try {
    const rawEventData = await fetchEventByIdFromApi(eventId);

    if (!rawEventData) {
      throw new Error(`Event with ID ${eventId} not found.`);
    }

    const normalizedEvent: Event = normalizeRawEvent(rawEventData as Record<string, unknown>, eventId);
    return normalizedEvent;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    throw error;
  }
};
