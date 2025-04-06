import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface EventPrimaryContentProps {
    event: {
        id: string;
        name: string;
        coverImageUrl?: string;
        startDate?: string | Date;
        location?: string;
        status?: string;
        description?: string;
        themeColor?: string;
    };
    navigation: any;
    onImageError: (eventId: string) => void;
}

const formatEventDate = (date) => {
    if (!date) return "Date TBD";
    const eventDate = typeof date === 'string' ? new Date(date) : date;
    return format(eventDate, 'MMMM d, yyyy');
};

const getStatusColor = (status) => {
    switch (status) {
        case 'upcoming': return { text: 'text-blue-400', dot: 'bg-blue-400' };
        case 'ongoing': return { text: 'text-green-400', dot: 'bg-green-400' };
        case 'completed': return { text: 'text-gray-400', dot: 'bg-gray-400' };
        default: return { text: 'text-gray-400', dot: 'bg-gray-400' };
    }
};

const EventPrimaryContent = ({ event, navigation, onImageError }: EventPrimaryContentProps) => {
    const statusColor = getStatusColor(event.status || 'upcoming');
    const hasImage = !!event.coverImageUrl;
    const themeColor = event.themeColor || '#3B82F6';
    const hasName = !!event?.name;
    const hasId = !!event?.id;

    // If missing name or ID, this condition was intended to render a placeholder
    // But there's no return statement outside this condition which is likely the issue
    if (!hasName || !hasId) {
        return (
            <View style={styles.container}>
                <Text>Invalid or incomplete event data</Text>
            </View>
        );
    }

    // Add this return statement for the normal rendering case
    return (
        <View style={styles.container}>
            <View style={[styles.imageContainer, {
                shadowColor: themeColor,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
                elevation: 10
            }]}>
                {hasImage ? (
                    <Image
                        source={{ uri: event.coverImageUrl }}
                        style={styles.image}
                        resizeMode="cover"
                        onError={() => onImageError(event.id)}
                    />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Text style={styles.placeholderText}>
                            {event.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.contentContainer}>
                <Text style={styles.title}>{event.name}</Text>

                <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={24} color="#A3A3A3" />
                    <Text style={styles.metaText}>
                        {formatEventDate(event.startDate)}
                    </Text>
                </View>

                <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={24} color="#A3A3A3" />
                    <Text style={styles.metaText}>
                        {event.location || "Location unavailable"}
                    </Text>
                </View>

                <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, {
                        backgroundColor: statusColor.dot.includes('blue') ? '#3B82F6' :
                            statusColor.dot.includes('green') ? '#10B981' : '#9CA3AF'
                    }]} />
                    <Text style={[styles.statusText, {
                        color: statusColor.text.includes('blue') ? '#3B82F6' :
                            statusColor.text.includes('green') ? '#10B981' : '#9CA3AF'
                    }]}>
                        {(event.status || "UPCOMING").toUpperCase()}
                    </Text>
                </View>

                {event.description && (
                    <Text style={styles.description} numberOfLines={3}>
                        {event.description}
                    </Text>
                )}

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: themeColor }]}
                    onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                >
                    <Text style={styles.buttonText}>View Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginBottom: 48,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#1F2937',
        marginBottom: 24,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1F2937',
    },
    placeholderText: {
        fontSize: 80,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.1)',
    },
    contentContainer: {
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
        fontFamily: 'System',
        letterSpacing: -0.5,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    metaText: {
        fontSize: 18,
        color: '#A3A3A3',
        marginLeft: 12,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        color: '#D1D5DB',
        lineHeight: 24,
        marginTop: 16,
        marginBottom: 24,
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default EventPrimaryContent;