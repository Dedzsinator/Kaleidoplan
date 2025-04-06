import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Container } from '../components/ui/theme';
import { UserWelcomeCard } from '../components/user/UserWelcomeCard';
import { QuickActions } from '../components/actions/QuickActions';

const HomeScreen = ({ navigation }: { navigation: any }) => {
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
      <UserWelcomeCard user={user} />
      <QuickActions
        user={user}
        navigation={navigation}
        onLogout={handleLogout}
      />
    </Container>
  );
};

export default HomeScreen;