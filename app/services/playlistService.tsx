import { Playlist, Track } from '../models/types';
import { apiClient, isApiClientInitialized } from './mongoService';
import spotifyService from './spotify-web-api';
import { Audio } from 'expo-av';
import axios from 'axios';

// Store the current sound object for controlling playback
let currentSound = null;
let isAudioSetup = false;

// Setup the audio system
const setupAudio = async () => {
    if (isAudioSetup) return;

    try {
        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            allowsRecordingIOS: false,
        });
        isAudioSetup = true;
        console.log('Audio system initialized');
    } catch (error) {
        console.error('Error setting up audio:', error);
    }
};

// Get a valid API client or throw an error
const getValidApiClient = () => {
    if (!isApiClientInitialized() || !apiClient) {
        throw new Error('API client not initialized');
    }
    return apiClient;
};

/**
 * Get playlist by ID
 */
export const getPlaylistById = async (playlistId: string): Promise<Playlist> => {
    try {
        console.log('Fetching playlist with ID:', playlistId);

        // Initialize audio system
        await setupAudio();

        try {
            // Try to get the API client
            const client = getValidApiClient();

            // Make the API request
            const response = await client.get(`/playlists/${playlistId}`);
            const playlist = response.data;
            console.log('Playlist fetched successfully:', playlist.name);

            // Enhance playlist with Spotify data if possible
            return await enhancePlaylistWithSpotifyData(playlist);
        } catch (apiError) {
            if (apiError.message === 'API client not initialized') {
                console.error('API client not available, falling back to mock data');
                return getMockPlaylist(playlistId);
            }

            console.error('API error:', apiError);
            throw apiError;
        }
    } catch (error) {
        console.error('Error fetching playlist:', error);
        // Fall back to mock data on error
        console.log('Using mock playlist data');
        return getMockPlaylist(playlistId);
    }
};

/**
 * Get all playlists for an event
 */
export const getPlaylistsByEventId = async (eventId: string): Promise<Playlist[]> => {
    try {
        const client = getValidApiClient();
        const response = await client.get('/playlists', {
            params: { eventId: eventId }
        });

        // Enhance each playlist with Spotify data
        const playlists = await Promise.all(
            response.data.map(playlist => enhancePlaylistWithSpotifyData(playlist))
        );

        return playlists;
    } catch (error) {
        console.error('Error fetching playlists by event:', error);
        // Return mock playlist in an array
        return [getMockPlaylist(eventId)];
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
                    ? track.spotifyId.split(':').pop()
                    : track.spotifyId;

                // Get track data from Spotify
                const trackData = await spotifyService.getTrack(cleanId);

                if (trackData) {
                    // Update track with additional data
                    enhancedTracks[trackKey] = {
                        ...track,
                        albumArt: trackData.album?.images?.[0]?.url,
                        previewUrl: trackData.preview_url,
                        album: trackData.album?.name
                    };
                    console.log(`Enhanced track: ${track.name}`);
                }
            } catch (trackError) {
                console.error(`Error enhancing track ${track.name}:`, trackError);
            }
        }

        return {
            ...playlist,
            tracks: enhancedTracks
        };
    } catch (error) {
        console.error('Error enhancing playlist with Spotify data:', error);
        return playlist; // Return original playlist on error
    }
};

/**
 * Play a track from Spotify
 */
export const playTrack = async (track: Track): Promise<boolean> => {
    try {
        console.log('Attempting to play track:', track.name);

        // Initialize audio system if needed
        await setupAudio();

        // First, stop any currently playing audio
        if (currentSound) {
            await currentSound.stopAsync();
            currentSound = null;
        }

        // First try to play using Spotify API to get preview URL
        const previewUrl = track.previewUrl || await spotifyService.playTrack(track.spotifyId);

        if (previewUrl) {
            console.log('Playing preview URL:', previewUrl);

            // Load and play the new track
            const { sound } = await Audio.Sound.createAsync(
                { uri: previewUrl },
                { shouldPlay: true, volume: 1.0 }
            );

            sound.setOnPlaybackStatusUpdate(status => {
                if (status.didJustFinish) {
                    console.log('Track finished playing');
                    // Handle track completion if needed
                }
            });

            currentSound = sound;
            return true;
        }

        console.log('No playable source available for track:', track.name);
        return false;
    } catch (error) {
        console.error('Error playing track:', error);
        return false;
    }
};

