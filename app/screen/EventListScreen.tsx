import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Animated, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
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
  FloatingButton,
  PrimaryGradient,
  UpcomingBadgeText,
  OngoingBadgeText,
  CompletedBadgeText,
  HeaderGradient,
  PlaceholderGradient
} from '../components/ui/theme';
import { BlurView } from 'expo-blur';

// Define Event type
interface Event {
  id: string;
  name: string;
  description: string;
  location: string;
  startDate: Date | string;
  endDate: Date | string;
  status: 'upcoming' | 'ongoing' | 'completed';
  coverImageUrl?: string;
  creatorName: string;
  createdBy: string;
  organizers: string[];
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const EventListScreen = ({ navigation }: {navigation : any}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const { user } = useAuth();
  const scrollY = new Animated.Value(0);

  const fetchEvents = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const eventsData = await getEvents();
      setEvents(eventsData);
      
      if (filter === 'all') {
        setFilteredEvents(eventsData);
      } else {
        setFilteredEvents(eventsData.filter(event => event.status === filter));
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
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

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderEventItem = ({ item, index }: { item: Event, index: number }) => (
    <EventCard 
      onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
      style={[
        styles.eventCard,
        { transform: [{ scale: 1 }] },
        index % 2 === 0 ? { marginRight: 8 } : { marginLeft: 8 }
      ]}
    >
      {item.coverImageUrl ? (
        <EventImage 
          source={{ uri: item.coverImageUrl }} 
          resizeMode="cover" 
          style={styles.eventImage}
        />
      ) : (
        <PlaceholderGradient style={styles.eventImage}>
          <PlaceholderText>{item.name.substring(0, 1)}</PlaceholderText>
        </PlaceholderGradient>
      )}
      
      <BlurView intensity={80} tint="light" style={styles.dateBlur}>
        <Text style={styles.dateText}>
          {formatEventDate(item.startDate)}
        </Text>
      </BlurView>
      
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
            <UpcomingBadgeText>Upcoming</UpcomingBadgeText>
          </UpcomingBadge>
        ) : item.status === 'ongoing' ? (
          <OngoingBadge>
            <OngoingBadgeText>Ongoing</OngoingBadgeText>
          </OngoingBadge>
        ) : (
          <CompletedBadge>
            <CompletedBadgeText>Completed</CompletedBadgeText>
          </CompletedBadge>
        )}
      </EventContent>
    </EventCard>
  );

  if (loading && !refreshing) {
    return (
      <LoadingContainer>
        <Spinner size="large" color="#0a7ea4" />
        <LoadingText>Loading events...</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <HeaderGradient style={styles.headerContainer}>
        <HeaderTitle>{isAdmin ? 'All Events' : 'My Events'}</HeaderTitle>
        <HeaderSubtitle>
          {isAdmin 
            ? 'Manage all events in the system' 
            : 'Events where you are an organizer'}
        </HeaderSubtitle>
      </HeaderGradient>
      
      <Animated.View 
        style={[
          styles.headerScrollOverlay, 
          { opacity: headerOpacity }
        ]}
      >
        <BlurView intensity={80} tint="light" style={styles.blurContainer}>
          <Text style={styles.headerScrollText}>
            {isAdmin ? 'All Events' : 'My Events'}
          </Text>
        </BlurView>
      </Animated.View>
      
      <FilterContainer>
        <TouchableOpacity
          onPress={() => setFilter('all')}
          style={[
            styles.filterButton,
            filter === 'all' ? styles.activeFilterButton : null
          ]}
        >
          <Text style={filter === 'all' ? styles.activeFilterText : styles.filterText}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setFilter('upcoming')}
          style={[
            styles.filterButton,
            filter === 'upcoming' ? styles.activeFilterButton : null
          ]}
        >
          <Text style={filter === 'upcoming' ? styles.activeFilterText : styles.filterText}>
            Upcoming
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setFilter('ongoing')}
          style={[
            styles.filterButton,
            filter === 'ongoing' ? styles.activeFilterButton : null
          ]}
        >
          <Text style={filter === 'ongoing' ? styles.activeFilterText : styles.filterText}>
            Ongoing
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setFilter('completed')}
          style={[
            styles.filterButton,
            filter === 'completed' ? styles.activeFilterButton : null
          ]}
        >
          <Text style={filter === 'completed' ? styles.activeFilterText : styles.filterText}>
            Completed
          </Text>
        </TouchableOpacity>
      </FilterContainer>
      
      <AnimatedFlatList
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => fetchEvents(true)}
            colors={['#0a7ea4']}
            tintColor="#0a7ea4"
          />
        }
        ListEmptyComponent={
          <EmptyContainer>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No events found matching the selected filter</Text>
          </EmptyContainer>
        }
      />
      
      {isAdmin && (
        <FloatingButton 
          onPress={() => navigation.navigate('TaskDetail', { isNewTask: true })}
          style={styles.floatingButton}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </FloatingButton>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
  },
  headerScrollOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    paddingTop: 40,
    paddingBottom: 10,
  },
  blurContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  headerScrollText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  listContainer: {
    padding: 8,
    paddingBottom: 100,
  },
  eventCard: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
    height: 130,
    width: '100%',
  },
  dateBlur: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e5',
    backgroundColor: '#fff',
  },
  activeFilterButton: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  filterText: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '600',
  },
  activeFilterText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  floatingButton: {
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 240,
  }
});

export default EventListScreen;