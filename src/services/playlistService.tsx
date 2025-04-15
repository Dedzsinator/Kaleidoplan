import { Playlist, Track } from '../app/models/types';
import { apiClient, isApiClientInitialized, initializeAuth } from './mongoService';
import spotifyService from './spotify-web-api';

// Store the current sound object for controlling playback
let currentAudio: HTMLAudioElement | null = null;
let isAudioSetup = false;

// Setup the audio system
const setupAudio = async (): Promise<void> => {
    if (isAudioSetup) return;

    try {
        // Web Audio API doesn't need special setup
        isAudioSetup = true;
        console.log('Web Audio system initialized');
    } catch (error) {
        console.error('Error setting up audio:', error instanceof Error ? error.message : error);
    }
};

const getValidApiClient = async () => {
    if (!isApiClientInitialized() || !apiClient) {
        console.error('API client not initialized, attempting to reinitialize...');

        try {
            // Call initializeAuth but don't try to check its return value
            await initializeAuth();

            // After initialization, check if the client is available now
            if (isApiClientInitialized() && apiClient) {
                console.log('Auth reinitialization successful');
                return apiClient;
            } else {
                console.warn('Auth reinitialization failed or client still not available');
            }
        } catch (err) {
            console.error('Error reinitializing auth:', err instanceof Error ? err.message : err);
        }

        // If we get here, reinitialization didn't help
        throw new Error('API client not initialized');
    }

    return apiClient;
};

/**
 * Get playlist by ID
 */
export const getPlaylistById = async (playlistId: string): Promise<Playlist | null> => {
    try {
        console.log('Fetching playlist with ID:', playlistId);

        // Initialize audio system
        await setupAudio();

        // Check if API client is available before proceeding
        if (!isApiClientInitialized() || !apiClient) {
            console.log('API client not initialized');
            return null;
        }

        // Make the API request with timeout
        const response = await apiClient.get(`/playlists/${playlistId}`, {
            timeout: 5000 // 5 second timeout
        });
        const playlist = response.data as Playlist;
        console.log('Playlist fetched successfully:', playlist.name);

        // Enhance playlist with Spotify data if possible
        return await enhancePlaylistWithSpotifyData(playlist);
    } catch (error) {
        console.error('Error fetching playlist:', error instanceof Error ? error.message : error);
        return null;
    }
};

/**
 * Get all playlists for an event
 */
export const getPlaylistsByEventId = async (eventId: string): Promise<Playlist[]> => {
    try {
        // Wait for the client to be ready
        const client = await getValidApiClient();

        const response = await client.get('/playlists', {
            params: { eventId: eventId }
        });

        // Ensure the response data is an array
        const playlistsData = Array.isArray(response.data) ? response.data : [];

        // Enhance each playlist with Spotify data
        const playlists = await Promise.all(
            playlistsData.map((playlist: Playlist) => enhancePlaylistWithSpotifyData(playlist))
        );

        return playlists;
    } catch (error) {
        console.error('Error fetching playlists by event:', error instanceof Error ? error.message : error);
        // Return empty array instead of mock data
        return [];
    }
};

/**
 * Enhance playlist data with additional info from Spotify API
 */
export const enhancePlaylistWithSpotifyData = async (playlist: Playlist): Promise<Playlist> => {
    if (!playlist || !playlist.tracks) return playlist;

    try {
        await spotifyService.authenticate();
        const trackIds = Object.keys(playlist.tracks);
        const enhancedTracks = { ...playlist.tracks };

        // Process each track to get additional data from Spotify
        for (const trackKey of trackIds) {
            const track = playlist.tracks[trackKey];
            if (!track || !track.spotifyId) continue;

            try {
                // Extract proper ID from spotify:track:ID format if necessary
                const cleanId = track.spotifyId.includes(':')
                    ? track.spotifyId.split(':').pop() || track.spotifyId
                    : track.spotifyId;

                // Get track data from Spotify
                const trackData = await spotifyService.getTrack(cleanId);

                if (trackData) {
                    // Update track with additional data
                    enhancedTracks[trackKey] = {
                        ...track,
                        albumArt: trackData.album?.images?.[0]?.url || undefined,
                        previewUrl: trackData.preview_url || undefined,
                    };
                    console.log(`Enhanced track: ${track.name}`);
                }
            } catch (trackError) {
                console.error(`Error enhancing track ${track.name}:`, trackError instanceof Error ? trackError.message : trackError);
            }
        }

        return {
            ...playlist,
            tracks: enhancedTracks
        };
    } catch (error) {
        console.error('Error enhancing playlist with Spotify data:', error instanceof Error ? error.message : error);
        return playlist; // Return original playlist on error
    }
};

/**
 * Play a track from Spotify
 */
export const playTrack = async (track: Track): Promise<boolean> => {
    try {
        console.log('Attempting to play track:', track.name);
        await setupAudio();

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        // Try various sources in order of preference
        let audioSource: string | null = null;

        // 1. Try Spotify preview URL if already cached
        if (track.previewUrl) {
            console.log('Using cached Spotify preview URL');
            audioSource = track.previewUrl;
        }

        // 2. Try to get fresh preview URL from Spotify
        if (!audioSource && track.spotifyId) {
            console.log('Attempting to get fresh preview from Spotify');
            const spotifyPreview = await spotifyService.playTrack(track.spotifyId);
            if (spotifyPreview) {
                audioSource = spotifyPreview;
            }
        }

        // 3. Try fallback URL if provided
        if (!audioSource && track.fallbackPreviewUrl) {
            console.log('Using fallback preview URL');
            audioSource = track.fallbackPreviewUrl;
        }

        // 4. Try local audio if available (this won't work the same way in web)
        if (!audioSource && track.localAudioPath) {
            console.log('Using local audio file');
            audioSource = track.localAudioPath;
        }

        // If we have a source, play it using web Audio
        if (audioSource) {
            console.log('Playing audio from source:', audioSource);
            const audio = new Audio(audioSource);

            // Use event listener for web compatibility
            audio.addEventListener('ended', () => {
                console.log('Track finished playing');
            });

            try {
                await audio.play();
                currentAudio = audio;
                return true;
            } catch (playError) {
                console.error('Error playing audio:', playError instanceof Error ? playError.message : playError);
                return false;
            }
        }

        console.log('No playable source found for:', track.name);
        return false;
    } catch (error) {
        console.error('Error playing track:', error instanceof Error ? error.message : error);
        return false;
    }
};

/**
 * Pause the currently playing track
 */
export const pauseTrack = async (): Promise<void> => {
    try {
        // Pause any preview audio
        if (currentAudio) {
            currentAudio.pause();
        }
    } catch (error) {
        console.error('Error pausing track:', error instanceof Error ? error.message : error);
    }
};

/**
 * Resume the currently paused track
 */
export const resumeTrack = async (): Promise<void> => {
    try {
        // Resume any preview audio
        if (currentAudio) {
            try {
                await currentAudio.play();
            } catch (playError) {
                console.error('Error resuming audio:', playError instanceof Error ? playError.message : playError);
            }
        }
    } catch (error) {
        console.error('Error resuming track:', error instanceof Error ? error.message : error);
    }
};