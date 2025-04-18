import { getAuth } from 'firebase/auth';

// Base API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Helper function to get auth token
export const getAuthToken = async (): Promise<string | null> => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  return null;
};

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  // Remove the double prefix bug:
  // If endpoint already starts with /api/, don't add another /api/
  const url = endpoint.startsWith('/api/') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  console.log(`Fetching from: ${url}`);

  const authToken = await getAuthToken();

  // Create new headers object to avoid readonly issues
  const headers = new Headers(options.headers);

  // Set Authorization header if we have a token
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  // Create new options object with the updated headers
  const updatedOptions = {
    ...options,
    headers,
  };

  return fetch(url, updatedOptions);
};

/**
 * Fetch a single event by ID from the API
 * @param eventId The ID of the event to fetch
 * @param options Additional options like timestamp for cache busting
 * @returns The event data
 */
export const fetchEventByIdFromApi = async (eventId: string, options: Record<string, any> = {}): Promise<any> => {
  // Build the query string from options
  const queryParams = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    queryParams.append(key, String(value));
  });

  // Construct the URL with query string
  const queryString = queryParams.toString();
  const endpoint = `/api/events/${eventId}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetchWithAuth(endpoint);

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Unauthorized request to fetch event. User may need to log in.');
        throw new Error('Unauthorized');
      }
      throw new Error(`Error fetching event: ${response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error(`Error fetching event ${eventId}:`, error);
    throw error;
  }
};

/**
 * Fetch events with optional filtering parameters
 * @param options Query parameters and options for fetching events
 * @returns Array of events or object containing events array
 */
export const fetchEventsFromApi = async (options: Record<string, any> = {}): Promise<any> => {
  // Build the query string
  const queryParams = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    queryParams.append(key, String(value));
  });
  const queryString = queryParams.toString();

  // Fix: Remove extra /api prefix to prevent /api/api duplication
  const auth = getAuth();
  const endpoint = auth.currentUser
    ? `/api/events${queryString ? `?${queryString}` : ''}`
    : `/api/public/events${queryString ? `?${queryString}` : ''}`;

  // Debug output - log the whole endpoint URL
  console.log(`Complete API URL: ${API_BASE_URL}${endpoint}`);

  try {
    console.log(`Fetching events from ${endpoint}`);
    // Use fetchWithAuth so token is included if available
    const response = await fetchWithAuth(endpoint);

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Unauthorized request to fetch events. User may need to log in.');
        throw new Error('Unauthorized');
      }

      // Return empty results instead of throwing for guest users
      if (!auth.currentUser && (response.status === 404 || response.status === 500)) {
        console.warn('Public events endpoint not available, returning empty array');
        return { events: [] };
      }

      throw new Error(`Error fetching events: ${response.statusText}`);
    }

    // Debug: log the raw response text before parsing
    const responseText = await response.text();
    console.log('Raw response text (first 100 chars):', responseText.substring(0, 100));

    // Now parse the JSON
    try {
      const data = JSON.parse(responseText);
      return data;
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      return { events: [] };
    }
  } catch (error: any) {
    console.error('Error fetching events:', error);

    // For guest users, return empty array instead of throwing
    if (!auth.currentUser) {
      console.warn('Returning empty events array for guest user after error');
      return { events: [] };
    }

    throw error;
  }
};

// Helper for GET requests
export const get = async (endpoint: string, options?: RequestInit): Promise<any> => {
  const response = await fetchWithAuth(endpoint, {
    method: 'GET',
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

// Helper for POST requests
export const post = async (endpoint: string, data: any, options?: RequestInit): Promise<any> => {
  const response = await fetchWithAuth(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

// Helper for PUT requests
export const put = async (endpoint: string, data: any, options?: RequestInit): Promise<any> => {
  const response = await fetchWithAuth(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

// Helper for DELETE requests
export const del = async (endpoint: string, options?: RequestInit): Promise<any> => {
  const response = await fetchWithAuth(endpoint, {
    method: 'DELETE',
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};