/**
 * Pause the currently playing track
 */
export const pauseTrack = async (): Promise<void> => {
    try {
        // Pause any preview audio
        if (currentSound) {
            await currentSound.pauseAsync();
        }
    } catch (error) {
        console.error('Error pausing track:', error);
    }
};

/**
 * Resume the currently paused track
 */
export const resumeTrack = async (): Promise<void> => {
    try {
        // Resume any preview audio
        if (currentSound) {
            await currentSound.playAsync();
        }
    } catch (error) {
        console.error('Error resuming track:', error);
    }
};

/**
 * Create a mock playlist with real Spotify track IDs
 */
export const getMockPlaylist = (playlistId: string): Playlist => {
    // Convert playlist ID to a numeric index for mock selection
    const idNum = parseInt(playlistId.replace(/\D/g, '') || '1', 10);
    const mockList = MOCK_PLAYLISTS[idNum % MOCK_PLAYLISTS.length];

    console.log(`Created mock playlist "${mockList.name}" for ID ${playlistId}`);

    return {
        _id: playlistId,
        eventId: playlistId,
        name: mockList.name,
        description: mockList.description,
        tracks: mockList.tracks,
        createdBy: "system",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};

const MOCK_PLAYLISTS = [
    {
        name: "Rock Classics",
        description: "The golden age hits that defined rock and roll",
        tracks: {
            "1": { name: "Bohemian Rhapsody", artist: "Queen", duration: "5:55", spotifyId: "7tFiyTwD0nx5a1eklYtX2J" },
            "2": { name: "Sweet Child O' Mine", artist: "Guns N' Roses", duration: "5:56", spotifyId: "7snQQk1zcKl8gZ92AnueZW" },
            "3": { name: "Hotel California", artist: "Eagles", duration: "6:30", spotifyId: "40riOy7x9W7GXjyGp4pjAv" },
            "4": { name: "Back In Black", artist: "AC/DC", duration: "4:15", spotifyId: "08mG3Y1vljYA6bvDt4Wqkj" },
            "5": { name: "Smells Like Teen Spirit", artist: "Nirvana", duration: "5:01", spotifyId: "5ghIJDpPoe3CfHMGu71E6T" }
        }
    },
    {
        name: "Hip-Hop Essentials",
        description: "The beats and rhymes that define hip-hop culture",
        tracks: {
            "1": { name: "SICKO MODE", artist: "Travis Scott", duration: "5:12", spotifyId: "2xLMifQCjDGFmkHkpNLD9h" },
            "2": { name: "God's Plan", artist: "Drake", duration: "3:18", spotifyId: "6DCZcSspjsKoFjzjrWoCdn" },
            "3": { name: "HUMBLE.", artist: "Kendrick Lamar", duration: "2:57", spotifyId: "7KXjTSCq5nL1LoYtL7XAwS" },
            "4": { name: "Money Trees", artist: "Kendrick Lamar", duration: "6:26", spotifyId: "2HbKqm4o0w5wEeEFXm2sD4" },
            "5": { name: "Juicy", artist: "The Notorious B.I.G.", duration: "4:16", spotifyId: "7I4GWRP5N0L1tN0LkyD3J0" }
        }
    },
    {
        name: "Reggae Vibes",
        description: "Laid-back reggae beats for beach days",
        tracks: {
            "1": { name: "Three Little Birds", artist: "Bob Marley", duration: "3:00", spotifyId: "6s3On8QJXbToWJtHyYDsfD" },
            "2": { name: "Could You Be Loved", artist: "Bob Marley", duration: "3:57", spotifyId: "5O4erNlJ74PIF6kGol1ZrC" },
            "3": { name: "No Woman, No Cry", artist: "Bob Marley", duration: "7:08", spotifyId: "5L6N3tQ1QtnLdokd8wW9Gx" },
            "4": { name: "Is This Love", artist: "Bob Marley", duration: "3:52", spotifyId: "6JRLFiX9NJSoRRKxowlBYr" },
            "5": { name: "Buffalo Soldier", artist: "Bob Marley", duration: "4:15", spotifyId: "7BfW1eoDh27I69nxFn5gD9" }
        }
    }
];