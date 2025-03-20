import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface MarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
}

interface MapProps {
  location: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  };
  markers?: MarkerProps[];
  style?: any;
}

const Map = ({ location, markers = [], style }: MapProps) => {
  try {
    return (
      <MapView
        style={[styles.container, style]}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: location.latitudeDelta || 0.01,
          longitudeDelta: location.longitudeDelta || 0.01,
        }}
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
    console.error('Error loading MapView component:', error);
    return (
      <View style={[styles.container, style, styles.fallback]}>
        <Text>Map could not be loaded</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: 300,
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

export default Map;