import axios from 'axios';
import { Event, CacheItem } from '../app/models/types';

class ApiCache {
  private cache: Record<string, CacheItem<unknown>> = {};
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default TTL

  get<T>(key: string): T | null {
    const item = this.cache[key] as CacheItem<T> | undefined;
    const now = Date.now();

    if (item && now < item.expiresAt) {
      return item.data;
    }

    if (item) {
      delete this.cache[key];
    }

    return null;
  }

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    this.cache[key] = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    };
  }

  // Clear specific item
  clear(key: string): void {
    delete this.cache[key];
  }

  // Clear all cache
  clearAll(): void {
    this.cache = {};
  }
}

// Initialize cache
const apiCache = new ApiCache();

// Get the correct API URL for web
const getBaseUrl = () => {
  return process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
};

// Create direct API client for events with cache busting
const eventApiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Expires: '0',
  },
  timeout: 10000,
});

// Cache keys
const CACHE_KEYS = {
  ALL_EVENTS: 'events:all',
  EVENT_DETAIL: (id: string) => `event:${id}`,
};

interface FetchOptions {
  bypassCache?: boolean;
  cacheTTL?: number;
}

export const fetchEventsFromApi = async (options: FetchOptions = {}): Promise<Event[]> => {
  const { bypassCache = false, cacheTTL = 5 * 60 * 1000 } = options;
  const cacheKey = CACHE_KEYS.ALL_EVENTS;

  // Check cache first unless bypass is specified
  if (!bypassCache) {
    const cachedEvents = apiCache.get<Event[]>(cacheKey);
    if (cachedEvents) {
      return cachedEvents;
    }
  }

  try {
    // Add timestamp to prevent browser caching (not our own cache)
    const timestamp = new Date().getTime();
    const response = await eventApiClient.get(`/api/public/events?_=${timestamp}`);

    let events: Event[] = [];

    if (response.data && response.data.events) {
      // Server returns { events: [...] }
      events = response.data.events;
    } else if (Array.isArray(response.data)) {
      // Server returns direct array
      events = response.data;
    } else {
      console.warn('Unexpected API response format');
      events = [];
    }

    // Store in cache
    apiCache.set(cacheKey, events, cacheTTL);

    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

// Get a specific event (with caching)
export const fetchEventById = async (eventId: string, options: FetchOptions = {}): Promise<Event | null> => {
  const { bypassCache = false, cacheTTL = 10 * 60 * 1000 } = options;
  const cacheKey = CACHE_KEYS.EVENT_DETAIL(eventId);

  // Check cache first
  if (!bypassCache) {
    const cachedEvent = apiCache.get<Event>(cacheKey);
    if (cachedEvent) {
      return cachedEvent;
    }
  }

  try {
    const response = await eventApiClient.get(`/events/${eventId}`);

    if (!response.data) {
      return null;
    }

    // Store in cache
    apiCache.set(cacheKey, response.data, cacheTTL);

    return response.data;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    return null;
  }
};

// Cache control methods
export const clearEventCache = () => apiCache.clear(CACHE_KEYS.ALL_EVENTS);
export const clearEventDetailCache = (eventId: string) => apiCache.clear(CACHE_KEYS.EVENT_DETAIL(eventId));
export const clearAllCaches = () => apiCache.clearAll();

// Additional utility to force refresh events
export const refreshEvents = async (): Promise<Event[]> => {
  return fetchEventsFromApi({ bypassCache: true });
};
