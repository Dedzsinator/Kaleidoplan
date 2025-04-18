import { apiClient, initializeAuth } from './mongoService';
import spotifyService from './spotify-web-api';

// Define a type for WebAudio to avoid conflicts with the global Audio constructor
interface WebAudioAPI {
  setAudioModeAsync: (options: any) => Promise<boolean>;
  Sound: {
    createAsync: (source: string | { uri: string }) => Promise<{
      sound: {
        playAsync: () => Promise<void>;
        pauseAsync: () => Promise<void>;
        unloadAsync: () => Promise<void>;
        setPositionAsync: (millis: number) => Promise<void>;
        getStatusAsync: () => Promise<{
          isLoaded: boolean;
          positionMillis: number;
          durationMillis: number;
          isPlaying: boolean;
        }>;
      };
      status: { isLoaded: boolean };
    }>;
  };
}

// Web-compatible audio wrapper
const WebAudio: WebAudioAPI = {
  // Mock the setAudioModeAsync for web compatibility
  setAudioModeAsync: async (options: any): Promise<boolean> => {
    console.log('Setting audio mode (web version):', options);
    return true;
  },
  Sound: {
    createAsync: async (source: string | { uri: string }) => {
      const audioUrl = typeof source === 'string' ? source : source.uri;
      // Use HTMLAudioElement type and rename to avoid conflict with global Audio
      const htmlAudio = new window.Audio(audioUrl);

      return {
        sound: {
          playAsync: async (): Promise<void> => {
            void htmlAudio.play();
          },
          pauseAsync: async (): Promise<void> => {
            htmlAudio.pause();
          },
          unloadAsync: async (): Promise<void> => {
            htmlAudio.src = '';
          },
          setPositionAsync: async (millis: number): Promise<void> => {
            htmlAudio.currentTime = millis / 1000;
          },
          getStatusAsync: async () => ({
            isLoaded: true,
            positionMillis: htmlAudio.currentTime * 1000,
            durationMillis: htmlAudio.duration * 1000,
            isPlaying: !htmlAudio.paused,
          }),
        },
        status: { isLoaded: true },
      };
    },
  },
};

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
      console.warn('API connection error:', error instanceof Error ? error.message : error);
    }

    // Initialize Spotify service
    if (setStatus) setStatus('Connecting to Spotify...');
    const spotifySuccess = await initializeSpotify();

    return {
      apiConnected: apiStatus,
      audioReady: true,
      spotifyReady: spotifySuccess,
    };
  } catch (error) {
    console.error('Service initialization error:', error instanceof Error ? error.message : error);
    return {
      apiConnected: false,
      audioReady: false,
      spotifyReady: false,
      error,
    };
  }
};

// Setup audio system for web
const setupAudio = async (): Promise<boolean> => {
  try {
    // In web, we don't need special audio setup like in React Native
    // But we can still provide a compatible interface
    await WebAudio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      allowsRecordingIOS: false,
    });
    console.log('Web Audio system initialized');
    return true;
  } catch (error) {
    console.error('Error setting up audio:', error instanceof Error ? error.message : error);
    return false;
  }
};

// Initialize Spotify with retry logic
const initializeSpotify = async (retries = 3): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Spotify authentication attempt ${i + 1}/${retries}`);
      await spotifyService.authenticate();
      console.log('Spotify authenticated successfully');
      return true;
    } catch (error) {
      console.warn(
        `Spotify authentication failed (attempt ${i + 1}/${retries}):`,
        error instanceof Error ? error.message : error,
      );
      if (i < retries - 1) {
        // Wait 1 second before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  console.error(`Spotify authentication failed after ${retries} attempts`);
  return false;
};

// Test the API connection with proper error handling
const testApiConnection = async (): Promise<boolean> => {
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
    console.warn('API connection failed, will use mock data:', error instanceof Error ? error.message : error);
    return false;
  }
};
