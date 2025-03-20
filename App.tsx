import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './app/contexts/AuthContext';
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

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, loading } = useAuth();

  // If still loading authentication state, you might want to show a splash screen
  if (loading) {
    return null; // or a loading screen
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0a7ea4', // Use your primary color
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: '#f8f9fa' }
      }}
    >
      {user ? (
        // User is signed in
        user.role === 'admin' ? (
          // Admin screens
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="AdminPanel" component={AdminPanelScreen} options={{ title: 'Admin Panel' }} />
            <Stack.Screen name="EventList" component={EventListScreen} options={{ title: 'All Events' }} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event Details' }} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Details' }} />
          </>
        ) : (
          // Organizer screens
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="EventList" component={EventListScreen} options={{ title: 'My Events' }} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event Details' }} />
            <Stack.Screen name="OrganizerTask" component={OrganizerTaskScreen} options={{ title: 'My Tasks' }} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Details' }} />
            <Stack.Screen name="TaskLog" component={TaskLogScreen} options={{ title: 'Task History' }} />
          </>
        )
      ) : (
        // No user is signed in (guest view)
        <>
          <Stack.Screen 
            name="Guest" 
            component={GuestScreen} 
            options={{ 
              headerShown: false, // Hide the default header for guest screen
            }} 
          />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event Details' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
        </>
      )}
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0a7ea4" />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;