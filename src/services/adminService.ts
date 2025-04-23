import api from './api';

export const assignOrganizerToEvent = async (
  eventId: string,
  userId: string,
  action: 'assign' | 'remove' = 'assign'
): Promise<any> => {
  try {
    console.log(`${action === 'assign' ? 'Assigning' : 'Removing'} user ${userId} as organizer for event ${eventId}`);
    
    // All events have real MongoDB IDs now
    const isDraftEvent = false; // Determine draft status by querying the event, not by ID format
    
    if (action === 'assign') {
      const response = await api.post(`/users/${userId}/events/${eventId}`, { 
        isDraft: isDraftEvent,
        source: 'admin-panel'
      });
      return response;
    } else {
      const response = await api.delete(`/users/${userId}/events/${eventId}`);
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
    // Get all events - this endpoint should include organizers in the response
    const response = await api.get('/events');
    console.log('Events API response:', response);
    
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
