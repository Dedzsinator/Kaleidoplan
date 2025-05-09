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
        setPlaylist(null); // Ensure playlist is null if no ID
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPlaylist(null); // Reset playlist state before fetching

      try {
        const data = await getPlaylistById(playlistId);
        setPlaylist(data); // This will be the playlist data or null if not found/error
        if (!data) {
          // You could set a specific error message for not found if desired,
          // but the 404 from the API should already be logged.
          // setError(`Playlist with ID ${playlistId} not found.`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch playlist';
        console.error('Error in usePlaylist hook:', errorMessage);
        setError(errorMessage);
        setPlaylist(null); // Ensure playlist is null on error
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylist();
  }, [playlistId]);

  return { playlist, loading, error };
}
