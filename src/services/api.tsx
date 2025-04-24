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

// In api.tsx or wherever fetchWithAuth is defined
export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const token = await getAuthToken();

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    };

    console.log(`Making API request to: ${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);

    if (!response.ok) {
      console.error(`API request failed: ${endpoint}`, {
        status: response.status,
        statusText: response.statusText
      });
      // Try to get response body even for errors
      try {
        const errorData = await response.json();
        console.error('Error response body:', errorData);
      } catch (e) {
        // Ignore parse errors on error response
      }
    }

    return response;
  } catch (error) {
    console.error(`API request exception for ${endpoint}:`, error);
    throw error;
  }
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
  const endpoint = `/events/${eventId}${queryString ? `?${queryString}` : ''}`;

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

  const auth = getAuth();
  const endpoint = auth.currentUser
    ? `/events${queryString ? `?${queryString}` : ''}`
    : `/public/events${queryString ? `?${queryString}` : ''}`;

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
const get = async (endpoint: string, options?: RequestInit): Promise<any> => {
  const response = await fetchWithAuth(endpoint, {
    method: 'GET',
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

// Improve the post method to handle non-JSON responses better
const post = async (endpoint: string, data: any, options?: RequestInit): Promise<any> => {
  try {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');

    console.log(`Making POST request to ${endpoint}`, data);

    const response = await fetchWithAuth(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...options,
    });

    // Check for error status
    if (!response.ok) {
      // Try to get detailed error from response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `API error: ${response.status}`);
      } catch (parseError) {
        // If we can't parse JSON, provide a better error message
        throw new Error(`Server error (${response.status}): ${response.statusText}`);
      }
    }

    // For successful responses, try to parse as JSON, but handle non-JSON responses gracefully
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (parseError) {
        console.warn('Response was not valid JSON:', parseError);
        return { success: true, message: 'Operation completed' };
      }
    } else {
      // For non-JSON responses, return a simple success object
      const text = await response.text();
      return {
        success: true,
        message: text || 'Operation completed',
        statusCode: response.status
      };
    }
  } catch (error) {
    console.error('API POST request failed:', error);
    throw error;
  }
};

const put = async (endpoint: string, data: any, options?: RequestInit): Promise<any> => {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  const response = await fetchWithAuth(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

const patch = async (endpoint: string, data: any, options?: RequestInit): Promise<any> => {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  const response = await fetchWithAuth(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

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

const deleteRequest = async (endpoint: string, options?: RequestInit): Promise<any> => {
  const response = await fetchWithAuth(endpoint, {
    method: 'DELETE',
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

const api = {
  get,
  post,
  put,
  patch,
  delete: deleteRequest
};

export default api;

export { get, post, put, patch, deleteRequest as delete };
