import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EventSecondaryContentProps {
    event: {
        id: string;
        name: string;
        price?: string | number;
        remainingSpots?: number;
        organizer?: string;
        themeColor?: string;
    };
}

const EventSecondaryContent = ({ event }: EventSecondaryContentProps) => {
    const eventName = event?.name ?? "Unnamed Event";
    const eventPrice = event?.price ?? "Free";
    const eventOrganizer = event?.organizer ?? "Kaleidoplan Team";

    const [email, setEmail] = useState('');
    const [notifyMe, setNotifyMe] = useState(false);
    const themeColor = event?.themeColor ?? '#3B82F6';

    const handleNotifyMe = () => {
        if (!email.trim()) {
            Alert.alert('Email Required', 'Please enter your email to get notifications.');
            return;
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        // Here you would normally send the email to your backend
        Alert.alert(
            'Notification Set',
            `We'll notify you about updates for "${event.name}"`,
            [{ text: 'OK' }]
        );

        setNotifyMe(true);
    };

    return (
        <View style={styles.container}>
            <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                    <Ionicons name="pricetag-outline" size={20} color="#A3A3A3" />
                    <Text style={styles.label}>Price:</Text>
                    <Text style={styles.value}>
                        {event.price ? `$${event.price}` : 'Free'}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={20} color="#A3A3A3" />
                    <Text style={styles.label}>Availability:</Text>
                    <Text style={styles.value}>
                        {event.remainingSpots ? `${event.remainingSpots} spots left` : 'Limited seats'}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={20} color="#A3A3A3" />
                    <Text style={styles.label}>Organizer:</Text>
                    <Text style={styles.value}>
                        {event.organizer || 'Kaleidoplan Team'}
                    </Text>
                </View>
            </View>

            <View style={styles.notificationBox}>
                <Text style={styles.notificationTitle}>Get Event Updates</Text>
                <Text style={styles.notificationText}>
                    Be the first to know about changes, ticket availability, and other updates.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Your email address"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />

                <TouchableOpacity
                    style={[styles.notifyButton, { backgroundColor: notifyMe ? '#059669' : themeColor }]}
                    onPress={handleNotifyMe}
                    disabled={notifyMe}
                >
                    <Text style={styles.notifyButtonText}>
                        {notifyMe ? 'Notifications Enabled' : 'Notify Me'}
                    </Text>
                    {notifyMe && <Ionicons name="checkmark-circle" size={18} color="white" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        gap: 24,
    },
    infoBox: {
        backgroundColor: 'rgba(31, 41, 55, 0.6)',
        borderRadius: 16,
        padding: 20,
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        color: '#A3A3A3',
        marginLeft: 10,
        width: 100,
    },
    value: {
        fontSize: 16,
        color: 'white',
        fontWeight: '500',
    },
    notificationBox: {
        backgroundColor: 'rgba(31, 41, 55, 0.6)',
        borderRadius: 16,
        padding: 20,
    },
    notificationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    notificationText: {
        fontSize: 15,
        color: '#D1D5DB',
        marginBottom: 20,
        lineHeight: 22,
    },
    input: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        borderRadius: 8,
        padding: 14,
        color: 'white',
        fontSize: 16,
        marginBottom: 16,
    },
    notifyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 8,
    },
    notifyButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default EventSecondaryContent;