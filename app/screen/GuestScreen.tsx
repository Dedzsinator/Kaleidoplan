import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StatusBar,
  Platform,
  ScrollView,
  StyleSheet,
  Dimensions
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { getEvents } from '../services/eventService';
import NavBar from '../components/layout/NavBar';
import Hero from '../components/layout/Hero';
import EventSection from '../components/layout/EventSection';
import Footer from '../components/layout/Footer';
import SpotifyRadioOverlay from '../components/actions/SpotifyRadioOverlay';
import { Event } from '../models/types';
import { COLORS } from '../styles/theme';

// Constants
const DEFAULT_IMAGE_URL = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80';
const HEADER_OFFSET = 100;

// Styles using StyleSheet instead of styled components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mainContent: {
    flexGrow: 1,
  },
  contentSection: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
  },
  contentInner: {
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  contentTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: COLORS.white,
    letterSpacing: -1,
  },
  contentSubtitle: {
    fontSize: 18,
    color: '#b3b3b3',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 20,
    marginTop: 16,
  },
  errorMessage: {
    color: COLORS.danger,
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 16,
  },
  eventSectionContainer: {
    marginBottom: 20,
    minHeight: 200,
    backgroundColor: 'rgba(50,50,50,0.5)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  debugText: {
    color: 'white',
    fontWeight: 'bold',
  },
  eventTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scrollButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: 'rgba(10,126,164,0.8)',
    padding: 12,
    borderRadius: 30,
    zIndex: 1000,
  },
  debugOverlay: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0,0,255,0.7)',
    padding: 8,
    borderRadius: 8,
    zIndex: 9999
  },
  footerContainer: {
    paddingBottom: 40,
  },
  spotifyOverlayContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 9999,
    // Shadow styling
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 20,
  },
});

