import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import spotifyService from '../../../services/spotify-web-api';
import '../../styles/SpotifyCallback.css';

const SpotifyCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Spotify authentication...');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Invalid callback parameters');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        const success = await spotifyService.handleCallback(code, state);

        if (success) {
          setStatus('success');
          setMessage('Successfully connected to Spotify!');
          setTimeout(() => navigate('/'), 2000);
        } else {
          setStatus('error');
          setMessage('Failed to connect to Spotify. Please try again.');
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (error) {
        console.error('Error handling Spotify callback:', error);
        setStatus('error');
        setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div className="spotify-callback-container">
      <div className={`spotify-callback-card ${status}`}>
        {status === 'loading' && <div className="spotify-loader"></div>}
        {status === 'success' && <div className="spotify-success-icon">✓</div>}
        {status === 'error' && <div className="spotify-error-icon">✗</div>}

        <h1 className="spotify-callback-title">
          {status === 'loading' ? 'Connecting to Spotify' : status === 'success' ? 'Connected!' : 'Connection Failed'}
        </h1>

        <p className="spotify-callback-message">{message}</p>

        {status !== 'loading' && <p className="spotify-callback-redirect">Redirecting you back in a few seconds...</p>}
      </div>
    </div>
  );
};

export default SpotifyCallback;
