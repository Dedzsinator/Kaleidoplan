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
        console.log('Fetching playlist with ID:', playlistId);

        // First try to get from API
        let data = await getPlaylistById(playlistId);

        // If API fails or returns no data, create a mock playlist from mock data (data.csv)
        if (!data) {
          console.log('Creating mock playlist from event data');

          // Mock data based on playlists in data.csv - used when backend is unavailable
          const mockPlaylists: Record<string, any> = {
            pl1: {
              name: 'Urban Festival Hits',
              description: 'The essential tracks from our Urban Music Festival',
              tracks: [
                '2xLMifQCjDGFmkHkpNLD9h',
                '6DCZcSspjsKoFjzjrWoCdn',
                '7KXjTSCq5nL1LoYtL7XAwS',
                '2HbKqm4o0w5wEeEFXm2sD4',
                '5ghIJDpPoe3CfHMGu71E6T',
              ],
            },
            pl2: {
              name: 'Jazz Night Classics',
              description: 'Smooth jazz selections for an elegant evening',
              tracks: [
                '4vLYewWIvqHfKtJDk8c8tq',
                '1YQWosTIljIvxAgHWTp7KP',
                '0X5DcGkbxCXSadgj01ZXd7',
                '360b8n2DzY4z5lN7V3WnV1',
                '6Z5suOgZ7hnJ0GpB5GQBT',
              ],
            },
            pl3: {
              name: 'Classical Masterpieces',
              description: 'Timeless orchestral works from renowned composers',
              tracks: [
                '3E65ph1tFcV1viw9ndXRoU',
                '1I5Ik5J4V8bGzk4vVZVCgO',
                '5n0E0L5q1aQIgkzYJJ9qG9',
                '4CzrYrG8eZRbFXhEVUTeLW',
                '5I4tSPn94QzBGX1elHG0X8',
              ],
            },
            pl4: {
              name: 'Electronic Beats',
              description: 'High-energy electronic dance tracks to keep the party going',
              tracks: [
                '5AInQphqW9oR4Q1s4V7uPb',
                '0TDLuuLlV54CkRRUOahJb4',
                '65F6unR8vQtnTYTZk3q7TW',
                '60wwxj6Dd9NJlirf84wr2c',
                '0DiWol3AO6WpXZgp0goxAV',
              ],
            },
            pl5: {
              name: 'Rock Classics',
              description: 'The golden age hits that defined rock and roll',
              tracks: [
                '7tFiyTwD0nx5a1eklYtX2J',
                '7snQQk1zcKl8gZ92AnueZW',
                '40riOy7x9W7GXjyGp4pjAv',
                '08mG3Y1vljYA6bvDt4Wqkj',
                '5ghIJDpPoe3CfHMGu71E6T',
              ],
            },
            // You can add more if needed
          };

          // Check if we have a mock playlist for this ID
          if (mockPlaylists[playlistId]) {
            data = {
              _id: playlistId,
              name: mockPlaylists[playlistId].name,
              description: mockPlaylists[playlistId].description,
              tracks: mockPlaylists[playlistId].tracks,
              eventId: '', // Not available in mock
              createdBy: '', // Not available in mock
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as unknown as Playlist; // Cast to unknown first to avoid type error
          } else {
            // Create a generic playlist as fallback
            data = {
              _id: playlistId,
              name: `Playlist for ${playlistId}`,
              description: 'Auto-generated playlist',
              tracks: {}, // Empty object instead of array to match the expected type
              eventId: '', // Not available
              createdBy: '', // Not available
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as Playlist;
          }
        }

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
