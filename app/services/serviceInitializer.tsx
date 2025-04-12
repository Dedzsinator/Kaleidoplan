import { apiClient, initializeAuth } from './mongoService';
import spotifyService from './spotify-web-api';
import { Audio } from 'expo-av';

// Initialize all app services
export const initializeServices = async (setStatus?: (status: string) => void) => {
    try {
        // Initialize audio for music playback
        if (setStatus) setStatus('Setting up audio...');
        await setupAudio();

        // Initialize auth token
        if (setStatus) setStatus('Initializing authentication...');
        await initializeAuth();

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
        const spotifySuccess = await initializeSpotify();

        return {
            apiConnected: apiStatus,
            audioReady: true,
            spotifyReady: spotifySuccess
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

// Initialize Spotify with retry logic
const initializeSpotify = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Spotify authentication attempt ${i+1}/${retries}`);
            await spotifyService.authenticate();
            console.log('Spotify authenticated successfully');
            return true;
        } catch (error) {
            console.warn(`Spotify authentication failed (attempt ${i+1}/${retries}):`, error);
            if (i < retries - 1) {
                // Wait 1 second before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    console.error(`Spotify authentication failed after ${retries} attempts`);
    return false;
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