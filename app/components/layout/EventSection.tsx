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
  event: any;
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
  };

  // Use our visibility hook
  useSectionVisibility(
    scrollY,
    sectionY,
    sectionHeight,
    (isVisible) => {
      if (onVisibilityChange) {
        onVisibilityChange(isVisible, event);
      }
    }
  );

  // Get location for map
  useEffect(() => {
    const getLocation = async () => {
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
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid event data at position {index}</Text>
      </View>
    );
  }

  // Prepare slideshow images
  const slideshowImages = Array.isArray(event.slideshowImages)
    ? event.slideshowImages
    : (event.coverImageUrl ? [event.coverImageUrl] : []);

  return (
    <View
      style={styles.container}
      ref={containerRef}
      onLayout={onLayout}
    >
      <View style={styles.innerContainer}>
        {/* Top row */}
        <View style={styles.contentRow}>
          {/* Top-left section */}
          <View style={styles.primaryContent}>
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

              {/* Add Slideshow component here */}
              {slideshowImages.length > 0 && (
                <View style={styles.slideshowContainer}>
                  <Text style={styles.slideshowTitle}>Event Gallery</Text>
                  <ImageSlideshow
                    images={slideshowImages}
                    height={200}
                    interval={5000}
                    showGradient={true}
                  />
                </View>
              )}
            </AnimatedSection>
          </View>

          {/* Top-right section */}
          <View style={styles.secondaryContent}>
            <AnimatedSection
              scrollY={scrollY}
              sectionY={sectionY}
              delay={delay + 200}
            >
              <EventSecondaryContent event={event} />
            </AnimatedSection>
          </View>
        </View>

        {/* Bottom row */}
        <View style={styles.contentRow}>
          {/* Bottom-left section - could be for additional event info */}
          <View style={styles.bottomLeftContent}>
            <AnimatedSection
              scrollY={scrollY}
              sectionY={sectionY}
              delay={delay + 300}
            >
              <View style={styles.infoContainer}>
                <Text style={styles.infoTitle}>About this event</Text>
                <Text style={styles.infoText} numberOfLines={4}>
                  {event.description || "No description available"}
                </Text>
              </View>
            </AnimatedSection>
          </View>

          {/* Bottom-right section - Map */}
          <View style={styles.bottomRightContent}>
            <AnimatedSection
              scrollY={scrollY}
              sectionY={sectionY}
              delay={delay + 400}
            >
              <View style={styles.mapContainer}>
                <Text style={styles.mapTitle}>Event Location</Text>
                {mapRegion ? (
                  <Map
                    location={mapRegion}
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
                    style={styles.map}
                  />
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Text style={styles.mapPlaceholderText}>
                      {locationError || 'Loading location...'}
                    </Text>
                  </View>
                )}
                <Text style={styles.locationText}>{event.location || "Location not specified"}</Text>
              </View>
            </AnimatedSection>
          </View>
        </View>
      </View>

      {/* Section divider */}
      <View style={styles.divider} />
    </View>
  );
};

// Updated styles with the new sections
const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    width: '100%',
  },
  innerContainer: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  contentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  primaryContent: {
    flex: 1,
    minWidth: 200,
    marginRight: 8,
  },
  secondaryContent: {
    flex: 1,
    minWidth: 200,
    marginLeft: 8,
  },
  bottomLeftContent: {
    flex: 1,
    minWidth: 200,
    marginRight: 8,
  },
  bottomRightContent: {
    flex: 1,
    minWidth: 200,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    marginVertical: 16,
    alignSelf: 'center',
  },
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
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
  },
  map: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ffffff',
  },
  mapPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  mapPlaceholderText: {
    color: '#555',
    textAlign: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 8,
  },
  infoContainer: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    height: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ffffff',
  },
  infoText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 20,
  },
  // Add slideshow styles
  slideshowContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  slideshowTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
});

export default EventSection;