import React, { useState } from 'react';
import { View, Text, Alert, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
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
  OutlineButton,
  OutlineButtonText,
  LinkText,
  Spinner,
  Spacer
} from '../components/ui/theme';

// Custom styled components for this screen
const LoginCard = styled(Card, 'mx-5 my-auto');
const FormContainer = styled(View, 'w-full');
const ForgotPassword = styled(TouchableOpacity, 'self-end mb-4');
const ForgotPasswordText = styled(Text, 'text-primary-500 text-sm');
const RegisterLink = styled(TouchableOpacity, 'mt-6 self-center');
const Divider = styled(View, 'flex-row items-center my-5');
const DividerLine = styled(View, 'flex-1 h-px bg-gray-300');
const DividerText = styled(Text, 'mx-4 text-gray-500 text-sm');
const ErrorText = styled(Text, 'text-red-500 text-sm mb-4');

const LoginScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithGoogle, authError } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setError('');
      setIsLoading(true);
      await login(email, password);
      // Navigation will happen automatically via the App.tsx navigator
    } catch (error) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setIsGoogleLoading(true);
      await loginWithGoogle();
      // Navigation will happen automatically
    } catch (error) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ResetPassword');
  };

  return (
    <Container className="bg-gray-100">
      <LoginCard>
        <Title className="text-center mb-8">Welcome Back</Title>
        
        {error ? <ErrorText>{error}</ErrorText> : null}
        
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
          
          <ForgotPassword onPress={handleForgotPassword}>
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
          
          <Divider>
            <DividerLine />
            <DividerText>OR</DividerText>
            <DividerLine />
          </Divider>
          
          <OutlineButton 
            onPress={handleGoogleLogin} 
            disabled={isGoogleLoading}
            className="flex-row justify-center mb-4"
          >
            {isGoogleLoading ? (
              <Spinner size="small" color="#0a7ea4" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#0a7ea4" />
                <OutlineButtonText className="ml-2">Continue with Google</OutlineButtonText>
              </>
            )}
          </OutlineButton>
          
          <RegisterLink onPress={() => navigation.navigate('Register')}>
            <LinkText>Don't have an account? Register</LinkText>
          </RegisterLink>
        </FormContainer>
      </LoginCard>
    </Container>
  );
};

export default LoginScreen;