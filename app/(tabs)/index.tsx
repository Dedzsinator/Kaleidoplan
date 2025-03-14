import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import { getEvents } from '@/services/dbService';

interface Event {
  eventId: number;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  coverImageUrl?: string;
  creatorName: string;
}

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const eventsData = await getEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return `${format(start, 'yyyy. MMMM d.')} ${format(start, 'HH:mm')}-${format(end, 'HH:mm')}`;
    } else {
      return `${format(start, 'yyyy. MMMM d. HH:mm')} - ${format(end, 'yyyy. MMMM d. HH:mm')}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return '#4CAF50';
      case 'ongoing': return '#2196F3';
      case 'completed': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>KaleidoPlan</ThemedText>
      <ThemedText style={styles.subtitle}>Következő rendezvények</ThemedText>
      
      {events.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText>Nincsenek elérhető rendezvények</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.eventId.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.eventCard}
              onPress={() => router.push(`/event/${item.eventId}`)}
            >
              <Image
                source={{ uri: item.coverImageUrl || 'https://via.placeholder.com/400x200?text=No+Image' }}
                style={styles.eventImage}
              />
              <View style={styles.statusBadge}>
                <ThemedText style={{...styles.statusText, color: getStatusColor(item.status)}}>
                  {item.status === 'upcoming' ? 'Közelgő' : 
                   item.status === 'ongoing' ? 'Folyamatban' : 'Lezárult'}
                </ThemedText>
              </View>
              <ThemedView style={styles.eventContent}>
                <ThemedText type="defaultSemiBold" style={styles.eventName}>{item.name}</ThemedText>
                <ThemedText style={styles.eventDate}>{formatEventDate(item.startDate, item.endDate)}</ThemedText>
                <ThemedText style={styles.eventLocation}>{item.location}</ThemedText>
                <ThemedText numberOfLines={2} style={styles.eventDescription}>{item.description}</ThemedText>
                <ThemedText style={styles.creatorName}>Szervező: {item.creatorName}</ThemedText>
              </ThemedView>
            </TouchableOpacity>
          )}
        />
      )}
      
      {isAdmin && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/admin/events/create')}
        >
          <ThemedText style={styles.addButtonText}>+ Új rendezvény</ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
    opacity: 0.8,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventContent: {
    padding: 16,
  },
  eventName: {
    fontSize: 18,
    marginBottom: 8,
  },
  eventDate: {
    color: '#0a7ea4',
    marginBottom: 4,
  },
  eventLocation: {
    color: '#666',
    marginBottom: 8,
  },
  eventDescription: {
    color: '#444',
    marginBottom: 8,
  },
  creatorName: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginTop: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#0a7ea4',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});