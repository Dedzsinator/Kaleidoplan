import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

interface MapProps {
    location: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    markers?: Array<{
        coordinate: {
            latitude: number;
            longitude: number;
        };
        title?: string;
        description?: string;
    }>;
    style?: any;
}

const Map = ({ location, markers = [], style }: MapProps) => {
    try {
        return (
            <MapView
                style={[styles.map, style]}
                provider={PROVIDER_GOOGLE}
                initialRegion={location}
                region={location}
            >
                {markers.map((marker, index) => (
                    <Marker
                        key={index}
                        coordinate={marker.coordinate}
                        title={marker.title}
                        description={marker.description}
                    />
                ))}
            </MapView>
        );
    } catch (error) {
        console.error("Error rendering map:", error);
        return (
            <View style={[styles.errorContainer, style]}>
                <Text style={styles.errorText}>Unable to load map</Text>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    map: {
        width: '100%',
        height: '100%',
    },
    errorContainer: {
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#555',
        textAlign: 'center',
    },
});

export default Map;