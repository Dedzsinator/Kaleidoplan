import React from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import {
  Container,
  Card,
  Title,
  Subtitle,
  BodyText,
  PrimaryButton,
  PrimaryButtonText,
  SecondaryButton,
  SecondaryButtonText,
  DangerButton,
  DangerButtonText
} from '../components/ui/theme';

const WelcomeCard = styled(Card, 'mb-4');
const ActionsContainer = styled(View, 'mt-4 gap-3');
const IconContainer = styled(View, 'mb-4 self-center bg-primary-100 p-5 rounded-full');
const ButtonIcon = styled(View, 'mr-2');

const HomeScreen = ({navigation}: {navigation: any}) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation will be handled by the AuthProvider when user state changes
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  return (
    <Container className="p-4">
      <WelcomeCard>
        <IconContainer>
          <Ionicons name="person-circle-outline" size={60} color="#0a7ea4" />
        </IconContainer>
        
        <Title className="text-center mb-2">
          Welcome, {user?.displayName || user?.email}!
        </Title>
        
        <BodyText className="text-center mb-2">
          {user?.role === 'admin' 
            ? 'You are logged in as an administrator.' 
            : 'You are logged in as an event organizer.'}
        </BodyText>
      </WelcomeCard>
      
      <Card>
        <Subtitle className="mb-4">Quick Actions</Subtitle>
        
        <ActionsContainer>
          {user?.role === 'admin' && (
            <PrimaryButton
              onPress={() => navigation.navigate('AdminPanel')}
              className="flex-row justify-center"
            >
              <ButtonIcon>
                <Ionicons name="grid-outline" size={18} color="#fff" />
              </ButtonIcon>
              <PrimaryButtonText>Admin Dashboard</PrimaryButtonText>
            </PrimaryButton>
          )}
          
          <SecondaryButton
            onPress={() => navigation.navigate(user?.role === 'admin' ? 'EventList' : 'OrganizerTask')}
            className="flex-row justify-center"
          >
            {user?.role === 'admin' ? (
              <>
                <ButtonIcon>
                  <Ionicons name="calendar-outline" size={18} color="#0a7ea4" />
                </ButtonIcon>
                <SecondaryButtonText>Manage Events</SecondaryButtonText>
              </>
            ) : (
              <>
                <ButtonIcon>
                  <Ionicons name="list-outline" size={18} color="#0a7ea4" />
                </ButtonIcon>
                <SecondaryButtonText>My Tasks</SecondaryButtonText>
              </>
            )}
          </SecondaryButton>
          
          <DangerButton
            onPress={handleLogout}
            className="flex-row justify-center"
          >
            <ButtonIcon>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
            </ButtonIcon>
            <DangerButtonText>Logout</DangerButtonText>
          </DangerButton>
        </ActionsContainer>
      </Card>
    </Container>
  );
};

export default HomeScreen;