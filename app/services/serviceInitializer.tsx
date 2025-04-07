import { apiClient } from './mongoService';
import spotifyService from './spotify-web-api';
import { Audio } from 'expo-av';

// Initialize all app services
export const initializeServices = async (setStatus?: (status: string) => void) => {
    try {
        // Initialize audio for music playback
        if (setStatus) setStatus('Setting up audio...');
        await setupAudio();

        // Test API connection - handle potential undefined apiClient
        if (setStatus) setStatus('Connecting to database...');
        let apiStatus = false;
        try {
            apiStatus = await testApiConnection();
        } catch (error) {
            console.warn('API connection error:', error);
        }

        // Initialize Spotify service
        if (setStatus) setStatus('Connecting to Spotify...');
        await spotifyService.authenticate();

        return {
            apiConnected: apiStatus,
            audioReady: true,
            spotifyReady: true
        };
    } catch (error) {
        console.error('Service initialization error:', error);
        return {
            apiConnected: false,
            audioReady: false,
            spotifyReady: false,
            error
        };
    }
};

// Setup audio system
const setupAudio = async () => {
    try {
        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            allowsRecordingIOS: false,
        });
        console.log('Audio system initialized');
        return true;
    } catch (error) {
        console.error('Error setting up audio:', error);
        return false;
    }
};

// Test the API connection with proper error handling
const testApiConnection = async () => {
    if (!apiClient) {
        console.warn('API client is undefined');
        return false;
    }

    try {
        // Try a simple request to verify connectivity
        const response = await apiClient.get('/health');
        console.log('API connection successful', response.data);
        return true;
    } catch (error) {
        console.warn('API connection failed, will use mock data:', error);
        return false;
    }
};