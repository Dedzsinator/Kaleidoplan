import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEventById, getEvents, createEvent, updateEvent, deleteEvent } from '../../services/eventService';
import { Event } from '../models/types';

// Get a single event by ID
export function useEvent(eventId?: string) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      return getEventById(eventId);
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get a list of events with optional filtering
export function useEvents(
  params: {
    page?: number;
    limit?: number;
    searchTerm?: string;
    sortBy?: string;
    startDate?: string;
    endDate?: string;
  } = {},
) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => getEvents(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create a new event
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventData: Partial<Event>) => createEvent(eventData),
    onSuccess: (data) => {
      // Invalidate events list query
      queryClient.invalidateQueries({ queryKey: ['events'] });
      // Add new event to cache
      queryClient.setQueryData(['event', data.id], data);
    },
  });
}

// Update an event
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) => updateEvent(id, data),
    onSuccess: (data, variables) => {
      // Update cache for the specific event
      queryClient.setQueryData(['event', variables.id], data);
      // Invalidate events list
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Delete an event
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: (_, variables) => {
      // Remove event from cache
      queryClient.removeQueries({ queryKey: ['event', variables] });
      // Invalidate events list
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
