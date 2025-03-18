import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { getEvents } from '../services/eventService';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import {
  Container,
  HeaderTitle,
  HeaderSubtitle,
  Title,
  BodyText,
  CaptionText,
  PrimaryButton,
  PrimaryButtonText,
  SecondaryButton,
  SecondaryButtonText,
  LoadingContainer,
  Spinner,
  LoadingText,
  Badge,
  BadgeText,Header,EventCard,EventImage,PlaceholderImage,PlaceholderText,EventContent,EventTitle,EventDate,EventLocation,UpcomingBadge,OngoingBadge,CompletedBadge,ListContainer,EmptyContainer,EmptyText,FooterContainer
} from '../components/ui/theme';

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
}

const GuestScreen = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsData = await getEvents();
        setEvents(eventsData);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatEventDate = (date: Date | string) => {
    const eventDate = typeof date === 'string' ? new Date(date) : date;
    return format(eventDate, 'MMM d, yyyy');
  };

  const renderEventItem = ({ item }: { item: Event }) => (
    <EventCard onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}>
      {item.coverImageUrl ? (
        <EventImage source={{ uri: item.coverImageUrl }} resizeMode="cover" />
      ) : (
        <PlaceholderImage>
          <PlaceholderText>{item.name.substring(0, 1)}</PlaceholderText>
        </PlaceholderImage>
      )}
      
      <EventContent>
        <EventTitle>{item.name}</EventTitle>
        <EventDate>
          <Ionicons name="calendar-outline" size={14} color="#666" />{' '}
          {formatEventDate(item.startDate)} - {formatEventDate(item.endDate)}
        </EventDate>
        <EventLocation>
          <Ionicons name="location-outline" size={14} color="#666" />{' '}
          {item.location}
        </EventLocation>
        
        {item.status === 'upcoming' ? (
          <UpcomingBadge>
            <BadgeText className="text-blue-700">Upcoming</BadgeText>
          </UpcomingBadge>
        ) : item.status === 'ongoing' ? (
          <OngoingBadge>
            <BadgeText className="text-green-700">Ongoing</BadgeText>
          </OngoingBadge>
        ) : (
          <CompletedBadge>
            <BadgeText className="text-gray-700">Completed</BadgeText>
          </CompletedBadge>
        )}
      </EventContent>
    </EventCard>
  );

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="large" color="#0a7ea4" />
        <LoadingText>Loading events...</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTitle>Events</HeaderTitle>
        <HeaderSubtitle>Browse available events</HeaderSubtitle>
      </Header>
      
      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyContainer>
            <EmptyText>No events available at this time</EmptyText>
          </EmptyContainer>
        }
      />
      
      <FooterContainer>
        <PrimaryButton 
          className="flex-1 mr-2"
          onPress={() => navigation.navigate('Login')}
        >
          <PrimaryButtonText>Login</PrimaryButtonText>
        </PrimaryButton>
        
        <SecondaryButton 
          className="flex-1 ml-2"
          onPress={() => navigation.navigate('Register')}
        >
          <SecondaryButtonText>Register as Organizer</SecondaryButtonText>
        </SecondaryButton>
      </FooterContainer>
    </Container>
  );
};

export default GuestScreen;