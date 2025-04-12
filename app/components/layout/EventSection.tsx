import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Animated } from 'react-native';
import AnimatedSection from '../ui/AnimatedSection';
import EventPrimaryContent from '../ui/EventPrimaryContent';
import EventSecondaryContent from '../ui/EventSecondaryContent';
import { useSectionVisibility } from '../../hooks/useSectionVisibility';
import Map from '../../components/Map';
import * as Location from 'expo-location';
import ImageSlideshow from '../ui/SlideShow';

interface EventSectionProps {
  event: any; // Consider creating a proper Event interface
  navigation: any;
  onImageError: (eventId: string) => void;
  index: number;
  scrollY: Animated.Value;
  sectionY: number;
  onVisibilityChange?: (isVisible: boolean, event: any) => void;
}

const EventSection = ({
  event,
  navigation,
  onImageError,
  index,
  scrollY,
  sectionY,
  onVisibilityChange
}: EventSectionProps) => {
  const delay = index * 150;
  const containerRef = useRef<View>(null);
  const [sectionHeight, setSectionHeight] = useState(0);
  const [mapRegion, setMapRegion] = useState(null);
  const [locationError, setLocationError] = useState('');

  // Measure the section height for visibility calculations
  const onLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setSectionHeight(height);
    console.log(`EventSection ${index} height: ${height}`);
  };

  // Visibility check
  useEffect(() => {
    if (onVisibilityChange && sectionHeight > 0) {
      // Simple visibility check based on scroll position
      const checkVisibility = () => {
        const isVisible = (
          sectionY > scrollY.__getValue() - sectionHeight &&
          sectionY < scrollY.__getValue() + Dimensions.get('window').height
        );
        onVisibilityChange(isVisible, event);
      };

      // Subscribe to scroll changes
      const scrollListener = scrollY.addListener(checkVisibility);

      // Initial check
      checkVisibility();

      return () => scrollY.removeListener(scrollListener);
    }
  }, [sectionHeight, sectionY, scrollY, event, onVisibilityChange]);

  // Get location for map - now prioritizes coordinates from the event object
  useEffect(() => {
    const getLocation = async () => {
      // First check if we already have coordinates in the event object
      if (event?.latitude && event?.longitude) {
        setMapRegion({
          latitude: event.latitude,
          longitude: event.longitude,
          latitudeDelta: event.latitudeDelta || 0.01,
          longitudeDelta: event.longitudeDelta || 0.01,
        });
        setLocationError('');
        return; // Exit early since we have coordinates
      }

      // Fall back to geocoding if we don't have coordinates
      if (event?.location) {
        try {
          // Request permission first
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setLocationError('Location permission not granted');
            return;
          }

          // Try to geocode the address to get coordinates
          const geocodeResult = await Location.geocodeAsync(event.location);

          if (geocodeResult.length > 0) {
            setMapRegion({
              latitude: geocodeResult[0].latitude,
              longitude: geocodeResult[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            console.log(`Geocoded ${event.location} to:`, geocodeResult[0].latitude, geocodeResult[0].longitude);
            setLocationError('');
          } else {
            setLocationError('Location not found');
          }
        } catch (error) {
          console.error('Error getting location:', error);
          setLocationError('Error getting location');
        }
      }
    };

    getLocation();
  }, [event]);

  // If event is missing, render a placeholder
  if (!event || !event.id) {
    return (
      <View style={newStyles.errorContainer}>
        <Text style={newStyles.errorText}>Invalid event data at position {index}</Text>
      </View>
    );
  }

  // Prepare slideshow images
  const slideshowImages = Array.isArray(event.slideshowImages)
    ? event.slideshowImages
    : (event.coverImageUrl ? [event.coverImageUrl] : []);

  return (
    <View
      style={newStyles.container}
      ref={containerRef}
      onLayout={onLayout}
    >
      <View style={newStyles.innerContainer}>
        <View style={newStyles.contentRow}>
          {/* Left column */}
          <View style={newStyles.leftColumn}>
            <AnimatedSection
              scrollY={scrollY}
              sectionY={sectionY}
              delay={delay}
            >
              <EventPrimaryContent
                event={event}
                navigation={navigation}
                onImageError={onImageError}
              />

              {slideshowImages.length > 0 && (
                <View style={newStyles.slideshowContainer}>
                  <Text style={newStyles.sectionTitle}>Event Gallery</Text>
                  <ImageSlideshow
                    images={slideshowImages}
                    height={200}
                    interval={5000}
                    showGradient={true}
                  />
                </View>
              )}

              <View style={newStyles.descriptionContainer}>
                <Text style={newStyles.sectionTitle}>About this event</Text>
                <Text style={newStyles.descriptionText} numberOfLines={4}>
                  {event.description || "No description available"}
                </Text>
              </View>
            </AnimatedSection>
          </View>

          {/* Right column */}
          <View style={newStyles.rightColumn}>
            <AnimatedSection
              scrollY={scrollY}
              sectionY={sectionY}
              delay={delay + 200}
            >
              <View style={newStyles.secondaryContainer}>
                <EventSecondaryContent event={event} />
              </View>

              <View style={newStyles.mapWrapper}>
                <Text style={newStyles.sectionTitle}>Event Location</Text>
                <View style={newStyles.mapContainer}>
                  {mapRegion ? (
                    <Map
                      region={mapRegion}
                      markers={[
                        {
                          coordinate: {
                            latitude: mapRegion.latitude,
                            longitude: mapRegion.longitude
                          },
                          title: event.name,
                          description: event.location
                        }
                      ]}
                      style={newStyles.map}
                      scrollEnabled={false}
                    />
                  ) : (
                    <View style={newStyles.mapPlaceholder}>
                      <Text style={newStyles.placeholderText}>
                        {locationError || 'Loading location...'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={newStyles.locationText}>
                  {event.location || "Location not specified"}
                  {event.latitude && event.longitude ? ` (${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)})` : ''}
                </Text>
              </View>
            </AnimatedSection>
          </View>
        </View>
      </View>

      <View style={newStyles.divider} />
    </View>
  );
};

const newStyles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 24,
  },
  innerContainer: {
    width: '100%',
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  // Content layout
  contentRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  leftColumn: {
    flex: 3,
    minWidth: 280,
    marginRight: 16,
    marginBottom: 16,
  },
  rightColumn: {
    flex: 2,
    minWidth: 240,
    marginBottom: 16,
  },

  // Secondary content
  secondaryContainer: {
    marginBottom: 24,
  },

  // Map section
  mapWrapper: {
    marginBottom: 24,
  },
  mapContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    height: 350, // Fixed height for map
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },

  // Text elements
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  descriptionContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  descriptionText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
  },
  placeholderText: {
    color: '#aaa',
    textAlign: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 8,
  },

  // Error handling
  errorContainer: {
    padding: 16,
    backgroundColor: 'rgba(255,100,100,0.1)',
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
  },

  // Slideshow
  slideshowContainer: {
    marginTop: 24,
    marginBottom: 8,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
});

export default EventSection;