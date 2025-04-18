import { Playlist } from '../app/models/types';
import { fetchWithAuth } from './api';

// Mock data for fallback when authentication fails
const mockPlaylists: Record<string, any> = {
  pl1: {
    name: "Urban Festival Hits",
    description: "The essential tracks from our Urban Music Festival",
    tracks: ["2xLMifQCjDGFmkHkpNLD9h", "6DCZcSspjsKoFjzjrWoCdn", "7KXjTSCq5nL1LoYtL7XAwS"]
  },
  pl2: {
    name: "Jazz Night Classics",
    description: "Smooth jazz selections for an elegant evening",
    tracks: ["4vLYewWIvqHfKtJDk8c8tq", "1YQWosTIljIvxAgHWTp7KP", "0X5DcGkbxCXSadgj01ZXd7"]
  },
  pl3: {
    name: "Classical Masterpieces",
    description: "Timeless orchestral works from renowned composers",
    tracks: ["3E65ph1tFcV1viw9ndXRoU", "1I5Ik5J4V8bGzk4vVZVCgO", "5n0E0L5q1aQIgkzYJJ9qG9"]
  }
};

// Function to generate mock playlist for temporary IDs (pl-temp-X)
const generateMockPlaylist = (id: string): Playlist => {
  // Extract event number if available
  const eventMatch = id.match(/pl-(\d+)/);
  const eventNum = eventMatch ? parseInt(eventMatch[1]) : null;

  // Get a mock playlist based on event number or random selection
  const mockKeys = Object.keys(mockPlaylists);
  const mockKey = eventNum && eventNum <= mockKeys.length
    ? `pl${eventNum}`
    : mockKeys[Math.floor(Math.random() * mockKeys.length)];

  const mockData = mockPlaylists[mockKey];

  return {
    _id: id,
    name: mockData.name || `Playlist for ${id}`,
    description: mockData.description || 'Auto-generated playlist',
    tracks: mockData.tracks || [],
    eventId: eventNum?.toString() || '',
    createdBy: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as Playlist;
};

// Get a playlist by ID - tries API first, falls back to mock data
export const getPlaylistById = async (playlistId: string): Promise<Playlist | null> => {
  try {
    console.log(`Fetching playlist: ${playlistId}`);

    // Try to fetch from API
    try {
      const response = await fetchWithAuth(`/api/playlists/${playlistId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Playlist API response:', data);
        return data;
      }
    } catch (error) {
      console.log('API request failed, falling back to mock data:', error);
    }

    // If API fails or returns nothing, generate mock data
    console.log('Generating mock playlist data');

    // Check if we have a predefined mock for this ID
    if (mockPlaylists[playlistId]) {
      const mockData = mockPlaylists[playlistId];
      return {
        _id: playlistId,
        name: mockData.name,
        description: mockData.description,
        tracks: mockData.tracks,
        eventId: '',
        createdBy: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Playlist;
    }

    // Generate a mock playlist for temporary IDs
    if (playlistId.startsWith('pl-')) {
      return generateMockPlaylist(playlistId);
    }

    // Default fallback
    return {
      _id: playlistId,
      name: `Playlist ${playlistId}`,
      description: 'Generated playlist',
      tracks: ["2xLMifQCjDGFmkHkpNLD9h", "0TDLuuLlV54CkRRUOahJb4", "65F6unR8vQtnTYTZk3q7TW"],
      eventId: '',
      createdBy: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Playlist;

  } catch (error) {
    console.error(`Error fetching playlist ${playlistId}:`, error);
    return null;
  }
};
