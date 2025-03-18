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
  Spinner
} from '../components/ui/theme';

// Custom styled components for this screen
const LoginCard = styled(Card, 'mx-5 my-auto');
const FormContainer = styled(View, 'w-full');
const ForgotPassword = styled(TouchableOpacity, 'self-end mb-4');
const ForgotPasswordText = styled(Text, 'text-primary-500 text-sm');
const RegisterLink = styled(TouchableOpacity, 'mt-6 self-center');

const LoginScreen = ({navigation}: {navigation: any}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    try {
      setIsLoading(true);
      await login(email, password);
      // Navigation will happen automatically via the App.tsx navigator
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="bg-gray-100">
      <LoginCard>
        <Title className="text-center mb-8">Welcome Back</Title>
        
        <FormContainer>
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
            placeholder="Enter your password"
            secureTextEntry
          />
          
          <ForgotPassword>
            <ForgotPasswordText>Forgot password?</ForgotPasswordText>
          </ForgotPassword>
          
          <PrimaryButton onPress={handleLogin} disabled={isLoading}>
            {isLoading ? (
              <Spinner size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <PrimaryButtonText className="ml-2">Login</PrimaryButtonText>
              </>
            )}
          </PrimaryButton>
          
          <RegisterLink onPress={() => navigation.navigate('Register')}>
            <LinkText>Don't have an account? Register</LinkText>
          </RegisterLink>
        </FormContainer>
      </LoginCard>
    </Container>
  );
};

export default LoginScreen;