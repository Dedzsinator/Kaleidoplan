import React, { useState } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
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
  BodyText,
  Spinner
} from '../components/ui/theme';

// Custom styled components for this screen
const ResetCard = styled(Card, 'mx-5 my-auto');
const FormContainer = styled(View, 'w-full');
const SuccessContainer = styled(View, 'items-center');
const SuccessIcon = styled(View, 'w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-4');
const ErrorText = styled(Text, 'text-red-500 text-sm mb-4');

const ResetPasswordScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      setError('');
      setIsLoading(true);
      await resetPassword(email);
      setIsSuccess(true);
    } catch (error) {
      setError('Failed to send reset email. Please check your email address.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="bg-gray-100">
      <ResetCard>
        {isSuccess ? (
          <SuccessContainer>
            <SuccessIcon>
              <Ionicons name="checkmark" size={32} color="#10b981" />
            </SuccessIcon>
            <Title className="text-center mb-4">Reset Email Sent</Title>
            <BodyText className="text-center mb-6">
              We've sent password reset instructions to {email}. Please check your email.
            </BodyText>
            <PrimaryButton
              className="w-full"
              onPress={() => navigation.navigate('Login')}
            >
              <PrimaryButtonText>Return to Login</PrimaryButtonText>
            </PrimaryButton>
          </SuccessContainer>
        ) : (
          <>
            <Title className="text-center mb-4">Reset Password</Title>
            <BodyText className="text-center mb-6">
              Enter your email address and we'll send you instructions to reset your password.
            </BodyText>
            
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
              
              <PrimaryButton 
                className="mt-4 mb-3"
                onPress={handleResetPassword} 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Spinner size="small" color="#ffffff" />
                ) : (
                  <PrimaryButtonText>Send Reset Instructions</PrimaryButtonText>
                )}
              </PrimaryButton>
              
              <OutlineButton
                onPress={() => navigation.goBack()}
              >
                <OutlineButtonText>Cancel</OutlineButtonText>
              </OutlineButton>
            </FormContainer>
          </>
        )}
      </ResetCard>
    </Container>
  );
};

export default ResetPasswordScreen;