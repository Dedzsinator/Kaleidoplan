import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/app/firebase';

interface Event {
  id: string;
  name: string;
  description: string;
  location: string;
  date: string;
  imageUrl?: string;
}

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const eventsCollection = collection(db, 'events');
      const eventsQuery = query(eventsCollection, orderBy('date', 'asc'));
      const querySnapshot = await getDocs(eventsQuery);
      
      const fetchedEvents: Event[] = [];
      querySnapshot.forEach((doc) => {
        fetchedEvents.push({
          id: doc.id,
          ...doc.data() as Omit<Event, 'id'>
        });
      });
      
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderEventItem = ({ item }: { item: Event }) => (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={() => router.push(`/events/${item.id}`)}
    >
      <Image 
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/400x200?text=No+Image' }}
        style={styles.eventImage}
        resizeMode="cover"
      />
      <ThemedView style={styles.eventInfo}>
        <ThemedText type="defaultSemiBold" style={styles.eventTitle}>
          {item.name}
        </ThemedText>
        <ThemedText style={styles.eventDate}>{item.date}</ThemedText>
        <ThemedText style={styles.eventLocation}>{item.location}</ThemedText>
        <ThemedText numberOfLines={2} style={styles.eventDescription}>
          {item.description}
        </ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Rendezvények</ThemedText>
      
      {isAdmin && (
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/admin/events/create')}
        >
          <ThemedText style={styles.buttonText}>
            + Új rendezvény létrehozása
          </ThemedText>
        </TouchableOpacity>
      )}
      
      {events.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText>Nincsenek elérhető rendezvények</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
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
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    marginBottom: 6,
  },
  eventDate: {
    fontSize: 14,
    color: '#0a7ea4',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#444',
  },
  addButton: {
    backgroundColor: '#0a7ea4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});