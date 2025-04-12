import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StatusBar,
  Platform,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity // Add this for better touch handling
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GuestScreen = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const sectionPositions = useRef<{ [key: string]: number }>({});
  const [scrollPosition, setScrollPosition] = useState(0);
  const [networkStatus, setNetworkStatus] = useState<string>('Waiting to fetch events...');

  // Spotify overlay state
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
    fetchEvents();

    // Set status bar
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }

    return () => {
      StatusBar.setHidden(false);
    };
  }, []);

  // Set the first event as the visible event when events are loaded
  useEffect(() => {
    if (events.length > 0 && !currentVisibleEvent) {
      setCurrentVisibleEvent(events[0]);
    }
  }, [events]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        setScrollPosition(offsetY);
      }
    }
  );

  const validateEvent = (event: any, index: number): Event | null => {
    // (Existing validation code)
    if (!event) {
      console.error(`Invalid event data at position ${index}`);
      return null;
    }

    if (!event.playlistId) {
      event.playlistId = `pl${event.id || index + 1}`;
    }

    if (!event.id) {
      event.id = `temp-id-${index}`;
    }

    if (!event.name) {
      event.name = "Unnamed Event";
    }

    if (event.coverImage && !event.coverImageUrl) {
      event.coverImageUrl = event.coverImage;
    }

    if (!event.coverImageUrl ||
      typeof event.coverImageUrl !== 'string' ||
      event.coverImageUrl.trim() === '') {
      const placeholderImages = [
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1080&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1080&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1080&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1080&auto=format&fit=crop'
      ];
      event.coverImageUrl = placeholderImages[index % placeholderImages.length];
    }

    if (event.slideshowImages) {
      if (typeof event.slideshowImages === 'string') {
        event.slideshowImages = event.slideshowImages
          .split(',')
          .map(url => url.trim())
          .filter(url => url.length > 0);
      } else if (Array.isArray(event.slideshowImages) &&
        event.slideshowImages.length === 1 &&
        typeof event.slideshowImages[0] === 'string' &&
        event.slideshowImages[0].includes(',')) {
        event.slideshowImages = event.slideshowImages[0]
          .split(',')
          .map(url => url.trim())
          .filter(url => url.length > 0);
      }

      if (Array.isArray(event.slideshowImages)) {
        event.slideshowImages = event.slideshowImages
          .filter(url => typeof url === 'string' && url.trim().length > 0)
          .map(url => url.trim());
      }
    }

    if (!event.slideshowImages ||
      !Array.isArray(event.slideshowImages) ||
      event.slideshowImages.length === 0) {
      if (event.coverImageUrl) {
        event.slideshowImages = [event.coverImageUrl];
      }
    }

    return event;
  };

  const fetchEvents = async () => {
    try {
      setError(null);
      setNetworkStatus('Connecting to server...');

      const eventsData = await getEvents();
      setNetworkStatus(`Successfully fetched ${eventsData.length} events`);

      const validEvents = eventsData
        .map((event, index) => validateEvent(event, index))
        .filter(event => event !== null) as Event[];

      setEvents(validEvents);
      if (validEvents.length === 0) {
        setError('No valid events found');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setNetworkStatus(`Error: ${error.message}`);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionVisibility = (isVisible, eventData) => {
    if (isVisible) {
      setCurrentVisibleEvent(eventData);
    }
  };

  const onSectionLayout = (key: string, event: any) => {
    const { y } = event.nativeEvent.layout;
    sectionPositions.current[key] = y;
  };
  const handleTogglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleExpand = () => {
    setExpanded(prev => !prev);
  };

  if (loading) {
    return (
      <View style={rootStyles.loadingContainer}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={rootStyles.loadingText}>Discovering extraordinary events...</Text>
      </View>
    );
  }

  // For hero image
  const heroEvent = events.find(event => event.coverImageUrl) || events[0];
  const heroImageUrl = heroEvent?.coverImageUrl || DEFAULT_IMAGE_URL;

  const renderEventItem = ({ item, index }) => (
    <TouchableWithoutFeedback>
      <View
        key={item.id}
        onLayout={(event) => onSectionLayout(`section-${index}`, event)}
        style={[
          rootStyles.eventSectionContainer,
          { backgroundColor: `rgba(40,40,40,0.${index + 5})` }
        ]}
      >
        <EventSection
          event={item}
          navigation={navigation}
          onImageError={() => { }}
          index={index}
          scrollY={scrollY}
          sectionY={sectionPositions.current[`section-${index}`] || 0}
          onVisibilityChange={handleSectionVisibility}
        />
      </View>
    </TouchableWithoutFeedback>
  );

  const ListHeader = () => (
    <View>
      {/* Hero Section */}
      <Hero
        navigation={navigation}
        heroImageUrl={heroImageUrl}
        scrollY={scrollY}
      />

      {/* Main Content Header */}
      <View style={rootStyles.contentHeader}>
        <Text style={rootStyles.contentTitle}>Events Calendar</Text>
        <Text style={rootStyles.contentSubtitle}>Explore upcoming and ongoing experiences</Text>

        {/* Network status message */}
        {networkStatus && <Text style={rootStyles.networkStatus}>{networkStatus}</Text>}

        {/* Error message if any */}
        {error && <Text style={rootStyles.errorMessage}>{error}</Text>}
      </View>
    </View>
  );

  // Footer component for FlatList
  const ListFooter = () => (
    <View style={rootStyles.footerContainer}>
      <Footer />
    </View>
  );

  // Empty component when no events
  const ListEmpty = () => (
    <View style={rootStyles.noEventsContainer}>
      <Text style={rootStyles.noEventsText}>
        No events found. Check back soon for new events!
      </Text>
    </View>
  );

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={rootStyles.container}>
        {/* FlatList and other content */}
        <FlatList
          ref={flatListRef}
          data={events}
          renderItem={renderEventItem}
          keyExtractor={item => item.id.toString()}
          style={rootStyles.flatList}
          contentContainerStyle={rootStyles.flatListContent}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={5}
          removeClippedSubviews={false}
          bounces={true}
          alwaysBounceVertical={true}
          overScrollMode="always"
          decelerationRate="normal"
          ItemSeparatorComponent={() => <View style={rootStyles.separator} />}
        />

        {/* Fixed NavBar */}
        <View style={rootStyles.navBarContainer} pointerEvents="box-none">
          <NavBar navigation={navigation} opacity={headerOpacity} />
        </View>
      </View>
    </SafeAreaProvider>
  );
};

const rootStyles = StyleSheet.create({
  container: {
    flex: 1, // CRITICAL FIX: Ensure parent container is flex: 1
    backgroundColor: 'black',
  },
  flatList: {
    flex: 1,
    width: '100%',
  },
  flatListContent: {
    paddingBottom: 120,
  },
  networkStatus: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  navBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    pointerEvents: 'box-none', // CRITICAL FIX: Ensure correct pointer events
  },
  floatingSpotifyContainer: {
    position: 'absolute',
    bottom: 40, // Higher position from bottom
    right: 16,
    zIndex: 9999,
    elevation: 20, // Higher elevation for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Add a background for visibility
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 24,
    padding: 4,
    // Add subtle border
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    // Ensure it gets touch events
    pointerEvents: 'auto',
  },
  contentHeader: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  eventSectionContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  separator: {
    height: 16,
  },

  contentTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#ffffff',
  },
  contentSubtitle: {
    fontSize: 16,
    color: '#b3b3b3',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#ff6b6b',
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 16,
    padding: 12,
    backgroundColor: 'rgba(255,50,50,0.1)',
    borderRadius: 8,
  },
  noEventsText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    padding: 40,
  },
  noEventsContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    margin: 24,
    padding: 24,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 16,
  },

  footerContainer: {
    backgroundColor: '#121212',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 100,
  },

  spotifyOverlayContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    zIndex: 9999,
    pointerEvents: 'box-none', // CRITICAL FIX: Ensure correct pointer events
  },
});

export default GuestScreen;