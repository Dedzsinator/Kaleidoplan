import { Playlist } from '../app/models/types';
import api from './api';

// Get a playlist by ID
export const getPlaylistById = async (playlistId: string): Promise<Playlist | null> => {
  try {
    // Use api helper with automatic auth token handling
    const data = await api.get(`/playlists/${playlistId}`);
    if (data) {
      // Assuming 'data' is the playlist object or null if not found by api.get
      return data as Playlist;
    }
    return null; // Return null if API returns no data (e.g. 404 handled by api.get)
  } catch (error) {
    // This catch block handles errors thrown by api.get (e.g., network errors, 5xx, or if api.get throws on 4xx)
    console.error(`Error fetching playlist ${playlistId} in playlistService:`, error);
    return null; // Return null on any error
  }
};
