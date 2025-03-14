import React, { useState } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Image,
  Platform,
  View
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import { createEvent, uploadEventImage } from '@/services/dbService';

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().getTime() + 2 * 60 * 60 * 1000)); // +2 hours
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  if (!user) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText>Jelentkezz be a rendezvény létrehozásához</ThemedText>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <ThemedText type="link">Bejelentkezés</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }
  
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Hiba', 'A képválasztáshoz engedélyre van szükség!');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  
  const handleCreateEvent = async () => {
    if (!name || !description || !location) {
      Alert.alert('Hiba', 'Kérjük, töltsd ki az összes kötelező mezőt');
      return;
    }
    
    if (startDate >= endDate) {
      Alert.alert('Hiba', 'A befejezés időpontja nem lehet a kezdés előtt');
      return;
    }
    
    setLoading(true);
    
    try {
      let coverImageUrl = null;
      
      if (image) {
        coverImageUrl = await uploadEventImage(image);
      }
      
      const eventId = await createEvent(
        name,
        description,
        location,
        startDate,
        endDate,
        coverImageUrl,
        user.id
      );
      
      Alert.alert(
        'Sikeres mentés',
        'A rendezvény sikeresen létrehozva',
        [{ text: 'OK', onPress: () => router.push(`/event/${eventId}`) }]
      );
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Hiba', 'Nem sikerült létrehozni a rendezvényt');
    } finally {
      setLoading(false);
    }
  };
  
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      
      // If end date is earlier than new start date, adjust it
      if (endDate <= selectedDate) {
        setEndDate(new Date(selectedDate.getTime() + 2 * 60 * 60 * 1000)); // +2 hours
      }
    }
  };
  
  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Új rendezvény létrehozása</ThemedText>
        
        <ThemedText style={styles.label}>Rendezvény neve *</ThemedText>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Írd be a rendezvény nevét"
        />
        
        <ThemedText style={styles.label}>Helyszín *</ThemedText>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Írd be a rendezvény helyszínét"
        />
        
        <ThemedView style={styles.dateRow}>
          <ThemedView style={styles.dateContainer}>
            <ThemedText style={styles.label}>Kezdés időpontja *</ThemedText>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <ThemedText>{format(startDate, 'yyyy. MM. dd. HH:mm')}</ThemedText>
            </TouchableOpacity>
            
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="datetime"
                display="default"
                onChange={onStartDateChange}
              />
            )}
          </ThemedView>
          
          <ThemedView style={styles.dateContainer}>
            <ThemedText style={styles.label}>Befejezés időpontja *</ThemedText>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <ThemedText>{format(endDate, 'yyyy. MM. dd. HH:mm')}</ThemedText>
            </TouchableOpacity>
            
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="datetime"
                display="default"
                onChange={onEndDateChange}
                minimumDate={startDate}
              />
            )}
          </ThemedView>
        </ThemedView>
        
        <ThemedText style={styles.label}>Leírás *</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Írd le a rendezvény részleteit"
          multiline={true}
          numberOfLines={6}
          textAlignVertical="top"
        />
        
        <ThemedText style={styles.label}>Borítókép</ThemedText>
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ThemedText>Kattints a kép feltöltéséhez</ThemedText>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleCreateEvent}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Mentés</ThemedText>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <ThemedText>Mégse</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateContainer: {
    width: '48%',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#fff',
  },
  imagePickerButton: {
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 4,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  saveButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
});