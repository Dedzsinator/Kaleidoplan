import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedWaves from '../components/ui/AnimatedWaves';
import { signInWithGoogle } from '../../services/authService';
import '../styles/Auth.css';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Animation states
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    // Trigger animation after a small delay
    setTimeout(() => setIsAnimated(true), 100);
  }, []);

  interface LoginFormEvent extends React.FormEvent<HTMLFormElement> {}

  const handleLogin = async (e: LoginFormEvent): Promise<void> => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const user = await login(email, password);

      // Redirect based on user role
      if (user && user.role === 'admin') {
        navigate('/admin');
      } else if (user && user.role === 'organizer') {
        navigate('/organizer');
      } else {
        navigate('/home');
      }
    } catch (error: unknown) {
      setError('Invalid email or password. Please try again.');
      console.log('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Also update Google login with similar logic
  const handleGoogleLogin = async () => {
    try {
      setError('');
      setIsGoogleLoading(true);
      const user = await loginWithGoogle();

      // Redirect based on user role
      if (user && user.role === 'admin') {
        navigate('/admin');
      } else if (user && user.role === 'organizer') {
        navigate('/organizer');
      } else {
        navigate('/home');
      }
    } catch (error) {
      setError('Google sign-in failed. Please try again.');
      console.log('Google login error:', error);
    } finally {
      setIsGoogleLoading(false);
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

          <h2 className="auth-title">Welcome Back</h2>

          {error && <p className="auth-error">{error}</p>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="form-input"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input"
              />
            </div>

            <div className="forgot-password">
              <a href="#" onClick={() => navigate('/reset-password')}>
                Forgot password?
              </a>
            </div>

            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? <div className="button-spinner"></div> : <span>Let's Go!</span>}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button onClick={handleGoogleLogin} className="social-button" disabled={isGoogleLoading}>
            {isGoogleLoading ? (
              <div className="button-spinner dark"></div>
            ) : (
              <>
                <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="auth-footer">
            <p>
              Don't have an account?
              <a href="#" onClick={() => navigate('/register')}>
                {' '}
                Sign Up
              </a>
            </p>
            <button className="guest-button" onClick={() => navigate('/guest')}>
              I don't want to create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
