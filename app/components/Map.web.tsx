import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Marker {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
}

interface MapProps {
  region: {  // CHANGED FROM 'location' to 'region' to match other files
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  };
  markers?: Marker[];
  style?: any;
}

const Map = ({ region, markers = [], style }: MapProps) => {  // CHANGED FROM 'location' to 'region'
  // Error handling
  if (!region) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>Map unavailable</Text>
      </View>
    );
  }

  // Create OpenStreetMap URL
  const { latitude, longitude } = region;
  const openStreetMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <View style={[styles.container, style]}>
      <iframe
        src={openStreetMapUrl}
        style={{ border: 0, width: '100%', height: '100%' }}
        title="Location Map"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
      />
      {markers.length > 0 && markers[0].title && (
        <Text style={styles.title}>{markers[0].title}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
  },
  mapFrame: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  errorText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 90,
  },
  title: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: 5,
    borderRadius: 4,
    fontSize: 12,
  },
});

export default Map;