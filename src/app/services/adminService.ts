import api from './api';
import { Event, ApiResponse } from '@models/types';

export const assignOrganizerToEvent = async (
  eventId: string,
  userId: string,
  action: 'assign' | 'remove' = 'assign',
): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
  try {
    if (action === 'assign') {
      // Make sure the event ID is a valid ObjectId string - critical for MongoDB
      if (eventId && eventId.match(/^[0-9a-fA-F]{24}$/)) {
        const response = await api.post<ApiResponse<{ success: boolean; message?: string }>>(
          `/user/${userId}/events/${eventId}`,
          {
            isDraft: false,
            source: 'admin-panel',
          },
        );
        return response as ApiResponse<{ success: boolean; message?: string }>;
      } else {
        throw new Error('Invalid event ID format for MongoDB');
      }
    } else {
      const response = await api.delete<ApiResponse<{ success: boolean; message?: string }>>(
        `/user/${userId}/events/${eventId}`,
      );
      return response as ApiResponse<{ success: boolean; message?: string }>;
    }
  } catch (error) {
    console.error(`Error ${action === 'assign' ? 'assigning' : 'removing'} organizer:`, error);
    throw error;
  }
};

export const getEventsWithOrganizers = async (): Promise<Event[]> => {
  try {
    const response = await api.get('/events?includeOrganizers=true');

    if (Array.isArray(response)) {
      return response;
    } else if (response.events) {
      return response.events;
    }
    return [];
  } catch (error) {
    console.error('Error fetching events with organizers:', error);
    return [];
  }
};
