import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import { getEventById } from '@/services/dbService';

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
  createdBy: string;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isAdmin = user?.role === 'admin';
  const isCreator = user && event?.createdBy === user.id;
  const canEdit = isAdmin || isCreator;

  useEffect(() => {
    if (id) {
      loadEvent(parseInt(id));
    }
  }, [id]);

  const loadEvent = async (eventId: number) => {
    try {
      const eventData = await getEventById(eventId);
      setEvent(eventData);
    } catch (error) {
      console.error("Error fetching event:", error);
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

  if (!event) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText>A rendezvény nem található</ThemedText>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText type="link">Vissza a főoldalra</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ScrollView>
      <Image
        source={{ uri: event.coverImageUrl || 'https://via.placeholder.com/800x400?text=No+Image' }}
        style={styles.coverImage}
      />
      
      <ThemedView style={styles.statusContainer}>
        <ThemedText style={{...styles.statusText, color: getStatusColor(event.status)}}>
          {event.status === 'upcoming' ? 'Közelgő' : 
           event.status === 'ongoing' ? 'Folyamatban' : 'Lezárult'}
        </ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.contentContainer}>
        <ThemedText type="title" style={styles.title}>{event.name}</ThemedText>
        
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Időpont:</ThemedText>
          <ThemedText style={styles.infoValue}>
            {formatEventDate(event.startDate, event.endDate)}
          </ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Helyszín:</ThemedText>
          <ThemedText style={styles.infoValue}>{event.location}</ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Szervező:</ThemedText>
          <ThemedText style={styles.infoValue}>{event.creatorName}</ThemedText>
        </ThemedView>
        
        <ThemedText style={styles.sectionTitle}>Leírás</ThemedText>
        <ThemedText style={styles.description}>{event.description}</ThemedText>

        {canEdit && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push(`/admin/events/edit/${event.eventId}`)}
          >
            <ThemedText style={styles.editButtonText}>Szerkesztés</ThemedText>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.backButtonText}>Vissza</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: 250,
  },
  statusContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 80,
    fontWeight: 'bold',
    color: '#666',
  },
  infoValue: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  description: {
    lineHeight: 24,
  },
  editButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 32,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  backButtonText: {
    fontWeight: 'bold',
  },
});