import { Event } from '../app/models/types';

// Cache for API responses
const cache: { [key: string]: { data: any, timestamp: number } } = {};
const CACHE_TTL = 60000; // 1 minute cache

// Fetch events from API with caching
export const fetchEventsFromApi = async (options: {
    forceRefresh?: boolean,
    timestamp?: number
} = {}): Promise<any> => {
    const cacheKey = 'events_list';
    const now = Date.now();

    // Check cache first unless forceRefresh is true
    if (!options.forceRefresh && cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_TTL) {
        console.log('API: Using cached events data');
        return cache[cacheKey].data;
    }

    try {
        console.log('API: Fetching events from server...');

        // Add timestamp to prevent browser caching
        const timestamp = options.timestamp || new Date().getTime();

        const response = await fetch(`/api/public/events?_=${timestamp}`, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('API raw response structure:', typeof data, data ? 'has data' : 'no data');

        // Store in cache
        cache[cacheKey] = {
            data,
            timestamp: now
        };

        return data;
    } catch (error) {
        console.error('Failed to fetch events:', error);
        throw error;
    }
};

// Fetch single event by ID
export const fetchEventByIdFromApi = async (
    eventId: string,
    options: { timestamp?: number } = {}
): Promise<any> => {
    const cacheKey = `event_${eventId}`;
    const now = Date.now();

    // Cache check
    if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < CACHE_TTL) {
        console.log(`API: Using cached data for event ${eventId}`);
        return cache[cacheKey].data;
    }

    try {
        console.log(`API: Fetching event ${eventId} from server...`);

        // Add timestamp to prevent browser caching
        const timestamp = options.timestamp || new Date().getTime();

        const response = await fetch(`/api/public/events/${eventId}?_=${timestamp}`, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Cache the result
        cache[cacheKey] = {
            data,
            timestamp: now
        };

        return data;
    } catch (error) {
        console.error(`Failed to fetch event ${eventId}:`, error);
        throw error;
    }
};

// Clear API cache (useful for debugging)
export const clearCache = () => {
    Object.keys(cache).forEach(key => delete cache[key]);
    console.log('API cache cleared');
};