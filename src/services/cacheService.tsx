import axios from 'axios';
import { Event } from '../app/models/types';

// Simple cache implementation
interface CacheItem<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

class ApiCache {
    private cache: Record<string, CacheItem<any>> = {};
    private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default TTL

    // Get item from cache
    get<T>(key: string): T | null {
        const item = this.cache[key];
        const now = Date.now();

        // Check if item exists and is not expired
        if (item && now < item.expiresAt) {
            console.log(`Cache hit for: ${key}, age: ${(now - item.timestamp) / 1000}s`);
            return item.data;
        }

        // Delete if expired
        if (item) {
            console.log(`Cache expired for: ${key}, removing`);
            delete this.cache[key];
        }

        return null;
    }

    // Set item in cache
    set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
        const now = Date.now();
        this.cache[key] = {
            data,
            timestamp: now,
            expiresAt: now + ttl
        };
        console.log(`Cached: ${key}, expires in ${ttl / 1000}s`);
    }

    // Clear specific item
    clear(key: string): void {
        delete this.cache[key];
        console.log(`Cleared cache for: ${key}`);
    }

    // Clear all cache
    clearAll(): void {
        this.cache = {};
        console.log('Cleared all cache');
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
        'Pragma': 'no-cache',
        'Expires': '0',
    },
    timeout: 10000,
});

// Cache keys
const CACHE_KEYS = {
    ALL_EVENTS: 'events:all',
    EVENT_DETAIL: (id: string) => `event:${id}`
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
            console.log('Using cached events data');
            return cachedEvents;
        }
    }

    try {
        console.log('EventApiService: Fetching events from server...');

        // Add timestamp to prevent browser caching (not our own cache)
        const timestamp = new Date().getTime();
        const response = await eventApiClient.get(`/public/events?_=${timestamp}`);
        console.log('Raw API response:', JSON.stringify(response.data).substring(0, 200) + '...');

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
            console.log(`Using cached event data for ID: ${eventId}`);
            return cachedEvent;
        }
    }

    try {
        console.log(`Fetching event with ID: ${eventId} from server...`);

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