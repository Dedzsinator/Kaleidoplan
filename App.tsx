import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './app/contexts/AuthContext';
import { MusicPlayerProvider } from './app/contexts/MusicPlayerContext';
import HomeScreen from './app/screen/HomeScreen';
import LoginScreen from './app/screen/LoginScreen';
import RegisterScreen from './app/screen/RegisterScreen';
import GuestScreen from './app/screen/GuestScreen';
import EventDetailScreen from './app/screen/EventDetailScreen';
import AdminPanelScreen from './app/screen/AdminPanelScreen';
import OrganizerTaskScreen from './app/screen/OrganizerTaskScreen';
import EventListScreen from './app/screen/EventListScreen';
import TaskDetailScreen from './app/screen/TaskDetailScreen';
import TaskLogScreen from './app/screen/TaskLogScreen';
import { StatusBar } from 'react-native';
import { initializeServices } from './app/services/serviceInitializer';
import { SplashScreen } from './app/components/ui/SplashScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [initStatus, setInitStatus] = useState('Loading...');

  // Initialize services
  useEffect(() => {
    async function setup() {
      try {
        // Pass status update function to show progress
        await initializeServices(setInitStatus);
        setInitStatus('Ready!');

        // Give a moment to see the "Ready!" message
        setTimeout(() => {
          setIsReady(true);
        }, 500);
      } catch (error) {
        console.error('Error initializing services:', error);
        setInitStatus('Error loading data. Using offline mode.');

        // Still allow app to start after a delay
        setTimeout(() => {
          setIsReady(true);
        }, 2000);
      }
    }

    setup();
  }, []);

  if (!isReady || loading) {
    return <SplashScreen status={initStatus} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      {!user ? (
        // Unauthenticated routes
        <>
          <Stack.Screen name="Guest" component={GuestScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        </>
      ) : (
        // Authenticated routes
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="EventList" component={EventListScreen} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
          <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
          <Stack.Screen name="OrganizerTask" component={OrganizerTaskScreen} />
          <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
          <Stack.Screen name="TaskLog" component={TaskLogScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MusicPlayerProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <AppNavigator />
        </NavigationContainer>
      </MusicPlayerProvider>
    </AuthProvider>
  );
}