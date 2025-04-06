import React, { createContext, useState, useContext, useEffect } from 'react';
import SpotifyService from '../services/spotify-web-api';

// Define the context type
interface MusicPlayerContextType {
    isAuthenticated: boolean;
    isPlaying: boolean;
    currentTrack: any | null;
    currentEvent: any | null;
    expanded: boolean;
    connect: () => Promise<boolean>;
    playTrackFromEvent: (event: any) => Promise<void>;
    togglePlayback: () => void;
    toggleExpanded: () => void;
    setCurrentEvent: (event: any) => void;
}

// Create the context with default values
const MusicPlayerContext = createContext<MusicPlayerContextType>({
    isAuthenticated: false,
    isPlaying: false,
    currentTrack: null,
    currentEvent: null,
    expanded: false,
    connect: async () => false,
    playTrackFromEvent: async () => { },
    togglePlayback: () => { },
    toggleExpanded: () => { },
    setCurrentEvent: () => { },
});

// Create the provider component
export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // State for the music player
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTrack, setCurrentTrack] = useState<any | null>(null);
    const [currentEvent, setCurrentEvent] = useState<any | null>(null);
    const [expanded, setExpanded] = useState<boolean>(false);

    // Connect to Spotify and authenticate
    const connect = async (): Promise<boolean> => {
        try {
            const authenticated = await SpotifyService.authenticate();
            setIsAuthenticated(authenticated);
            return authenticated;
        } catch (error) {
            console.error('Error connecting to Spotify:', error);
            return false;
        }
    };

    // Play a track from the current event
    const playTrackFromEvent = async (event: any): Promise<void> => {
        if (!event?.performers?.length) {
            console.log('No performers found for the event');
            return;
        }

        try {
            // Find a performer in the event
            const performer = event.performers[0];
            console.log('Finding music for performer:', performer.name);

            // Search for tracks by this performer
            const searchResult = await SpotifyService.searchArtists(performer.name);

            if (searchResult.artists.items.length > 0) {
                const artist = searchResult.artists.items[0];
                console.log('Found artist:', artist.name);

                // Get top tracks for this artist
                const topTracks = await SpotifyService.getArtistTopTracks(artist.id);

                if (topTracks.tracks.length > 0) {
                    // Use the first top track
                    const track = topTracks.tracks[0];
                    console.log('Playing track:', track.name);
                    setCurrentTrack(track);

                    // Play the track
                    await SpotifyService.playTrack(track.uri);
                    setIsPlaying(true);
                }
            }
        } catch (error) {
            console.error('Error playing track from event:', error);
        }
    };

    // Toggle play/pause
    const togglePlayback = async (): Promise<void> => {
        try {
            if (isPlaying) {
                await SpotifyService.pausePlayback();
                setIsPlaying(false);
            } else if (currentTrack) {
                await SpotifyService.playTrack(currentTrack.uri);
                setIsPlaying(true);
            } else if (currentEvent) {
                await playTrackFromEvent(currentEvent);
            }
        } catch (error) {
            console.error('Error toggling playback:', error);
        }
    };

    // Toggle expanded state
    const toggleExpanded = (): void => {
        setExpanded(prev => !prev);
    };

    // When current event changes, try to play music from that event if we're authenticated
    useEffect(() => {
        if (currentEvent && isAuthenticated && !currentTrack) {
            playTrackFromEvent(currentEvent);
        }
    }, [currentEvent, isAuthenticated]);

    // If the current event changes but has the same artists, keep playing
    useEffect(() => {
        const currentArtist = currentTrack?.artists?.[0]?.name;
        const eventArtist = currentEvent?.performers?.[0]?.name;

        if (currentArtist && eventArtist && currentArtist !== eventArtist) {
            if (isPlaying) {
                playTrackFromEvent(currentEvent);
            }
        }
    }, [currentEvent?.id]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            // Pause playback when component unmounts
            if (isPlaying) {
                SpotifyService.pausePlayback().catch(console.error);
            }
        };
    }, []);

    // Provide the context value
    const contextValue: MusicPlayerContextType = {
        isAuthenticated,
        isPlaying,
        currentTrack,
        currentEvent,
        expanded,
        connect,
        playTrackFromEvent,
        togglePlayback,
        toggleExpanded,
        setCurrentEvent,
    };

    return (
        <MusicPlayerContext.Provider value={contextValue}>
            {children}
        </MusicPlayerContext.Provider>
    );
};

// Custom hook to use the music player context
export const useMusicPlayer = () => useContext(MusicPlayerContext);