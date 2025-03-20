import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Share, Dimensions } from 'react-native';
import { format, formatDistance } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { getEventById } from '../services/eventService';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Container,
  LoadingContainer,
  Spinner,
  LoadingText,
  CoverImage,
  PlaceholderCover,
  HeaderOverlay,
  BackButton,
  ContentContainer,
  EventHeaderRow,
  EventDetailEventTitle,
  DetailsContainer,
  DetailRow,
  DetailText,
  DescriptionContainer,
  SectionTitle,
  DescriptionText,
  LoginPrompt,
  LoginPromptText,
  ErrorContainer,
  ErrorText,
  BackText,
  UpcomingBadge,
  EventDetailPlaceholderText,
  UpcomingBadgeText,
  OngoingBadge,
  OngoingBadgeText,
  CompletedBadge,
  CompletedBadgeText,
  GradientOverlay,
  EventImageOverlay,
  EventDateBadge,
  EventDateText,
  EventCardFooter,
  OrganizerAvatar,
  OrganizerName,
  ExpandableDescription,
  ReadMoreText,
  EventStats,
  StatItem,
  StatValue,
  StatLabel,
  EventTabs,
  EventTab,
  EventTabText,
  EventTabActive,
  ShareButton
} from '../components/ui/theme';
import Map from '../components/Map.web';
import * as Location from 'expo-location';
import { Linking, Alert } from 'react-native';

// Define Event type
interface Event {
  id: string;
  name: string;
  description: string;
  location: string;
  startDate: string | Date;
  endDate: string | Date;
  status: 'upcoming' | 'ongoing' | 'completed';
  coverImageUrl?: string;
  creatorName: string;
  organizers?: string[];
}

