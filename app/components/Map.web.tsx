import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Marker {
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
  markers?: Marker[];
  style?: any;
}

const Map = ({ location, markers = [], style }: MapProps) => {
  return (
    <View style={[styles.container, style]}>
      <iframe
        src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${location.longitude}!3d${location.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1679809220043!5m2!1sen!2sus`}
        style={{ border: 0, width: '100%', height: '100%' }}
        allowFullScreen={true}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: 300,
  },
});

export default Map;