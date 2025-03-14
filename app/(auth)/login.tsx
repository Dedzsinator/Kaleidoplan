import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { loginUser } from '@/services/firebase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hiba', 'Kérjük, töltsd ki az összes mezőt');
      return;
    }
    
    setLoading(true);
    try {
      await loginUser(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Hiba', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Image 
        source={require('@/assets/images/logo.png')} 
        style={styles.logo}
      />
      
      <ThemedText type="title" style={styles.title}>KaleidoPlan</ThemedText>
      <ThemedText style={styles.subtitle}>Rendezvénykezelő Rendszer</ThemedText>
      
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
      
      <TouchableOpacity 
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        <ThemedText style={styles.loginButtonText}>
          {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
        </ThemedText>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <ThemedText type="link" style={styles.registerLink}>
          Nincs még fiókod? Regisztrálj
        </ThemedText>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.push('/(tabs)')}>
        <ThemedText style={styles.guestLink}>
          Tovább vendégként
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 40,
    opacity: 0.7,
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
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 24,
  },
  guestLink: {
    marginTop: 12,
    opacity: 0.7,
  },
});