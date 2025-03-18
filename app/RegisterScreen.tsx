import React, { useState } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import {
  Container,
  Card,
  Title,
  Label,
  Input,
  PrimaryButton,
  PrimaryButtonText,
  LinkText,
  CaptionText,
  Spinner
} from '../components/ui/theme';

// Custom styled components for this screen
const RegisterCard = styled(Card, 'mx-5 my-auto');
const FormContainer = styled(View, 'w-full');
const PolicyText = styled(CaptionText, 'mt-2 mb-4 text-center text-gray-500');
const LoginLink = styled(TouchableOpacity, 'mt-6 self-center');

const RegisterScreen = ({navigation}: {navigation: any}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    try {
      setIsLoading(true);
      await register(email, password);
      // Navigation will happen automatically via the App.tsx navigator
    } catch (error) {
      Alert.alert('Registration Failed', 'Could not create your account. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="bg-gray-100">
      <RegisterCard>
        <Title className="text-center mb-8">Create Account</Title>
        
        <FormContainer>
          <Label>Full Name</Label>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />
          
          <Label>Email</Label>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          
          <Label>Password</Label>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Choose a password"
            secureTextEntry
          />
          
          <Label>Confirm Password</Label>
          <Input
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
          />
          
          <PolicyText>
            By registering, you agree to our Terms of Service and Privacy Policy
          </PolicyText>
          
          <PrimaryButton onPress={handleRegister} disabled={isLoading}>
            {isLoading ? (
              <Spinner size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <PrimaryButtonText className="ml-2">Register</PrimaryButtonText>
              </>
            )}
          </PrimaryButton>
          
          <LoginLink onPress={() => navigation.navigate('Login')}>
            <LinkText>Already have an account? Login</LinkText>
          </LoginLink>
        </FormContainer>
      </RegisterCard>
    </Container>
  );
};

export default RegisterScreen;