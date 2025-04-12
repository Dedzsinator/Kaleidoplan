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
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: Marker[];
  style?: any;
}

// Web implementation of the Map component
const Map = ({ region, markers = [], style }: MapProps) => {
  // Error is happening because the component is expecting 'location' but receiving 'region'
  if (!region) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>Map unavailable</Text>
      </View>
    );
  }

  const { latitude, longitude } = region;

  // Generate a Google Maps static image URL
  const googleMapsUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=14&size=600x400&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=YOUR_API_KEY`;

  // Alternatively, use OpenStreetMap which doesn't require an API key
  const openStreetMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <View style={[styles.container, style]}>
      <iframe
        src={openStreetMapUrl}
        style={styles.mapFrame}
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