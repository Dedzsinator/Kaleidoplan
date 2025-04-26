import { useState, useEffect } from 'react';
import { getPlaylistById } from '../../services/playlistService';
import { Playlist } from '../models/types';

export function usePlaylist(playlistId?: string) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlaylist() {
      if (!playlistId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Try to get from API
        const data = await getPlaylistById(playlistId);

        // If API fails or returns no data, create a basic fallback playlist
        if (!data) {
          // Create a generic playlist as fallback
          const fallbackPlaylist: Playlist = {
            _id: playlistId,
            name: `Playlist ${playlistId}`,
            description: 'Playlist information not available',
            tracks: {}, // Empty object to match the expected type
            eventId: '',
            createdBy: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setPlaylist(fallbackPlaylist);
        } else {
          setPlaylist(data);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch playlist';
        console.error('Error in usePlaylist:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylist();
  }, [playlistId]);

  return { playlist, loading, error };
}