const GuestScreen = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const scrollY = useRef(new Animated.Value(0)).current;
  const sectionPositions = useRef<{ [key: string]: number }>({});
  const [debugScrollPos, setDebugScrollPos] = useState(0);

  // Standard ScrollView ref (not Animated)
  const scrollViewRef = useRef(null);

  // New state for Spotify Radio Overlay
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentVisibleEvent, setCurrentVisibleEvent] = useState<Event | null>(null);

  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_OFFSET],
    outputRange: [0.8, 1],
    extrapolate: 'clamp'
  });

  useEffect(() => {
    // Setup status bar
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }

    fetchEvents();

    return () => {
      // Reset status bar when unmounting
      StatusBar.setHidden(false);
    };
  }, []);

  // Set the first event as the visible event when events are loaded
  useEffect(() => {
    if (events.length > 0 && !currentVisibleEvent) {
      setCurrentVisibleEvent(events[0]);
    }
  }, [events]);

  const validateEvent = (event: any, index: number): Event | null => {
    // Required fields for an event
    if (!event) {
      console.error(`Invalid event data at position ${index}: Event is null or undefined`);
      return null;
    }

    if (!event.playlistId) {
      event.playlistId = `pl${event.id || index + 1}`;
    }

    // Make sure it has an ID (use index as fallback)
    if (!event.id) {
      event.id = `temp-id-${index}`;
    }

    // Ensure essential properties exist (add defaults if missing)
    if (!event.name) {
      event.name = "Unnamed Event";
    }

    // Map coverImage to coverImageUrl if it exists (MongoDB field name mapping)
    if (event.coverImage && !event.coverImageUrl) {
      event.coverImageUrl = event.coverImage;
      console.log(`Mapped coverImage to coverImageUrl for event ${event.name}: ${event.coverImageUrl}`);
    }

    // Fix for coverImageUrl - only use placeholder if it's really missing
    if (!event.coverImageUrl ||
      typeof event.coverImageUrl !== 'string' ||
      event.coverImageUrl.trim() === '') {
      const placeholderImages = [
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2070&auto=format&fit=crop'
      ];

      event.coverImageUrl = placeholderImages[index % placeholderImages.length];
      console.log(`Added placeholder image for event ${event.name} (ID: ${event.id})`);
    } else {
      console.log(`Using existing coverImageUrl for event ${event.name}: ${event.coverImageUrl}`);
    }

    // Process slideshowImages if available
    if (event.slideshowImages) {
      // Check if slideshowImages is a string that needs to be parsed
      if (typeof event.slideshowImages === 'string') {
        // If it's a comma-separated string, split it into an array
        event.slideshowImages = event.slideshowImages
          .split(',')
          .map(url => url.trim())
          .filter(url => url.length > 0);

        console.log(`Processed ${event.slideshowImages.length} slideshow images from string for event ${event.name}`);
      }

      // If the slideshowImages is an array where the first item is a comma-separated string
      // (This handles the case where MongoDB returns an array with a single string containing comma-separated URLs)
      else if (Array.isArray(event.slideshowImages) &&
        event.slideshowImages.length === 1 &&
        typeof event.slideshowImages[0] === 'string' &&
        event.slideshowImages[0].includes(',')) {

        event.slideshowImages = event.slideshowImages[0]
          .split(',')
          .map(url => url.trim())
          .filter(url => url.length > 0);

        console.log(`Processed ${event.slideshowImages.length} slideshow images from array with single string for event ${event.name}`);
      }

      // Make sure all entries in the array are valid
      if (Array.isArray(event.slideshowImages)) {
        event.slideshowImages = event.slideshowImages
          .filter(url => typeof url === 'string' && url.trim().length > 0)
          .map(url => url.trim());

        console.log(`Final slideshow has ${event.slideshowImages.length} valid images for event ${event.name}`);
      }
    }

    // If we have no valid slideshow images, include at least the cover image
    if (!event.slideshowImages || !Array.isArray(event.slideshowImages) || event.slideshowImages.length === 0) {
      if (event.coverImageUrl) {
        event.slideshowImages = [event.coverImageUrl];
        console.log(`Using coverImageUrl as slideshow for event ${event.name}`);
      }
    }

    return event;
  };

  const fetchEvents = async () => {
    try {
      setError(null);
      const eventsData = await getEvents();

      // Validate and filter out invalid events
      const validEvents = eventsData
        .map((event, index) => validateEvent(event, index))
        .filter(event => event !== null) as Event[];

      console.log(`Processed ${validEvents.length} of ${eventsData.length} events`);
      setEvents(validEvents);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events. Please try again later.');
      setLoading(false);
    }
  };

  const handleSectionVisibility = (isVisible, eventData) => {
    console.log(`Event ${eventData.name} (ID: ${eventData.id}) visibility: ${isVisible}`);
    if (isVisible) {
      setCurrentVisibleEvent(eventData);
    }
  };

  const handleImageError = (eventId: string) => {
    setImageLoadErrors(prev => ({ ...prev, [eventId]: true }));
  };

  // For measuring section positions
  const onSectionLayout = (key: string, event: any) => {
    const { y } = event.nativeEvent.layout;
    sectionPositions.current[key] = y;
  };

  // Handler functions for SpotifyRadioOverlay
  const handleTogglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleExpand = () => {
    setExpanded(prev => !prev);
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);
    setDebugScrollPos(offsetY);
    console.log("SCROLL POSITION:", offsetY);
  };

  const scrollDown = () => {
    scrollViewRef.current?.scrollTo({ y: 500, animated: true });
    console.log('Manual scroll triggered');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Animated.Image
          source={require('../../assets/images/logo.png')}
          style={{ width: 100, height: 100 }}
          resizeMode="contain"
        />
        <Text style={styles.loadingText}>Discovering extraordinary events...</Text>
      </View>
    );
  }

  // For hero image
  const heroEvent = events.find(event => event.coverImageUrl) || events[0];
  const heroImageUrl = heroEvent?.coverImageUrl || DEFAULT_IMAGE_URL;

  return (
    <SafeAreaProvider>
      {/* Notice we're using a full-screen container here */}
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

          {/* Fixed Navbar */}
          <NavBar navigation={navigation} opacity={headerOpacity} />

          {/* ScrollView for main content */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.mainContent}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true, listener: handleScroll } // Change to useNativeDriver: true
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={true}
            indicatorStyle="white"
            scrollEnabled={true}
            bounces={true}
            keyboardShouldPersistTaps="handled" // Add this
            // Add these to ensure scrolling works
            alwaysBounceVertical={true}
            nestedScrollEnabled={true}
          >
            {/* Hero Section */}
            <Hero
              navigation={navigation}
              heroImageUrl={heroImageUrl}
              scrollY={scrollY}
            />

            {/* Main Content */}
            <View style={styles.contentSection}>
              <View style={styles.contentInner}>
                <Text style={styles.contentTitle}>Events Calendar</Text>
                <Text style={styles.contentSubtitle}>Explore upcoming and ongoing experiences</Text>

                {/* Error message if any */}
                {error && <Text style={styles.errorMessage}>{error}</Text>}

                {/* Event Sections */}
                <View style={{ marginBottom: 30 }}>
                  {events.map((event, index) => (
                    <View
                      key={event.id || `event-${index}`}
                      onLayout={(event) => onSectionLayout(`section-${index}`, event)}
                      style={[
                        styles.eventSectionContainer,
                        { backgroundColor: `rgba(50,50,50,0.${index + 3})` }
                      ]}
                    >
                      <EventSection
                        event={event}
                        navigation={navigation}
                        onImageError={handleImageError}
                        index={index}
                        scrollY={scrollY}
                        sectionY={sectionPositions.current[`section-${index}`] || 0}
                        onVisibilityChange={handleSectionVisibility}
                      />

                      {/* Separator */}
                      {index < events.length - 1 && (
                        <View style={{
                          height: 2,
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          marginVertical: 30
                        }} />
                      )}
                    </View>
                  ))}

                  {/* Fallback for empty events */}
                  {events.length === 0 && (
                    <View style={styles.noEventsContainer}>
                      <Text style={styles.noEventsText}>
                        No events found. Check back soon for new events!
                      </Text>
                    </View>
                  )}
                </View>

                {/* Footer */}
                <View style={styles.footerContainer}>
                  <Footer />
                </View>
              </View>
            </View>
          </ScrollView>

        </SafeAreaView>

        {currentVisibleEvent && (
          <View style={styles.spotifyOverlayContainer} pointerEvents="box-none">
            <SpotifyRadioOverlay
              currentEvent={currentVisibleEvent}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onExpand={handleExpand}
              expanded={expanded}
            />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );

};

export default GuestScreen;