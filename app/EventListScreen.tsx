import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext.tsx';
import { styled } from 'nativewind';
import { getEvents } from '../services/eventService';
import {
  Container,
  Header,
  HeaderTitle,
  HeaderSubtitle,
  LoadingContainer,
  Spinner,
  LoadingText,
  Badge,
  BadgeText,
  PrimaryButton,
  PrimaryButtonText,
  EventCard,
  EventImage,
  PlaceholderImage,
  PlaceholderText,
  EventContent,
  EventTitle,
  EventDate,
  EventLocation,
  UpcomingBadge,
  OngoingBadge,
  CompletedBadge,
  EmptyContainer,
  EmptyText,
  FilterContainer,
  FilterButton,
  FilterButtonActive,
  FilterText,
  FilterTextActive,
  FloatingButton
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
  organizers: string[];
}

const EventListScreen = ({ navigation }: {navigation : any}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const { user } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsData = await getEvents();
        setEvents(eventsData);
        setFilteredEvents(eventsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching events:", error);
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(event => event.status === filter));
    }
  }, [filter, events]);

  const formatEventDate = (date: Date | string) => {
    const eventDate = typeof date === 'string' ? new Date(date) : date;
    return format(eventDate, 'MMM d, yyyy');
  };

  const isAdmin = user?.role === 'admin';

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
        <HeaderTitle>{isAdmin ? 'All Events' : 'My Events'}</HeaderTitle>
        <HeaderSubtitle>
          {isAdmin 
            ? 'Manage all events in the system' 
            : 'Events where you are an organizer'}
        </HeaderSubtitle>
      </Header>
      
      <FilterContainer>
        <TouchableOpacity
          onPress={() => setFilter('all')}
          className={filter === 'all' ? 'bg-primary rounded-full py-2 px-3 mr-2 border border-primary' : 'py-2 px-3 rounded-full mr-2 border border-gray-300'}
        >
          <Text className={filter === 'all' ? 'text-white text-sm' : 'text-gray-600 text-sm'}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setFilter('upcoming')}
          className={filter === 'upcoming' ? 'bg-primary rounded-full py-2 px-3 mr-2 border border-primary' : 'py-2 px-3 rounded-full mr-2 border border-gray-300'}
        >
          <Text className={filter === 'upcoming' ? 'text-white text-sm' : 'text-gray-600 text-sm'}>Upcoming</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setFilter('ongoing')}
          className={filter === 'ongoing' ? 'bg-primary rounded-full py-2 px-3 mr-2 border border-primary' : 'py-2 px-3 rounded-full mr-2 border border-gray-300'}
        >
          <Text className={filter === 'ongoing' ? 'text-white text-sm' : 'text-gray-600 text-sm'}>Ongoing</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setFilter('completed')}
          className={filter === 'completed' ? 'bg-primary rounded-full py-2 px-3 mr-2 border border-primary' : 'py-2 px-3 rounded-full mr-2 border border-gray-300'}
        >
          <Text className={filter === 'completed' ? 'text-white text-sm' : 'text-gray-600 text-sm'}>Completed</Text>
        </TouchableOpacity>
      </FilterContainer>
      
      <FlatList
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyContainer>
            <EmptyText>No events found matching the selected filter</EmptyText>
          </EmptyContainer>
        }
      />
      
      {isAdmin && (
        <FloatingButton onPress={() => navigation.navigate('TaskDetail', { isNewTask: true })}>
          <Ionicons name="add" size={24} color="#fff" />
        </FloatingButton>
      )}
    </Container>
  );
};

export default EventListScreen;