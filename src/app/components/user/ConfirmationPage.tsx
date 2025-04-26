import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import '../../styles/ConfirmationPage.css';

const SubscriptionConfirmPage = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmSubscription = async () => {
      try {
        const response = await axios.get(`/api/subscriptions/confirm/${token}`);
        setStatus('success');
        setMessage(response.data.message || 'Your subscription has been confirmed successfully!');
      } catch (error) {
        setStatus('error');
        setMessage('Invalid or expired confirmation link. Please try subscribing again.');
      }
    };

    if (token) {
      confirmSubscription();
    }
  }, [token]);

  return (
    <div className="subscription-confirm-container">
      {status === 'loading' && (
        <div className="subscription-loading">
          <div className="loading-spinner"></div>
          <p>Confirming your subscription...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="subscription-success">
          <div className="success-icon">✓</div>
          <h2>Subscription Confirmed!</h2>
          <p>{message}</p>
          <p>You'll now receive updates about upcoming events every Monday.</p>
          <Link to="/" className="back-home-button">
            Back to Events
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="subscription-error">
          <div className="error-icon">!</div>
          <h2>Confirmation Failed</h2>
          <p>{message}</p>
          <Link to="/" className="back-home-button">
            Back to Events
          </Link>
        </div>
      )}
    </div>
  );
};

export default SubscriptionConfirmPage;