const EventDetailScreen = ({ route, navigation } : {route : any, navigation : any}) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandDescription, setExpandDescription] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [mapRegion, setMapRegion] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const { user } = useAuth();
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventData = await getEventById(eventId);
        setEvent(eventData);
      } catch (error) {
        console.error("Error fetching event details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  // Check if user has already expressed interest
  useEffect(() => {
    const checkUserInterest = async () => {
      if (!user || !event) return;
      
      try {
        const response = await fetch(`/api/events/${eventId}/check-interest?userId=${user.id}`);
        const data = await response.json();
        setIsInterested(data.isInterested);
      } catch (error) {
        console.error('Error checking user interest:', error);
      }
    };
    
    checkUserInterest();
  }, [user, event, eventId]);

  useEffect(() => {
    const getLocation = async () => {
      if (event?.location) {
        try {
          // Request permission first
          const { status } = await Location.requestForegroundPermissionsAsync();
          setLocationPermission(status === 'granted');
          
          // Geocode the address to get coordinates
          const geocodeResult = await Location.geocodeAsync(event.location);
          
          if (geocodeResult.length > 0) {
            setMapRegion({
              latitude: geocodeResult[0].latitude,
              longitude: geocodeResult[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        } catch (error) {
          console.error('Error getting location:', error);
        }
      }
    };
    
    getLocation();
  }, [event]);

  const handleRemindToggle = async () => {
    if (!user) {
      navigation.navigate('Login', { 
        redirectAfter: 'EventDetail',
        redirectParams: { eventId }
      });
      return;
    }
    
    setIsSubmittingInterest(true);
    
    try {
      if (isInterested) {
        // Remove interest using your API
        await fetch(`/api/events/${eventId}/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: user.id })
        });
        
        setIsInterested(false);
      } else {
        // Add interest with reminder preferences
        await fetch(`/api/events/${eventId}/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            userId: user.id,
            userName: user.displayName,
            userEmail: user.email,
            reminderFrequency: 'weekly' // Default to weekly
          })
        });
        
        setIsInterested(true);
      }
    } catch (error) {
      console.error('Error updating interest:', error);
      Alert.alert('Error', 'Failed to update your reminder preference');
    } finally {
      setIsSubmittingInterest(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const eventDate = typeof date === 'string' ? new Date(date) : date;
    return format(eventDate, 'MMM d, yyyy • h:mm a');
  };
  
  const formatDateShort = (date: Date | string) => {
    const eventDate = typeof date === 'string' ? new Date(date) : date;
    return format(eventDate, 'MMM d');
  };
  
  const getRelativeTimeToEvent = (startDate: Date | string) => {
    const eventDate = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const now = new Date();
    
    if (eventDate > now) {
      return `Starts ${formatDistance(eventDate, now, { addSuffix: true })}`;
    } else {
      return `Started ${formatDistance(eventDate, now, { addSuffix: true })}`;
    }
  };
  
  const handleShare = async () => {
    if (!event) return;
    
    try {
      await Share.share({
        message: `Check out this event: ${event.name} at ${event.location} on ${formatDate(event.startDate)}!`,
        title: event.name
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };
  
  const getDescriptionPreview = (description: string) => {
    if (description.length > 150 && !expandDescription) {
      return description.substring(0, 150) + '...';
    }
    return description;
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="large" color="#0a7ea4" />
        <LoadingText>Loading event details...</LoadingText>
      </LoadingContainer>
    );
  }

  if (!event) {
    return (
      <Container>
        <HeaderOverlay>
          <BackButton onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </BackButton>
          <Text className="text-lg font-bold text-white ml-4">Error</Text>
        </HeaderOverlay>
        
        <ErrorContainer>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <ErrorText>Event not found</ErrorText>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <BackText>Back to events</BackText>
          </TouchableOpacity>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="relative">
          {event.coverImageUrl ? (
            <>
              <CoverImage source={{ uri: event.coverImageUrl }} resizeMode="cover" />
              <GradientOverlay
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
                locations={[0, 1]}
              />
            </>
          ) : (
            <PlaceholderCover>
              <EventDetailPlaceholderText>{event.name.substring(0, 1)}</EventDetailPlaceholderText>
            </PlaceholderCover>
          )}

          <EventImageOverlay>
            <Text className="text-xl font-bold text-white">{event.name}</Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="location-outline" size={16} color="#fff" />
              <Text className="text-sm text-white ml-1">{event.location}</Text>
            </View>
          </EventImageOverlay>

          <EventDateBadge>
            <EventDateText>
              {formatDateShort(event.startDate)} 
              {format(new Date(event.startDate), 'yyyy') !== format(new Date(event.endDate), 'yyyy') || 
               format(new Date(event.startDate), 'MMM') !== format(new Date(event.endDate), 'MMM') || 
               format(new Date(event.startDate), 'd') !== format(new Date(event.endDate), 'd') 
                ? ` - ${formatDateShort(event.endDate)}` : ''}
            </EventDateText>
          </EventDateBadge>
          
          <ShareButton onPress={handleShare}>
            <Ionicons name="share-social" size={20} color="#0a7ea4" />
          </ShareButton>
        </View>

        <HeaderOverlay>
          <BackButton onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </BackButton>
        </HeaderOverlay>

        <ContentContainer>
          <EventHeaderRow>
            <EventDetailEventTitle>{event.name}</EventDetailEventTitle>
            
            {event.status === 'upcoming' ? (
              <UpcomingBadge>
                <UpcomingBadgeText>Upcoming</UpcomingBadgeText>
              </UpcomingBadge>
            ) : event.status === 'ongoing' ? (
              <OngoingBadge>
                <OngoingBadgeText>Ongoing</OngoingBadgeText>
              </OngoingBadge>
            ) : (
              <CompletedBadgez>
                <CompletedBadgeText>Completed</CompletedBadgeText>
              </CompletedBadgez>
            )}
          </EventHeaderRow>
          
          <EventStats>
            <StatItem>
              <StatValue>{event.organizers?.length || 1}</StatValue>
              <StatLabel>Organizers</StatLabel>
            </StatItem>
            <View className="h-10 w-px bg-gray-200" />
            <StatItem>
              <StatValue>{getRelativeTimeToEvent(event.startDate).includes('ago') ? '✓' : '⏱'}</StatValue>
              <StatLabel>{getRelativeTimeToEvent(event.startDate)}</StatLabel>
            </StatItem>
            <View className="h-10 w-px bg-gray-200" />
            <StatItem>
              <StatValue>
                {Math.ceil((new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / (1000 * 60 * 60 * 24))}
              </StatValue>
              <StatLabel>Days</StatLabel>
            </StatItem>
          </EventStats>
          
          <EventTabs>
            <EventTab 
              onPress={() => setActiveTab('about')}
              style={{ borderBottomWidth: activeTab === 'about' ? 2 : 0, borderBottomColor: '#0a7ea4' }}
            >
              <EventTabText style={{ color: activeTab === 'about' ? '#0a7ea4' : '#6b7280' }}>
                About
              </EventTabText>
            </EventTab>
            <EventTab 
              onPress={() => setActiveTab('schedule')}
              style={{ borderBottomWidth: activeTab === 'schedule' ? 2 : 0, borderBottomColor: '#0a7ea4' }}
            >
              <EventTabText style={{ color: activeTab === 'schedule' ? '#0a7ea4' : '#6b7280' }}>
                Schedule
              </EventTabText>
            </EventTab>
            <EventTab 
              onPress={() => setActiveTab('location')}
              style={{ borderBottomWidth: activeTab === 'location' ? 2 : 0, borderBottomColor: '#0a7ea4' }}
            >
              <EventTabText style={{ color: activeTab === 'location' ? '#0a7ea4' : '#6b7280' }}>
                Location
              </EventTabText>
            </EventTab>
          </EventTabs>

          {activeTab === 'about' && (
            <>
              <DetailsContainer>
                <DetailRow>
                  <Ionicons name="calendar-outline" size={20} color="#0a7ea4" />
                  <DetailText>
                    {formatDate(event.startDate)} - {formatDate(event.endDate)}
                  </DetailText>
                </DetailRow>
                
                <DetailRow>
                  <Ionicons name="location-outline" size={20} color="#0a7ea4" />
                  <DetailText>{event.location}</DetailText>
                </DetailRow>
                
                <DetailRow>
                  <Ionicons name="person-outline" size={20} color="#0a7ea4" />
                  <DetailText>Organizer: {event.creatorName}</DetailText>
                </DetailRow>
              </DetailsContainer>

              <DescriptionContainer>
                <SectionTitle>Description</SectionTitle>
                <DescriptionText>{getDescriptionPreview(event.description)}</DescriptionText>
                
                {event.description.length > 150 && (
                  <ExpandableDescription onPress={() => setExpandDescription(!expandDescription)}>
                    <ReadMoreText>{expandDescription ? 'Show less' : 'Read more'}</ReadMoreText>
                  </ExpandableDescription>
                )}
              </DescriptionContainer>
            </>
          )}
          
          {activeTab === 'schedule' && (
            <View className="py-6">
              <Text className="text-center text-gray-500">Schedule information will be available soon.</Text>
              <View className="items-center mt-4">
                <Ionicons name="calendar" size={48} color="#d1d5db" />
              </View>
            </View>
          )}
          
          {activeTab === 'location' && (
            <View className="py-6">
              {mapRegion ? (
                <View style={{ height: 300, width: '100%', borderRadius: 16, overflow: 'hidden' }}>
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
                />
                
                <Text className="mt-4 text-center text-lg font-medium">
                  {event.location}
                </Text>
                  
                  <Text className="mt-4 text-center text-lg font-medium">
                    {event.location}
                  </Text>
                  
                  <TouchableOpacity 
                    className="mt-3 flex-row items-center justify-center bg-blue-500 py-3 px-4 rounded-full self-center"
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(event.location)}`)}
                  >
                    <Ionicons name="navigate" size={18} color="#ffffff" />
                    <Text className="text-white ml-2 font-medium">Get Directions</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="items-center mt-4">
                  <Ionicons name="location" size={48} color="#d1d5db" />
                  <Text className="text-center text-gray-500 mt-4">
                    {locationPermission ? "Finding location..." : "Location not available"}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!user && (
            <LoginPrompt onPress={() => navigation.navigate('Login')}>
              <Ionicons name="log-in-outline" size={24} color="#0a7ea4" />
              <LoginPromptText>
                Log in as an organizer to view event details
              </LoginPromptText>
            </LoginPrompt>
          )}
          
          <EventCardFooter>
            <View className="flex-row items-center">
              {event.coverImageUrl ? (
                <OrganizerAvatar source={{ uri: event.coverImageUrl }} />
              ) : (
                <View className="w-8 h-8 rounded-full bg-blue-500 justify-center items-center">
                  <Text className="text-xs font-bold text-white">{event.creatorName.charAt(0)}</Text>
                </View>
              )}
              <OrganizerName>Created by {event.creatorName}</OrganizerName>
            </View>
            
            <TouchableOpacity 
              className={`flex-row items-center justify-center py-3 px-5 rounded-full ${
                isInterested ? 'bg-green-500' : 'bg-blue-500'
              }`}
              onPress={handleRemindToggle}
              disabled={isSubmittingInterest}
            >
              <Ionicons 
                name={isInterested ? "notifications" : "notifications-outline"} 
                size={20} 
                color="#ffffff" 
              />
              <Text className="text-white ml-2 font-medium">
                {isSubmittingInterest 
                  ? 'Processing...' 
                  : isInterested 
                    ? 'Remind Me' 
                    : 'I Want to Go'}
              </Text>
            </TouchableOpacity>
          </EventCardFooter>
        </ContentContainer>
      </ScrollView>
    </Container>
  );
};

export default EventDetailScreen;