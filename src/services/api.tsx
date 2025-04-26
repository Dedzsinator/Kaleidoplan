import { getAuth } from 'firebase/auth';
import { ApiResponse, ApiError, HttpMethod, RequestOptions, RequestConfig } from '../app/models/types';

interface EventResponse {
  id: string;
  name: string;
  description?: string;
  date?: string;
  location?: string;
  [key: string]: unknown;
}

interface EventsListResponse {
  events: EventResponse[];
  total?: number;
  page?: number;
  limit?: number;
}

interface ApiErrorResponse extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

interface QueryOptions {
  limit?: number;
  page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: string;
  [key: string]: string | number | boolean | undefined;
}

interface GenericResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

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
  try {
    const token = await getAuthToken();

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);

    if (!response.ok) {
      console.error(`API request failed: ${endpoint}`, {
        status: response.status,
        statusText: response.statusText,
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

export const fetchEventByIdFromApi = async (eventId: string, options: QueryOptions = {}): Promise<EventResponse> => {
  const queryParams = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, String(value));
    }
  });

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
  } catch (error: unknown) {
    const typedError = error as ApiErrorResponse;
    console.error(`Error fetching event ${eventId}:`, typedError);
    throw typedError;
  }
};

export const fetchEventsFromApi = async (options: QueryOptions = {}): Promise<EventsListResponse> => {
  const queryParams = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    queryParams.append(key, String(value));
  });
  const queryString = queryParams.toString();

  const auth = getAuth();
  const endpoint = auth.currentUser
    ? `/events${queryString ? `?${queryString}` : ''}`
    : `/public/events${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetchWithAuth(endpoint);

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Unauthorized request to fetch events. User may need to log in.');
        throw new Error('Unauthorized');
      }

      if (!auth.currentUser && (response.status === 404 || response.status === 500)) {
        console.warn('Public events endpoint not available, returning empty array');
        return { events: [] };
      }

      throw new Error(`Error fetching events: ${response.statusText}`);
    }

    const responseText = await response.text();

    try {
      const data = JSON.parse(responseText);
      return data;
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      return { events: [] };
    }
  } catch (error: unknown) {
    const typedError = error as ApiErrorResponse;
    console.error('Error fetching events:', typedError);

    // For guest users, return empty array instead of throwing
    if (!auth.currentUser) {
      console.warn('Returning empty events array for guest user after error');
      return { events: [] };
    }

    throw typedError;
  }
};

const get = async (endpoint: string, options?: RequestInit) => {
  const response = await fetchWithAuth(endpoint, {
    method: 'GET',
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

const post = async <T, D = Record<string, unknown>>(
  endpoint: string,
  data: D,
  options?: RequestInit,
): Promise<T | GenericResponse<unknown>> => {
  try {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');

    const response = await fetchWithAuth(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `API error: ${response.status}`);
      } catch (parseError) {
        throw new Error(`Server error (${response.status}): ${response.statusText}`);
      }
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (parseError) {
        console.warn('Response was not valid JSON:', parseError);
        return { success: true, message: 'Operation completed' };
      }
    } else {
      const text = await response.text();
      return {
        success: true,
        message: text || 'Operation completed',
        statusCode: response.status,
      };
    }
  } catch (error) {
    console.error('API POST request failed:', error);
    throw error;
  }
};

const put = async <T, D = Record<string, unknown>>(endpoint: string, data: D, options?: RequestInit): Promise<T> => {
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

const patch = async <T, D = Record<string, unknown>>(endpoint: string, data: D, options?: RequestInit): Promise<T> => {
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

export const del = async <T = Record<string, unknown>,>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await fetchWithAuth(endpoint, {
    method: 'DELETE',
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

const deleteRequest = async <T = GenericResponse<unknown>,>(endpoint: string, options?: RequestInit): Promise<T> => {
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
  delete: deleteRequest,
};

export default api;

export { get, post, put, patch, deleteRequest as delete };
