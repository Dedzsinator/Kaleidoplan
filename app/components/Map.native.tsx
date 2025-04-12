import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface MapMarker {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
}

interface MapProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: MapMarker[];
  style?: any;
}

// Native implementation of the Map component for iOS/Android
const Map = ({ region, markers = [], style }: MapProps) => {
  if (!region) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>Map unavailable</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={styles.map}
        region={region}
        scrollEnabled={false}  // Disable map scrolling so it doesn't interfere
        zoomEnabled={false}    // Disable zoom gestures
        rotateEnabled={false}  // Disable rotation gestures
        pitchEnabled={false}   // Disable pitch gestures
      >
        {markers.map((marker, index) => (
          <Marker
            key={`marker-${index}`}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  errorText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 90,
  },
});

export default Map;