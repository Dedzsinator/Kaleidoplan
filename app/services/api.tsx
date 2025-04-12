import axios from 'axios';
import { Platform } from 'react-native';
import { Event } from '../models/types';

// Get the correct API URL based on platform
const getBaseUrl = () => {
    // IMPORTANT: Replace this with your actual machine's IP address!
    const DEV_IP = '192.168.1.1'; // Change this to your actual IP address

    if (Platform.OS === 'web') {
        return 'http://localhost:3000/api';
    } else {
        return __DEV__
            ? `http://${DEV_IP}:3000/api`
            : 'https://api.kaleidoplan.com/api';
    }
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

export const fetchEventsFromApi = async (): Promise<Event[]> => {
    try {
        console.log('EventApiService: Fetching events from server...');

        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await eventApiClient.get(`/public/events?_=${timestamp}`);
        console.log('Raw API response:', JSON.stringify(response.data).substring(0, 200) + '...');

        if (response.data && response.data.events) {
            // Server returns { events: [...] }
            console.log(`EventApiService: Found ${response.data.events.length} events in response.data.events`);
            return response.data.events;
        } else if (Array.isArray(response.data)) {
            // Server returns direct array
            console.log(`EventApiService: Found ${response.data.length} events in array format`);
            return response.data;
        } else if (response.data && typeof response.data === 'object') {
            // If the response is an object but doesn't have an events property
            console.log('EventApiService: Response is an object without events property');
            return [response.data]; // Wrap single event in array
        } else {
            console.log('EventApiService: No events in response');
            return [];
        }
    } catch (error) {
        console.error('EventApiService Error:', error.response?.status, error.message);
        throw error;
    }
};

/**
 * Get single event by ID
 */
export const fetchEventByIdFromApi = async (eventId: string): Promise<Event | null> => {
    try {
        console.log(`EventApiService: Fetching event ${eventId}...`);
        const response = await eventApiClient.get(`/public/events/${eventId}`);
        return response.data;
    } catch (error) {
        console.error(`EventApiService: Error fetching event ${eventId}:`, error);
        return null;
    }
};