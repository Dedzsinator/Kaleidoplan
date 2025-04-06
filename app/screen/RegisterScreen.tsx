import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  Alert
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedWaves from '../components/ui/AnimatedWaves';
import * as Yup from 'yup';

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

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();

  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    // Set status bar to light content
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    StatusBar.setBarStyle('light-content');

    // Run entrance animations
    opacity.value = withTiming(1, { duration: 1000, easing: Easing.ease });
    translateY.value = withDelay(300, withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

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
      await registerSchema.validate(
        { name, email, password, confirmPassword },
        { abortEarly: false }
      );

      setIsLoading(true);
      await register(email, password, name);
      // Success - navigation handled by AuthContext
    } catch (error) {
      if (error.name === 'ValidationError') {
        const validationErrors = {};
        error.inner.forEach(err => {
          validationErrors[err.path] = err.message;
        });
        setErrors(validationErrors);
      } else {
        console.log('Registration error:', error);
        Alert.alert('Registration Failed', error.message || 'Could not create your account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6A11CB', '#2575FC', '#3C1053']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Enhanced animated waves */}
      <AnimatedWaves
        height={230}
        colors={['rgba(106, 17, 203, 0.4)', 'rgba(37, 117, 252, 0.35)', 'rgba(60, 16, 83, 0.3)']}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.cardContainer, animatedStyle]}>
          <View style={styles.card}>
            <Image
              source={require('../../assets/images/favicon.jpg')}
              style={styles.logo}
              resizeMode="contain"
              defaultSource={require('../../assets/images/favicon.jpg')}
            />

            <Text style={styles.title}>Join The Festival</Text>
            <Text style={styles.subtitle}>Create your account</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                validateField('name', text);
              }}
              placeholder="Enter your full name"
              autoCapitalize="words"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, errors.name ? styles.inputError : null]}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                validateField('email', text);
              }}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, errors.email ? styles.inputError : null]}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={styles.label}>Password</Text>
            <TextInput
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
              placeholderTextColor="#9CA3AF"
              style={[styles.input, errors.password ? styles.inputError : null]}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                validateField('confirmPassword', text);
              }}
              placeholder="Confirm your password"
              secureTextEntry
              placeholderTextColor="#9CA3AF"
              style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            <Text style={styles.policyText}>
              By joining, you're agreeing to our Terms of Service and Privacy Policy
            </Text>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              style={styles.button}
            >
              <LinearGradient
                colors={['#6A11CB', '#2575FC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="person-add-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Join The Festival</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={styles.loginPrompt}
            >
              <Text style={styles.loginPromptText}>
                Already have an account? <Text style={styles.loginPromptHighlight}>Sign In</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Guest')} // Or whatever your guest screen route name is
              style={styles.guestModeButton}
            >
              <Text style={styles.guestModeText}>Continue without an account</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 40,
    paddingBottom: 60,
  },
  cardContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 24,
    marginVertical: 20,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    // Add backdrop filter blur for iOS
    ...(Platform.OS === 'ios' ? {
      backdropFilter: 'blur(10px)'
    } : {})
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#3C1053',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    color: '#6A11CB',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    color: '#4B5563',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#1F2937',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputError: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(254, 226, 226, 0.3)',
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonGradient: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
  },
  policyText: {
    color: 'rgba(107, 114, 128, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 8,
  },
  loginPrompt: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginPromptText: {
    color: '#4B5563',
    fontSize: 16,
  },
  loginPromptHighlight: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: -12,
    marginBottom: 12,
  },
  guestModeButton: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
    alignSelf: 'center',
  },
  guestModeText: {
    color: 'rgba(107, 114, 128, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RegisterScreen;