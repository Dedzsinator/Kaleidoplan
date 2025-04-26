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

    // Create headers object first to check content type
    const headers = new Headers(options.headers || {});

    // Add authorization header
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // IMPORTANT CHANGE: Don't set Content-Type for /images/upload
    // AND don't set it for any requests where body is FormData
    const isFormDataRequest = options.body instanceof FormData;
    if (!headers.has('Content-Type') && !isFormDataRequest && !endpoint.includes('/images/upload')) {
      headers.set('Content-Type', 'application/json');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);

    if (!response.ok) {
      console.error(`API request failed: ${endpoint}`, {
        status: response.status,
        statusText: response.statusText,
      });
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
    if (value !== undefined) {
      // Add this check to prevent 'toString' of undefined
      queryParams.append(key, String(value));
    }
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

      const errorText = await response.text();
      console.error('Error response from server:', errorText);
      throw new Error(`Error fetching events: ${response.statusText}`);
    }

    // Use a single approach to read the response
    try {
      const data = await response.json();
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
    // Check if data is FormData
    const isFormData = data instanceof FormData;

    // Create our headers
    const headers = new Headers(options?.headers);

    if (isFormData) {
      // For FormData, REMOVE any Content-Type header to let the browser set it
      headers.delete('Content-Type');
    } else {
      // For JSON data, set the proper Content-Type
      headers.set('Content-Type', 'application/json');
    }

    // Don't stringify FormData objects
    const body = isFormData ? data : JSON.stringify(data);

    const response = await fetchWithAuth(endpoint, {
      method: 'POST',
      headers,
      body,
      ...options,
    });

    if (!response.ok) {
      console.error(`API request failed: ${endpoint}`, {
        status: response.status,
        statusText: response.statusText,
      });

      try {
        const errorData = await response.json();
        console.error('Error response body:', errorData);
        throw new Error(
          errorData.error || errorData.message || `Server error (${response.status}): ${response.statusText}`,
        );
      } catch (parseError) {
        throw new Error(`Server error (${response.status}): ${response.statusText}`);
      }
    }

    // Handle the response properly
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (parseError) {
        console.warn('Response was not valid JSON:', parseError);
        return {
          success: true,
          message: 'Operation completed',
        };
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
