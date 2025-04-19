import { Event } from '../app/models/types';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two points in kilometers using the Haversine formula
 */
export const calculateDistance = (
  coords1: Coordinates,
  coords2: Coordinates
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coords1.latitude)) *
    Math.cos(toRad(coords2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Filter events by proximity to a location
 */
export const filterEventsByProximity = (
  events: Event[],
  userLocation: Coordinates,
  radiusKm: number = 300
): Event[] => {
  return events.filter((event) => {
    if (!event.latitude || !event.longitude) return false;

    const eventCoords = {
      latitude: event.latitude,
      longitude: event.longitude,
    };

    const distance = calculateDistance(userLocation, eventCoords);
    return distance <= radiusKm;
  });
};

// Add these constants at the top of the file
const LOCATION_CACHE_KEY = 'user_location_cache';
const LOCATION_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Get user's current location with caching
 */
export const getCurrentLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    // Try to get cached location first
    const cachedLocation = getCachedLocation();
    if (cachedLocation) {
      console.log('Using cached location:', cachedLocation);
      return resolve(cachedLocation);
    }

    // If no cache, proceed with geolocation
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    // First try: Low accuracy, quick timeout for faster response
    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          // Cache the successful location
          cacheLocation(coordinates);
          resolve(coordinates);
        },
        () => {
          // If low accuracy fails, try with high accuracy
          tryHighAccuracy();
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000 // 5 minutes
        }
      );
    };

    // Second try: High accuracy with longer timeout
    const tryHighAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          // Cache the successful location
          cacheLocation(coordinates);
          resolve(coordinates);
        },
        (error) => {
          // Final attempt: Try with cached position and low accuracy
          tryFinalAttempt(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // 1 minute
        }
      );
    };

    // Final try: Accept any cached position
    const tryFinalAttempt = (originalError: GeolocationPositionError) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          // Cache the successful location
          cacheLocation(coordinates);
          resolve(coordinates);
        },
        () => {
          // All attempts failed
          reject(originalError);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 3600000 // 1 hour - accept any cached position
        }
      );
    };

    // Start the cascade of attempts
    tryLowAccuracy();
  });
};

/**
 * Cache user location in localStorage with timestamp
 */
const cacheLocation = (coordinates: Coordinates): void => {
  try {
    const locationData = {
      coordinates,
      timestamp: Date.now()
    };
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(locationData));
    console.log('Location cached successfully');
  } catch (error) {
    console.error('Error caching location:', error);
  }
};

/**
 * Get cached location if available and not expired
 */
const getCachedLocation = (): Coordinates | null => {
  try {
    const cachedData = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!cachedData) return null;

    const { coordinates, timestamp } = JSON.parse(cachedData);
    const now = Date.now();

    // Check if cache is still valid (not expired)
    if (now - timestamp < LOCATION_CACHE_EXPIRY) {
      return coordinates;
    } else {
      console.log('Cached location expired');
      return null;
    }
  } catch (error) {
    console.error('Error retrieving cached location:', error);
    return null;
  }
};

/**
 * Force refresh the user's location (ignore cache)
 */
export const refreshLocation = (): Promise<Coordinates> => {
  // Clear the existing cache
  try {
    localStorage.removeItem(LOCATION_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing location cache:', error);
  }

  // Get fresh location
  return getCurrentLocation();
};
