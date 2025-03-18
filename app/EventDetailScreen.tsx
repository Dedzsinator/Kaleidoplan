import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { getEventById } from '../services/eventService';
import {
  Container,
  LoadingContainer,
  Spinner,
  LoadingText,
  Title,
  BodyText,
  Badge,
  BadgeText,
  CoverImage,
  PlaceholderCover,
  PlaceholderText,
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
  CompletedBadgeText
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



const EventDetailScreen = ({ route, navigation } : {route : any, navigation : any}) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (date: Date | string) => {
    const eventDate = typeof date === 'string' ? new Date(date) : date;
    return format(eventDate, 'yyyy. MMMM d. HH:mm');
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
      <ScrollView className="flex-1">
        {event.coverImageUrl ? (
          <CoverImage source={{ uri: event.coverImageUrl }} resizeMode="cover" />
        ) : (
          <PlaceholderCover>
            <EventDetailPlaceholderText>{event.name.substring(0, 1)}</EventDetailPlaceholderText>
          </PlaceholderCover>
        )}

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
              <CompletedBadge>
                <CompletedBadgeText>Completed</CompletedBadgeText>
              </CompletedBadge>
            )}
          </EventHeaderRow>

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
            <DescriptionText>{event.description}</DescriptionText>
          </DescriptionContainer>

          <LoginPrompt onPress={() => navigation.navigate('Login')}>
            <Ionicons name="log-in-outline" size={24} color="#0a7ea4" />
            <LoginPromptText>
              Log in as an organizer to view event details
            </LoginPromptText>
          </LoginPrompt>
        </ContentContainer>
      </ScrollView>
    </Container>
  );
};

export default EventDetailScreen;