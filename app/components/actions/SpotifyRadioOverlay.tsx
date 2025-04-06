import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import spotifyService from '../../services/spotify-web-api';

interface SpotifyRadioOverlayProps {
    currentEvent: any;
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
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Animation for the equalizer effect when playing
    useEffect(() => {
        if (isPlaying) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }).stop();
        }
    }, [isPlaying]);

    // When the current event changes, fetch a related track
    useEffect(() => {
        if (currentEvent?.performers?.length > 0) {
            fetchRelatedTrack();
        }
    }, [currentEvent]);

    const fetchRelatedTrack = async () => {
        if (!currentEvent?.performers?.length) return;

        setIsLoading(true);
        try {
            const performer = currentEvent.performers[0]; // Get first performer

            // Use the service instance directly
            const searchResult = await spotifyService.searchTracks(`artist:${performer.name}`);

            if (searchResult.tracks.items.length > 0) {
                setCurrentTrack(searchResult.tracks.items[0]);
            }
        } catch (error) {
            console.error('Error fetching track:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Use placeholder data for design purposes
    const eventName = currentEvent?.name || "No event in view";
    const artistName = currentEvent?.performers?.[0]?.name || "Unknown Artist";
    const trackName = currentTrack?.name || "Not Playing";
    const artworkUrl = currentTrack?.album?.images?.[0]?.url ||
        'https://via.placeholder.com/60';

    return (
        <LinearGradient
            colors={['rgba(10, 10, 10, 0.85)', 'rgba(30, 30, 30, 0.95)']}
            style={[
                styles.container,
                expanded ? styles.containerExpanded : null
            ]}
        >
            <View style={styles.content}>
                <Image source={{ uri: artworkUrl }} style={styles.artwork} />

                <View style={styles.textContainer}>
                    <Text style={styles.trackName} numberOfLines={1}>
                        {trackName}
                    </Text>
                    <Text style={styles.artistName} numberOfLines={1}>
                        {artistName}
                    </Text>
                    {expanded && (
                        <Text style={styles.eventName} numberOfLines={1}>
                            From: {eventName}
                        </Text>
                    )}
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity onPress={onTogglePlay} style={styles.playButton}>
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={24}
                            color="#fff"
                        />
                        {isPlaying && (
                            <View style={styles.equalizerContainer}>
                                <Animated.View
                                    style={[
                                        styles.equalizerBar,
                                        { height: 12, transform: [{ scaleY: pulseAnim }] }
                                    ]}
                                />
                                <Animated.View
                                    style={[
                                        styles.equalizerBar,
                                        { height: 16, transform: [{ scaleY: Animated.multiply(pulseAnim, 0.8) }] }
                                    ]}
                                />
                                <Animated.View
                                    style={[
                                        styles.equalizerBar,
                                        { height: 10, transform: [{ scaleY: Animated.multiply(pulseAnim, 1.2) }] }
                                    ]}
                                />
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onExpand} style={styles.expandButton}>
                        <Ionicons
                            name={expanded ? "chevron-down" : "chevron-up"}
                            size={20}
                            color="#fff"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {expanded && (
                <View style={styles.expandedControls}>
                    <TouchableOpacity style={styles.expandedButton}>
                        <Ionicons name="shuffle" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.expandedButton}>
                        <Ionicons name="play-skip-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.expandedPlayButton}>
                        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.expandedButton}>
                        <Ionicons name="play-skip-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.expandedButton}>
                        <Ionicons name="repeat" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        borderRadius: 16,
        overflow: 'hidden',
        width: 280,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 1000,
    },
    containerExpanded: {
        width: 320,
        height: 160,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    artwork: {
        width: 50,
        height: 50,
        borderRadius: 6,
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    trackName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    artistName: {
        color: '#ddd',
        fontSize: 12,
        marginTop: 2,
    },
    eventName: {
        color: '#aaa',
        fontSize: 11,
        marginTop: 4,
        fontStyle: 'italic',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    expandButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    equalizerContainer: {
        position: 'absolute',
        bottom: -10,
        left: '50%',
        transform: [{ translateX: -12 }],
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 16,
    },
    equalizerBar: {
        width: 3,
        backgroundColor: '#1DB954', // Spotify green
        marginHorizontal: 1,
        borderRadius: 1,
    },
    expandedControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    expandedButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandedPlayButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1DB954', // Spotify green
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SpotifyRadioOverlay;