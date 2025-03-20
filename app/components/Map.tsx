import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

// The actual implementation will be imported automatically
// from either Map.web.tsx or Map.native.tsx based on platform

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

export default Platform.select({
  web: () => require('./Map.web').default,
  default: () => require('./Map.native').default,
})() as React.ComponentType<MapProps>;