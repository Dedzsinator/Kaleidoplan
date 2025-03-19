import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView,
  TouchableOpacity, 
  Image, 
  StatusBar, 
  Dimensions, 
  Animated, 
  Easing,
  SafeAreaView,
  Platform
} from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { getEvents } from '../services/eventService';
import { Event } from '../models/types';
import {
  Container,
  LoadingContainer,
  Spinner,
  LoadingText,
  EmptyContainer,
  EmptyText,
  PrimaryButton,
  PrimaryButtonText,
  SecondaryButton,
  SecondaryButtonText
} from '../components/ui/theme';

// Constants for layout
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = 650;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const FOOTER_HEIGHT = 80; // Reduced from 120 for a more compact footer

// Update the Footer styled component
const Footer = styled(View, 'bg-black py-4 px-4 border-t border-gray-800');
const FooterText = styled(Text, 'text-gray-400 text-center my-1');

// Dark theme styled components with proper centering
const MainContainer = styled(View, 'flex-1 bg-black');

// Header with dark theme
const HeaderBar = styled(View, `absolute top-0 left-0 right-0 flex-row justify-between items-center px-6 pt-${Platform.OS === 'ios' ? '12' : '16'} pb-4 z-20 bg-black/80`);
const HeaderLogo = styled(Text, 'text-white text-3xl font-bold tracking-tight text-center');
const HeaderButtons = styled(View, 'flex-row items-center');
const HeaderButton = styled(TouchableOpacity, 'py-3 px-6 ml-4 rounded-full border');
const HeaderButtonText = styled(Text, 'text-white text-base font-medium');

// Hero section styling
const HeroSection = styled(View, `h-[${HERO_HEIGHT}px] w-full`);
const HeroBackground = styled(View, 'absolute inset-0 bg-black');
const HeroImage = styled(Image, 'absolute inset-0 w-full h-full');
const HeroGradient = styled(LinearGradient, 'absolute inset-0 bg-opacity-60');
const HeroContent = styled(View, 'absolute inset-0 justify-center items-center px-8 pt-20');
const HeroTitle = styled(Text, 'text-white text-7xl font-extrabold tracking-tight text-center mb-6');
const HeroSubtitle = styled(Text, 'text-white/90 text-2xl mb-12 text-center');

// Content section styling with dark theme
const ContentSection = styled(View, 'bg-gray-900 pt-16 px-6 pb-32 rounded-t-[30px] -mt-10');
const ContentTitle = styled(Text, 'text-5xl font-bold mb-4 text-center text-white');
const ContentSubtitle = styled(Text, 'text-xl text-gray-300 mb-10 text-center');

// Category tabs in dark theme
const CategoryScroll = styled(ScrollView, 'mb-12');
const CategoryTab = styled(TouchableOpacity, 'py-4 px-7 mr-4 rounded-full border');
const CategoryTabText = styled(Text, 'font-medium text-lg text-center');

// Event card styling in dark theme with centered text
const EventCard = styled(Animated.View, 'mb-20');
const EventImageContainer = styled(View, 'w-full aspect-square rounded-2xl overflow-hidden bg-gray-800');
const EventCardImage = styled(Image, 'w-full h-full');
const EventCardDetails = styled(Animated.View, 'mt-6 items-center'); // Centered with animation
const EventCardTitle = styled(Text, 'text-3xl font-bold mb-4 text-white text-center');
const EventCardMeta = styled(Animated.View, 'flex-row items-center justify-center mb-2'); // Centered with animation
const EventCardMetaText = styled(Text, 'text-xl text-gray-300 ml-3 mr-6 text-center');
const EventCardStatus = styled(Animated.View, 'flex-row items-center justify-center mt-3'); // Centered with animation
const EventCardStatusDot = styled(View, 'h-3 w-3 rounded-full');
const EventCardStatusText = styled(Text, 'ml-2 text-base font-medium uppercase tracking-wider text-center');

// Default image URL - use a reliable online image as fallback
const DEFAULT_IMAGE_URL = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80';

const GuestScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const scrollY = useRef(new Animated.Value(0)).current;
  const animatedCards = useRef({}).current;
  
  // Animation refs
  const heroScale = useRef(new Animated.Value(1)).current;
  const heroTitleTranslateY = useRef(new Animated.Value(20)).current;
  const heroTitleOpacity = useRef(new Animated.Value(0)).current;
  
  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0.8, 1],
    extrapolate: 'clamp'
  });
  
  const categories = [
    { id: 'all', name: 'All Events' },
    { id: 'upcoming', name: 'Upcoming' },
    { id: 'ongoing', name: 'Happening Now' },
    { id: 'completed', name: 'Past' }
  ];

  useEffect(() => {
    // Hide the status bar for immersive experience
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }

    fetchEvents();
    
    // Animate hero image
    Animated.sequence([
      Animated.timing(heroScale, {
        toValue: 1.05,
        duration: 8000,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(heroScale, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease)
      })
    ]).start();
    
    // Animate hero title
    Animated.timing(heroTitleTranslateY, {
      toValue: 0,
      duration: 1200,
      delay: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic)
    }).start();
    
    Animated.timing(heroTitleOpacity, {
      toValue: 1,
      duration: 1200,
      delay: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic)
    }).start();

    return () => {
      // Reset status bar when unmounting
      StatusBar.setHidden(false);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const eventsData = await getEvents();
      setEvents(eventsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setLoading(false);
    }
  };

  const formatEventDate = (date) => {
    if (!date) return "Date TBD";
    const eventDate = typeof date === 'string' ? new Date(date) : date;
    return format(eventDate, 'MMMM d, yyyy');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return { text: 'text-blue-400', dot: 'bg-blue-400' };
      case 'ongoing': return { text: 'text-green-400', dot: 'bg-green-400' };
      case 'completed': return { text: 'text-gray-400', dot: 'bg-gray-400' };
      default: return { text: 'text-gray-400', dot: 'bg-gray-400' };
    }
  };

  const filteredEvents = selectedCategory === 'all' 
    ? events 
    : events.filter(event => event.status === selectedCategory);

  // Hero animation
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, HERO_HEIGHT * 0.3],
    extrapolate: 'clamp'
  });
  
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.8],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });
  
  const contentTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: 'clamp'
  });

  // Get animation values for each event card - this creates the staggered animation effect
  const getAnimatedValues = (index) => {
    if (!animatedCards[index]) {
      animatedCards[index] = {
        translateY: new Animated.Value(100),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.9),
        rotate: new Animated.Value(-5),
      };
    }
    return animatedCards[index];
  };

  // This is triggered when an event card becomes visible
  const animateCardIn = (index) => {
    const delay = 100 * index;
    const { translateY, opacity, scale, rotate } = getAnimatedValues(index);
    
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.bezier(0.16, 1, 0.3, 1)), // Custom bezier for smooth curve
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 800,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.bezier(0.34, 1.56, 0.64, 1)), // Slight overshoot
      }),
      Animated.timing(rotate, {
        toValue: 0,
        duration: 800,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.bezier(0.34, 1.56, 0.64, 1)),
      }),
    ]).start();
  };

  const handleImageError = (eventId) => {
    setImageLoadErrors(prev => ({ ...prev, [eventId]: true }));
  };

  // Handle scroll events to trigger animations
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        const { y } = event.nativeEvent.contentOffset;
        // Trigger card animations based on scroll position
        filteredEvents.forEach((_, index) => {
          // Calculate when each card should be visible
          // Each card has a threshold based on its position in the list
          const cardThreshold = HERO_HEIGHT + (index * 200) - 300;
          if (y > cardThreshold) {
            animateCardIn(index);
          }
        });
      }
    }
  );

  if (loading) {
    return (
      <LoadingContainer className="bg-black">
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Spinner size="large" color="#fff" />
        <LoadingText className="text-white text-xl text-center">Discovering extraordinary events...</LoadingText>
      </LoadingContainer>
    );
  }

  // For hero image (use the first event with an image or fallback)
  const heroEvent = events.find(event => event.coverImageUrl) || events[0];
  const heroImageUrl = heroEvent?.coverImageUrl || DEFAULT_IMAGE_URL;

  return (
    <MainContainer>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Fixed Header with Sign In / Register */}
      <Animated.View style={{
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 99,
        backgroundColor: 'rgba(0,0,0,0.85)',
        opacity: headerOpacity,
        paddingTop: STATUS_BAR_HEIGHT + 10,
        paddingBottom: 15,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Text 
          style={{ 
            color: 'white', 
            fontSize: 32, 
            fontWeight: 'bold', 
            fontFamily: 'System',
            letterSpacing: -1,
            textAlign: 'center'
          }}
        >
          KALEIDOPLAN
        </Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ 
              paddingVertical: 10, 
              paddingHorizontal: 18, 
              marginLeft: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
              borderRadius: 24
            }}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ 
              color: 'white', 
              fontSize: 16, 
              fontWeight: '600',
              textAlign: 'center' 
            }}>
              Sign In
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ 
              paddingVertical: 10, 
              paddingHorizontal: 18, 
              marginLeft: 10,
              backgroundColor: 'white',
              borderRadius: 24
            }}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={{ 
              color: 'black', 
              fontSize: 16, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      {/* Hero Section with Parallax */}
      <HeroSection>
        <HeroBackground />
        <Animated.View 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: HERO_HEIGHT,
            transform: [
              { translateY: heroTranslateY },
              { scale: heroScale }
            ],
            opacity: heroOpacity
          }}
        >
          <HeroImage 
            source={{ uri: heroImageUrl }}
            resizeMode="cover"
            onError={() => console.log("Hero image failed to load")}
          />
          <HeroGradient 
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </Animated.View>
        
        <HeroContent style={{ paddingTop: STATUS_BAR_HEIGHT + 60 }}>
          <Animated.Text 
            style={{ 
              color: 'white', 
              fontSize: 64, 
              fontWeight: '800',
              marginBottom: 16,
              textAlign: 'center',
              fontFamily: 'System',
              letterSpacing: -1.5,
              opacity: heroTitleOpacity,
              transform: [{ translateY: heroTitleTranslateY }],
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 5,
            }}
          >
            Extraordinary Events
          </Animated.Text>
          <Text 
            style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: 24, 
              marginBottom: 32,
              textAlign: 'center',
              letterSpacing: 0.5,
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            Discover and join amazing experiences
          </Text>
          
          <TouchableOpacity 
            style={{
              backgroundColor: 'white',
              paddingVertical: 16,
              paddingHorizontal: 32,
              borderRadius: 30,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5
            }}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ 
              color: 'black', 
              fontWeight: 'bold', 
              fontSize: 18,
              letterSpacing: 0.5,
              textAlign: 'center'
            }}>
              Explore Events
            </Text>
          </TouchableOpacity>
        </HeroContent>
      </HeroSection>
      
      {/* Main Content */}
      <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={handleScroll}
      contentContainerStyle={{ paddingBottom: 20 }} // Reduced padding as footer is now inside
      style={{
        transform: [{ translateY: contentTranslateY }]
      }}
    >
        <ContentSection>
        <ContentTitle style={{ fontFamily: 'System', letterSpacing: -1, fontSize: 42 }}>
          Upcoming Events
        </ContentTitle>
        <ContentSubtitle style={{ fontSize: 20 }}>
          Join us for these exciting experiences
        </ContentSubtitle>
        
        {/* Category Tabs */}
        <CategoryScroll 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20, paddingLeft: 10 }}
        >
          {categories.map(category => (
            <CategoryTab 
              key={category.id}
              className={`${selectedCategory === category.id ? 'border-white bg-white' : 'border-gray-600 bg-gray-800'}`}
              onPress={() => setSelectedCategory(category.id)}
            >
              <CategoryTabText 
                style={{ fontFamily: 'System', fontSize: 18 }}
                className={`${selectedCategory === category.id ? 'text-black' : 'text-white'}`}
              >
                {category.name}
              </CategoryTabText>
            </CategoryTab>
          ))}
        </CategoryScroll>
        
        {filteredEvents.length === 0 ? (
          <EmptyContainer className="py-12">
            <EmptyText className="text-white text-2xl mb-4 text-center" style={{ fontFamily: 'System', letterSpacing: -0.5, fontSize: 24 }}>
              No events found
            </EmptyText>
            <Text className="text-gray-400 text-center text-lg" style={{ fontSize: 18 }}>
              {selectedCategory !== 'all' 
                ? `There are no ${selectedCategory} events available`
                : 'Check back soon for upcoming events'}
            </Text>
          </EmptyContainer>
        ) : (
            filteredEvents.map((event, index) => {
              const statusColor = getStatusColor(event.status || 'upcoming');
              const eventId = event.id || `event-${index}`;
              const hasImageError = imageLoadErrors[eventId];
              const shouldShowImage = event.coverImageUrl && !hasImageError;
              
              // Get animation values for this specific card
              const { translateY, opacity, scale, rotate } = getAnimatedValues(index);
              // Use event theme color or fallback
              const themeColor = event.themeColor || '#3B82F6'; // Default blue if no color provided
              
              return (
                <Animated.View
                  key={eventId}
                  style={{
                    transform: [
                      { translateY },
                      { scale },
                      { rotate: rotate.interpolate({
                        inputRange: [-5, 0],
                        outputRange: ['-5deg', '0deg']
                      })}
                    ],
                    opacity,
                    marginBottom: 80,
                  }}
                >
                  <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                    >
                    <EventImageContainer style={{
                      borderRadius: 24,
                      shadowColor: themeColor,
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.3,
                      shadowRadius: 15,
                      elevation: 10
                    }}>
                      {shouldShowImage ? (
                        <EventCardImage 
                          source={{ uri: event.coverImageUrl }} 
                          resizeMode="cover"
                          onError={() => handleImageError(eventId)}
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center bg-gray-800">
                          <Text 
                            className="text-9xl font-black text-white/10" 
                            style={{ fontFamily: 'System', letterSpacing: -2, textAlign: 'center' }}
                          >
                            {event.name?.charAt(0).toUpperCase() || "E"}
                          </Text>
                        </View>
                      )}
                    </EventImageContainer>
                    
                    <EventCardDetails style={{ transform: [{ translateY: translateY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0, 30]
                  }) }] }}>
                    <EventCardTitle style={{ 
                      fontFamily: 'System', 
                      letterSpacing: -0.5, 
                      textAlign: 'center',
                      fontSize: 32, // Increased from 3xl
                      textShadowColor: 'rgba(0,0,0,0.3)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2
                    }}>
                      {event.name || "Event Name"}
                    </EventCardTitle>
                    
                    <EventCardMeta style={{ transform: [{ translateY: translateY.interpolate({
                      inputRange: [0, 100],
                      outputRange: [0, 45]
                    }) }] }}>
                      <Ionicons name="calendar-outline" size={28} color="#A3A3A3" />
                      <EventCardMetaText style={{ textAlign: 'center', fontSize: 20 }}>
                        {formatEventDate(event.startDate)}
                      </EventCardMetaText>
                    </EventCardMeta>
                      
                      <EventCardMeta style={{ transform: [{ translateY: translateY.interpolate({
                        inputRange: [0, 100],
                        outputRange: [0, 50]
                      }) }] }}>
                        <Ionicons name="location-outline" size={26} color="#A3A3A3" />
                        <EventCardMetaText style={{ textAlign: 'center' }}>
                          {event.location || "Location unavailable"}
                        </EventCardMetaText>
                      </EventCardMeta>
                      
                      <EventCardStatus style={{ transform: [{ translateY: translateY.interpolate({
                        inputRange: [0, 100],
                        outputRange: [0, 55]
                      }) }] }}>
                        <EventCardStatusDot className={statusColor.dot} />
                        <EventCardStatusText className={statusColor.text} style={{ textAlign: 'center' }}>
                          {(event.status || "UPCOMING").toUpperCase()}
                        </EventCardStatusText>
                      </EventCardStatus>
                    </EventCardDetails>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}

      {/* Footer - now placed inside the ScrollView so it appears at the end */}
      <Footer style={{
          marginTop: 20,
          borderTopWidth: 1,
          borderTopColor: '#333',
        }}>
          <FooterText style={{ fontWeight: '600', fontSize: 15 }}>
            © 2025 Kaleidoplan. All rights reserved.
          </FooterText>
          <FooterText style={{ fontSize: 14 }}>
            Business Info: Kaleidoplan Inc., 123 Event St., City, Country
          </FooterText>
          <FooterText style={{ fontSize: 14 }}>
            Contact: info@kaleidoplan.com | +123 456 7890
          </FooterText>
        </Footer>
      </ContentSection>
    </Animated.ScrollView>
  </MainContainer>
  );
};

export default GuestScreen;