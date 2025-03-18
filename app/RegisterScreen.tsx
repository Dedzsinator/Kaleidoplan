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
  LinkText,
  CaptionText,
  Spinner
} from '../components/ui/theme';
import * as Yup from 'yup';

// Custom styled components for this screen
const RegisterCard = styled(Card, 'mx-5 my-auto');
const FormContainer = styled(View, 'w-full');
const PolicyText = styled(CaptionText, 'mt-2 mb-4 text-center text-gray-500');
const LoginLink = styled(TouchableOpacity, 'mt-6 self-center');
const ErrorText = styled(Text, 'text-red-500 text-sm mb-1');

// Validation schema
const registerSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password')
});

const RegisterScreen = ({navigation}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register, authError } = useAuth();

  const validateField = async (field, value) => {
    try {
      await registerSchema.validateAt(field, { 
        name, email, password, confirmPassword, [field]: value 
      });
      setErrors(prev => ({ ...prev, [field]: undefined }));
    } catch (error) {
      setErrors(prev => ({ ...prev, [field]: error.message }));
    }
  };

  const handleRegister = async () => {
    try {
      // Validate all fields
      await registerSchema.validate(
        { name, email, password, confirmPassword },
        { abortEarly: false }
      );
      
      setIsLoading(true);
      await register(email, password, name);
      // Navigation will happen automatically via the App.tsx navigator
    } catch (error) {
      if (error.name === 'ValidationError') {
        // Handle Yup validation errors
        const validationErrors = {};
        error.inner.forEach(err => {
          validationErrors[err.path] = err.message;
        });
        setErrors(validationErrors);
      } else {
        // Handle Firebase errors
        Alert.alert('Registration Failed', error.message || 'Could not create your account. Please try again.');
      }
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
            onChangeText={(text) => {
              setName(text);
              validateField('name', text);
            }}
            placeholder="Enter your full name"
            autoCapitalize="words"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <ErrorText>{errors.name}</ErrorText>}
          
          <Label>Email</Label>
          <Input
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              validateField('email', text);
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && <ErrorText>{errors.email}</ErrorText>}
          
          <Label>Password</Label>
          <Input
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              validateField('password', text);
              if (confirmPassword) {
                validateField('confirmPassword', confirmPassword);
              }
            }}
            placeholder="Choose a password"
            secureTextEntry
            className={errors.password ? 'border-red-500' : ''}
          />
          {errors.password && <ErrorText>{errors.password}</ErrorText>}
          
          <Label>Confirm Password</Label>
          <Input
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              validateField('confirmPassword', text);
            }}
            placeholder="Confirm your password"
            secureTextEntry
            className={errors.confirmPassword ? 'border-red-500' : ''}
          />
          {errors.confirmPassword && <ErrorText>{errors.confirmPassword}</ErrorText>}
          
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