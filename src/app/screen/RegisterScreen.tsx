import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedWaves from '../components/ui/AnimatedWaves';
import * as Yup from 'yup';
import '../styles/Auth.css';

// Define error types for strongly typed form handling
interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

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
    .oneOf([Yup.ref('password'), undefined], 'Passwords must match')
    .required('Please confirm your password'),
});

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const { register } = useAuth();
  const navigate = useNavigate();

  // Animation states
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    // Trigger animation after a small delay
    setTimeout(() => setIsAnimated(true), 100);
  }, []);

  const validateField = async (field: string, value: string) => {
    try {
      await registerSchema.validateAt(field, {
        name,
        email,
        password,
        confirmPassword,
        [field]: value,
      });
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (errorObj) {
      // Don't explicitly type as unknown, but extract message safely
      const errorMessage = errorObj instanceof Error ? errorObj.message : `Invalid ${field}`;
      setErrors((prev) => ({ ...prev, [field]: errorMessage }));
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await registerSchema.validate({ name, email, password, confirmPassword }, { abortEarly: false });

      setIsLoading(true);
      await register(email, password, name);
      // Add navigation after successful registration
      navigate('/home');
    } catch (errorObj) {
      if (errorObj instanceof Yup.ValidationError) {
        const validationErrors: FormErrors = {};
        errorObj.inner.forEach((err) => {
          if (err.path) {
            validationErrors[err.path as keyof FormErrors] = err.message;
          }
        });
        setErrors(validationErrors);
      } else {
        // Simplify error handling
        const errorMessage = errorObj instanceof Error ? errorObj.message : 'An unknown error occurred';

        setErrors({ form: errorMessage || 'Could not create your account. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="gradient-overlay"></div>
        <AnimatedWaves height={230} />
      </div>

      <div className={`auth-card-container ${isAnimated ? 'animated' : ''}`}>
        <div className="auth-card">
          <img src={require('../assets/images/favicon.jpg')} alt="Logo" className="auth-logo" />

          <h2 className="auth-title">Join The Festival</h2>
          <p className="auth-subtitle">Create your account</p>

          {errors.form && <p className="auth-error">{errors.form}</p>}

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  validateField('name', e.target.value);
                }}
                placeholder="Enter your full name"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                autoComplete="name"
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  validateField('email', e.target.value);
                }}
                placeholder="Enter your email"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                autoComplete="email"
              />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validateField('password', e.target.value);
                  if (confirmPassword) {
                    validateField('confirmPassword', confirmPassword);
                  }
                }}
                placeholder="Choose a password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
              />
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  validateField('confirmPassword', e.target.value);
                }}
                placeholder="Confirm your password"
                className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
              />
              {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
            </div>

            <p className="policy-text">By joining, you're agreeing to our Terms of Service and Privacy Policy</p>

            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? <div className="button-spinner"></div> : <span>Join The Festival</span>}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
              >
                {' '}
                Sign In
              </a>
            </p>
            <button className="guest-button" onClick={() => navigate('/guest')}>
              Continue without an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
