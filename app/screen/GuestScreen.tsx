import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StatusBar,
  Platform,
  ScrollView,
  SafeAreaView,
  StyleSheet
} from 'react-native';
import { getEvents } from '../services/eventService';
import NavBar from '../components/layout/NavBar';
import Hero from '../components/layout/Hero';
import EventSection from '../components/layout/EventSection';
import Footer from '../components/layout/Footer';
import SpotifyRadioOverlay from '../components/actions/SpotifyRadioOverlay';
import { styled } from 'nativewind';
import { Event } from '../models/types';

// Constants
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HERO_HEIGHT = 650;
const HEADER_OFFSET = 100;
const DEFAULT_IMAGE_URL = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80';

// Styled components
const MainContainer = styled(SafeAreaView, 'flex-1 bg-black');
const ContentSection = styled(View, 'bg-gray-900 rounded-t-[30px] -mt-10');
const ContentInner = styled(View, 'pt-16 px-6');
const ContentTitle = styled(Text, 'text-5xl font-bold mb-4 text-center text-white');
const ContentSubtitle = styled(Text, 'text-xl text-gray-300 mb-10 text-center');
const LoadingContainer = styled(View, 'flex-1 items-center justify-center bg-black');
const LoadingText = styled(Text, 'text-white text-xl mt-4');
const ErrorMessage = styled(Text, 'text-red-500 text-lg text-center my-4');

// Pure styles for critical parts
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120, // Space for footer
  },
});

const GuestScreen = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const scrollY = useRef(new Animated.Value(0)).current;
  const sectionPositions = useRef<{ [key: string]: number }>({});

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

    // Make sure it has an ID (use index as fallback)
    if (!event.id) {
      event.id = `temp-id-${index}`;
    }

    // Ensure essential properties exist (add defaults if missing)
    if (!event.name) {
      event.name = "Unnamed Event";
    }

    // Preserve original coverImageUrl if it exists, otherwise use placeholder
    if (!event.coverImageUrl || typeof event.coverImageUrl !== 'string' || event.coverImageUrl.trim() === '') {
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

    // Create a performers array if missing
    if (!event.performers || !Array.isArray(event.performers)) {
      event.performers = [];
    }

    // Ensure each performer has at least an id and name
    event.performers = event.performers.map((performer, i) => {
      if (!performer) return { id: `performer-${index}-${i}`, name: "Unknown Artist" };
      if (!performer.id) performer.id = `performer-${index}-${i}`;
      if (!performer.name) performer.name = "Unknown Artist";
      return performer;
    });

    return event as Event;
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

  const handleImageError = (eventId: string) => {
    setImageLoadErrors(prev => ({ ...prev, [eventId]: true }));
  };

  // Simpler scroll handler that just updates the scroll position value
  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);
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

  if (loading) {
    return (
      <LoadingContainer>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Animated.Image
          source={require('../../assets/images/logo.png')}
          style={{ width: 100, height: 100 }}
          resizeMode="contain"
        />
        <LoadingText>Discovering extraordinary events...</LoadingText>
      </LoadingContainer>
    );
  }

  // For hero image (use the first event with an image or fallback)
  const heroEvent = events.find(event => event.coverImageUrl) || events[0];
  const heroImageUrl = heroEvent?.coverImageUrl || DEFAULT_IMAGE_URL;

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Navbar - Fixed position */}
      <NavBar navigation={navigation} opacity={headerOpacity} />

      {/* Using standard ScrollView instead of Animated for better compatibility */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
      >
        {/* Hero Section */}
        <Hero
          navigation={navigation}
          heroImageUrl={heroImageUrl}
          scrollY={scrollY}
        />

        {/* Main Content */}
        <ContentSection>
          <ContentInner>
            <ContentTitle style={{ fontFamily: 'System', letterSpacing: -1 }}>
              Events Calendar
            </ContentTitle>
            <ContentSubtitle>
              Explore upcoming and ongoing experiences
            </ContentSubtitle>

            {/* Error message if any */}
            {error && <ErrorMessage>{error}</ErrorMessage>}

            {/* Event Sections - Using pure View components */}
            <View style={{ marginBottom: 30 }}>
              {events.map((event, index) => (
                <View
                  key={event.id || `event-${index}`}
                  onLayout={(event) => onSectionLayout(`section-${index}`, event)}
                  style={{ marginBottom: 20 }}
                >
                  <EventSection
                    event={event}
                    navigation={navigation}
                    onImageError={handleImageError}
                    index={index}
                    scrollY={scrollY}
                    sectionY={sectionPositions.current[`section-${index}`] || 0}
                  />
                </View>
              ))}

              {events.length === 0 && (
                <View style={{
                  padding: 20,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  marginVertical: 40
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 18,
                    textAlign: 'center'
                  }}>
                    No events found. Check back soon for new events!
                  </Text>
                </View>
              )}
            </View>
          </ContentInner>

          {/* Footer */}
          <View style={{ paddingBottom: 40 }}>
            <Footer />
          </View>
        </ContentSection>
      </ScrollView>

      {/* Spotify Radio Overlay */}
      {currentVisibleEvent && (
        <View style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 1000,
        }}>
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
  );
};

export default GuestScreen;