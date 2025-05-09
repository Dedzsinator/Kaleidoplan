import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Event } from '../models/types';

// Get all events
export const useEvents = (options = {}) => {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get('/events');
      return response.events || [];
    },
    ...options,
  });
};

// Get a single event
export const useEvent = (eventId: string | undefined, options = {}) => {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');
      const event = await api.get(`/events/${eventId}`);
      return event;
    },
    enabled: !!eventId,
    ...options,
  });
};

// Create event mutation
export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventData: Partial<Event>) => api.post('/events', eventData),
    onSuccess: () => {
      // Invalidate and refetch events list
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

// Update event mutation
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) => 
      api.put(`/events/${id}`, data),
    onSuccess: (_, variables) => {
      // Invalidate specific event and events list
      queryClient.invalidateQueries({ queryKey: ['event', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};
