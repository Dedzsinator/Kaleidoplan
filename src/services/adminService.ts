import api from './api';

export const assignOrganizerToEvent = async (
  eventId: string,
  userId: string,
  action: 'assign' | 'remove' = 'assign',
): Promise<any> => {
  try {
    console.log(`${action === 'assign' ? 'Assigning' : 'Removing'} user ${userId} as organizer for event ${eventId}`);

    if (action === 'assign') {
      // Make sure the event ID is a valid ObjectId string - critical for MongoDB
      if (eventId && eventId.match(/^[0-9a-fA-F]{24}$/)) {
        const response = await api.post(`/user/${userId}/events/${eventId}`, {
          isDraft: false,
          source: 'admin-panel',
        });
        return response;
      } else {
        throw new Error('Invalid event ID format for MongoDB');
      }
    } else {
      const response = await api.delete(`/user/${userId}/events/${eventId}`);
      return response;
    }
  } catch (error) {
    console.error(`Error ${action === 'assign' ? 'assigning' : 'removing'} organizer:`, error);
    throw error;
  }
};

/**
 * Get all events with their organizers
 */
export const getEventsWithOrganizers = async (): Promise<any> => {
  try {
    // Add /api prefix and explicitly request events with organizers
    const response = await api.get('/events?includeOrganizers=true');
    console.log('Events with organizers API response:', response);

    // Handle different response formats
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
