import { Playlist } from '@models/types';
import api from './api';

export const getPlaylistById = async (playlistId: string): Promise<Playlist | null> => {
  try {
    // Format the playlist ID to ensure pl prefix
    const formattedId = playlistId.startsWith('pl') ? playlistId : `pl${playlistId}`;

    const response = await api.get(`/playlists/${formattedId}`);

    // Handle various eventId formats that might come from the server
    if (response) {
      // Case 1: eventId is an object with _id but no id property
      if (response.eventId && typeof response.eventId === 'object' && response.eventId._id) {
        response.eventId.id = response.eventId._id.toString();
      }
      // Case 2: eventId is a string that needs to be normalized
      else if (response.eventId && typeof response.eventId === 'string') {
        // No changes needed, the string ID is already correct
      }
      // Case 3: eventId is missing or invalid, try to extract it from playlistId
      else if (!response.eventId && playlistId) {
        // Extract eventId from playlist name or other properties if possible
        const playlistNumber = playlistId.replace(/^pl/, '');
        if (/^\d+$/.test(playlistNumber)) {
          response.eventId = playlistNumber;
        }
      }
    }

    return response;
  } catch (error) {
    // Log detailed error information to help with debugging
    console.error(`Error fetching playlist ${playlistId}:`, error);

    // Create a minimal fallback playlist object
    // This allows the UI to continue functioning even if playlist fetch fails
    const fallbackPlaylist: Playlist = {
      _id: playlistId.replace(/^pl/, ''),
      name: `Playlist ${playlistId}`,
      description: "Couldn't load playlist",
      eventId: playlistId.replace(/^pl/, ''), // Extract numeric ID as eventId
      createdBy: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tracks: [],
    };

    // Only use fallback in production; in dev, throw to see the error
    if (process.env.NODE_ENV === 'production') {
      return fallbackPlaylist;
    }

    throw error;
  }
};

// Get all playlists with optional filtering
export const getPlaylists = async (params: { eventId?: string; limit?: number; page?: number }) => {
  try {
    // Fix params by converting to query string
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    return await api.get(`/playlists${queryString ? `?${queryString}` : ''}`);
  } catch (error) {
    console.error('Error fetching playlists in playlistService:', error);
    throw error;
  }
};

// Create a new playlist
export const createPlaylist = async (playlistData: Partial<Playlist>): Promise<Playlist> => {
  try {
    const response = await api.post('/playlists', playlistData);
    return response as Playlist;
  } catch (error) {
    console.error('Error creating playlist in playlistService:', error);
    throw error;
  }
};

// Update an existing playlist
export const updatePlaylist = async (playlistId: string, playlistData: Partial<Playlist>): Promise<Playlist> => {
  try {
    return await api.put(`/playlists/${playlistId}`, playlistData);
  } catch (error) {
    console.error(`Error updating playlist ${playlistId} in playlistService:`, error);
    throw error;
  }
};

// Delete a playlist
export const deletePlaylist = async (playlistId: string): Promise<void> => {
  try {
    return await api.delete(`/playlists/${playlistId}`);
  } catch (error) {
    console.error(`Error deleting playlist ${playlistId} in playlistService:`, error);
    throw error;
  }
};
