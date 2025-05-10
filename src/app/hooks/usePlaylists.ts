import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPlaylistById,
  getPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
} from '@services/playlistService';
import { Playlist } from '../models/types';

// Get a single playlist by ID
export function usePlaylist(playlistId?: string) {
  const {
    data: playlist,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      if (!playlistId) {
        return null;
      }
      return getPlaylistById(playlistId);
    },
    enabled: !!playlistId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Convert the error to a string to maintain the same interface
  const errorMessage = error ? (error instanceof Error ? error.message : 'Failed to fetch playlist') : null;

  return { playlist, loading, error: errorMessage };
}

// Get a list of playlists with optional filtering
export function usePlaylists(
  params: {
    eventId?: string;
    limit?: number;
    page?: number;
  } = {},
) {
  const { eventId, limit = 50, page = 1 } = params;

  return useQuery({
    queryKey: ['playlists', { eventId, limit, page }],
    queryFn: () => getPlaylists({ eventId, limit, page }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create a new playlist
export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistData: Partial<Playlist>) => createPlaylist(playlistData),
    onSuccess: (data) => {
      // Invalidate playlists list query
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      // Add new playlist to cache
      queryClient.setQueryData(['playlist', data._id], data);
    },
  });
}

// Update a playlist
export function useUpdatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, data }: { playlistId: string; data: Partial<Playlist> }) =>
      updatePlaylist(playlistId, data),
    onSuccess: (data, variables) => {
      // Update cache for the specific playlist
      queryClient.setQueryData(['playlist', variables.playlistId], data);
      // Invalidate playlists list
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

// Delete a playlist
export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) => deletePlaylist(playlistId),
    onSuccess: (_, variables) => {
      // Remove playlist from cache
      queryClient.removeQueries({ queryKey: ['playlist', variables] });
      // Invalidate playlists list
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}
