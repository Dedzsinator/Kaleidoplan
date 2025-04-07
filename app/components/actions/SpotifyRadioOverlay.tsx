import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { Event, Playlist, Track } from '../../models/types';
import { usePlaylist } from '../../hooks/usePlaylist';
import spotifyService from '../../services/spotify-web-api';
import { playTrack, pauseTrack, resumeTrack } from '../../services/playlistService';
import { Audio } from 'expo-av';

interface SpotifyRadioOverlayProps {
    currentEvent: Event;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onExpand: () => void;
    expanded: boolean;
}

const SpotifyRadioOverlay = ({
    currentEvent,
    isPlaying,
    onTogglePlay,
    onExpand,
    expanded
}: SpotifyRadioOverlayProps) => {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [audioInitialized, setAudioInitialized] = useState(false);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    
    const { playlist, loading, error } = usePlaylist(currentEvent?.playlistId);

    // Initialize Audio 
    useEffect(() => {
        const initAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false
                });
                setAudioInitialized(true);
            } catch (error) {
                console.error('Error initializing audio:', error);
                setPlaybackError('Could not initialize audio system');
            }
        };
        
        initAudio();
    }, []);

    // Get current track
    const getCurrentTrack = useCallback((): Track | null => {
        if (!playlist || !playlist.tracks) return null;
        const trackIds = Object.keys(playlist.tracks);
        if (trackIds.length === 0) return null;

        return playlist.tracks[trackIds[currentTrackIndex % trackIds.length]];
    }, [playlist, currentTrackIndex]);

    // Handle playback state changes
    useEffect(() => {
        const handlePlayback = async () => {
            const track = getCurrentTrack();
            if (!track) return;

            if (isPlaying) {
                setIsLoading(true);
                const success = await playTrack(track);
                setIsLoading(false);
                if (!success) {
                    setPlaybackError('Unable to play track');
                    onTogglePlay(); // Turn off play state
                }
            } else {
                pauseTrack();
            }
        };

        if (audioInitialized) {
            handlePlayback();
        }
    }, [isPlaying, audioInitialized, getCurrentTrack]);

    // Next track function
    const nextTrack = useCallback(() => {
        if (!playlist?.tracks) return;
        const trackIds = Object.keys(playlist.tracks);
        setCurrentTrackIndex((prev) => (prev + 1) % trackIds.length);
        
        // If playing, restart with new track
        if (isPlaying) {
            pauseTrack().then(() => {
                const nextTrack = playlist.tracks[trackIds[(currentTrackIndex + 1) % trackIds.length]];
                playTrack(nextTrack);
            });
        }
    }, [playlist, currentTrackIndex, isPlaying]);

    // Previous track function
    const prevTrack = useCallback(() => {
        if (!playlist?.tracks) return;
        const trackIds = Object.keys(playlist.tracks);
        setCurrentTrackIndex((prev) => (prev - 1 + trackIds.length) % trackIds.length);
        
        // If playing, restart with new track
        if (isPlaying) {
            pauseTrack().then(() => {
                const prevTrack = playlist.tracks[trackIds[(currentTrackIndex - 1 + trackIds.length) % trackIds.length]];
                playTrack(prevTrack);
            });
        }
    }, [playlist, currentTrackIndex, isPlaying]);

    // Get the current track
    const currentTrack = getCurrentTrack();

    // If there's no playlist or no tracks, show a simplified version
    if (loading || !playlist || !currentTrack) {
        return (
            <View style={[styles.container, styles.miniPlayer]}>
                <Image
                    source={{ uri: currentEvent?.coverImageUrl }}
                    style={styles.miniImage}
                />
                <View style={styles.miniInfo}>
                    <Text style={styles.miniTitle} numberOfLines={1}>
                        {currentEvent?.name || 'Loading event'}
                    </Text>
                    <Text style={styles.miniArtist} numberOfLines={1}>
                        Loading music...
                    </Text>
                </View>
                <TouchableOpacity style={styles.miniPlayButton} disabled={true}>
                    <Text style={styles.playButtonIcon}>⏳</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Handle play/pause toggle
    const handlePlayPauseToggle = () => {
        onTogglePlay();
    };

    // Render the full player when we have track data
    return expanded ? (
        <View style={[styles.container, styles.expandedContainer]}>
            <TouchableOpacity style={styles.closeButton} onPress={onExpand}>
                <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            
            <View style={styles.expandedPlayer}>
                <Image
                    source={{ uri: currentTrack.albumArt || currentEvent.coverImageUrl }}
                    style={styles.albumArt}
                    resizeMode="cover"
                />
                
                <Text style={styles.playlistName}>{playlist.name}</Text>
                <Text style={styles.trackTitle}>{currentTrack.name}</Text>
                <Text style={styles.artistName}>{currentTrack.artist}</Text>
                
                {playbackError && (
                    <Text style={styles.errorText}>{playbackError}</Text>
                )}
                
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.controlButton} onPress={prevTrack}>
                        <Text style={styles.controlButtonIcon}>⏮️</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.playButton}
                        onPress={handlePlayPauseToggle}
                        disabled={isLoading}
                    >
                        <Text style={styles.playButtonIcon}>
                            {isLoading ? '⏳' : isPlaying ? '⏸' : '▶️'}
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.controlButton} onPress={nextTrack}>
                        <Text style={styles.controlButtonIcon}>⏭️</Text>
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.eventName}>From: {currentEvent.name}</Text>
            </View>
        </View>
    ) : (
        <View style={[styles.container, styles.miniPlayer]}>
            <TouchableOpacity style={styles.miniImageContainer} onPress={onExpand}>
                <Image
                    source={{ uri: currentTrack.albumArt || currentEvent.coverImageUrl }}
                    style={styles.miniImage}
                />
            </TouchableOpacity>
            
            <View style={styles.miniInfo}>
                <Text style={styles.miniTitle} numberOfLines={1}>{currentTrack.name}</Text>
                <Text style={styles.miniArtist} numberOfLines={1}>{currentTrack.artist}</Text>
            </View>
            
            <TouchableOpacity 
                style={styles.miniPlayButton} 
                onPress={handlePlayPauseToggle}
                disabled={isLoading}
            >
                <Text style={styles.playButtonIcon}>
                    {isLoading ? '⏳' : isPlaying ? '⏸' : '▶️'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        width: 280,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10
    },
    expandedContainer: {
        height: 400,
    },
    miniPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'rgba(30, 215, 96, 0.9)',
    },
    miniImageContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden'
    },
    miniImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    miniInfo: {
        flex: 1,
        marginLeft: 10,
    },
    miniTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    miniArtist: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
    },
    miniPlayButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandedPlayer: {
        padding: 16,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    albumArt: {
        width: 200,
        height: 200,
        borderRadius: 8,
        marginBottom: 16,
    },
    playlistName: {
        color: '#1DB954', // Spotify green
        fontSize: 14,
        marginBottom: 8,
    },
    trackTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    artistName: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        marginBottom: 24,
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 12,
        marginBottom: 12,
        textAlign: 'center'
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 24,
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1DB954',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
    },
    playButtonIcon: {
        fontSize: 24,
        color: 'white',
    },
    controlButtonIcon: {
        fontSize: 20,
        color: 'white',
    },
    eventName: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
    }
});

export default SpotifyRadioOverlay;