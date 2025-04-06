import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Footer = () => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.logo}>KALEIDOPLAN</Text>
                    <Text style={styles.tagline}>Transform your event experience</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact</Text>
                    <View style={styles.contactRow}>
                        <Ionicons name="mail-outline" size={18} color="#A3A3A3" />
                        <Text style={styles.contactText}>info@kaleidoplan.com</Text>
                    </View>
                    <View style={styles.contactRow}>
                        <Ionicons name="call-outline" size={18} color="#A3A3A3" />
                        <Text style={styles.contactText}>+123 456 7890</Text>
                    </View>
                    <View style={styles.contactRow}>
                        <Ionicons name="location-outline" size={18} color="#A3A3A3" />
                        <Text style={styles.contactText}>123 Event St., City, Country</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Follow Us</Text>
                    <View style={styles.socialRow}>
                        <TouchableOpacity style={styles.socialButton}>
                            <Ionicons name="logo-twitter" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialButton}>
                            <Ionicons name="logo-facebook" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialButton}>
                            <Ionicons name="logo-instagram" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialButton}>
                            <Ionicons name="logo-linkedin" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.bottomBar}>
                <Text style={styles.copyright}>© 2025 Kaleidoplan. All rights reserved.</Text>
                <View style={styles.links}>
                    <TouchableOpacity>
                        <Text style={styles.link}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <Text style={styles.divider}>|</Text>
                    <TouchableOpacity>
                        <Text style={styles.link}>Terms of Service</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#111827',
        paddingTop: 60,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    content: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        paddingHorizontal: 24,
        paddingBottom: 40,
        gap: 32,
    },
    section: {
        minWidth: 250,
        marginBottom: 20,
    },
    logo: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        letterSpacing: -1,
    },
    tagline: {
        color: '#9CA3AF',
        fontSize: 16,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    contactText: {
        color: '#9CA3AF',
        marginLeft: 10,
        fontSize: 15,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 12,
    },
    socialButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(75, 85, 99, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomBar: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 24,
        paddingHorizontal: 24,
    },
    copyright: {
        color: '#9CA3AF',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    links: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    link: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    divider: {
        color: '#4B5563',
        marginHorizontal: 12,
    },
});

export default Footer;