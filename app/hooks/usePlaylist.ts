import { useState, useEffect } from 'react';
import { getPlaylistById } from '../services/playlistService';
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
        console.log('Fetching playlist with ID:', playlistId);
        const data = await getPlaylistById(playlistId);
        setPlaylist(data);
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