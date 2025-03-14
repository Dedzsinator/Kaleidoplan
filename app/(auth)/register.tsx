import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { registerUser } from '@/services/firebase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !displayName) {
      Alert.alert('Hiba', 'Kérjük, töltsd ki az összes mezőt');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hiba', 'A jelszavak nem egyeznek');
      return;
    }
    
    setLoading(true);
    try {
      await registerUser(email, password, displayName);
      Alert.alert('Sikeres regisztráció', 'A fiókodat sikeresen létrehoztuk!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      Alert.alert('Hiba', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <ThemedView style={styles.container}>
        <Image 
          source={require('@/assets/images/logo.png')} 
          style={styles.logo}
        />
        
        <ThemedText type="title" style={styles.title}>Regisztráció</ThemedText>
        
        <TextInput
          style={styles.input}
          placeholder="Teljes név"
          value={displayName}
          onChangeText={setDisplayName}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Email cím"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Jelszó"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TextInput
          style={styles.input}
          placeholder="Jelszó megerősítése"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={loading}
        >
          <ThemedText style={styles.registerButtonText}>
            {loading ? 'Regisztráció...' : 'Regisztráció'}
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <ThemedText type="link" style={styles.loginLink}>
            Van már fiókod? Jelentkezz be
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.push('/(tabs)')}>
          <ThemedText style={styles.guestLink}>
            Tovább vendégként
          </ThemedText>
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
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  registerButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 24,
  },
  guestLink: {
    marginTop: 12,
    opacity: 0.7,
  },
});