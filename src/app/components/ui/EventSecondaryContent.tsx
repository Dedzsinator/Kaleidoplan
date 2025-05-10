import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { subscribeToEvent, unsubscribeFromEvent } from '@services/socketService';
import '../../styles/EventSecondaryContent.css';

interface EventSecondaryContentProps {
  event: {
    id: string;
    name: string;
    price?: string | number;
    remainingSpots?: number;
    organizer?: string;
    themeColor?: string;
  };
}

const EventSecondaryContent = ({ event }: EventSecondaryContentProps) => {
  const eventName = event?.name ?? 'Unnamed Event';
  const eventPrice = event?.price ?? 'Free';
  const eventOrganizer = event?.organizer ?? 'Kaleidoplan Team';

  const [email, setEmail] = useState('');
  const [notifyMe, setNotifyMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const themeColor = event?.themeColor ?? '#3B82F6';

  const handleNotifyMe = async () => {
    // Reset error state
    setError(null);

    if (!email.trim()) {
      setError('Email Required: Please enter your email to get notifications.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Invalid Email: Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Call the subscription endpoint
      const response = await axios.post('/api/subscriptions', {
        email: email.trim(),
        eventId: event.id,
      });

      // Handle success

      setNotifyMe(true);

      // Show success message
      alert(
        `Thank you! We've sent a confirmation email to ${email}. Please check your inbox to complete your subscription.`,
      );
    } catch (err: unknown) {
      console.error('Subscription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to set up notifications. Please try again.');
      setNotifyMe(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (event?.id) {
      // Subscribe to this event's notifications
      subscribeToEvent(event.id);

      // Cleanup: unsubscribe when component unmounts
      return () => {
        unsubscribeFromEvent(event.id);
      };
    }
  }, [event?.id]);

  return (
    <div className="event-secondary-container">
      <div className="event-info-box">
        <div className="event-info-row">
          <i className="fa fa-tag info-icon"></i>
          <span className="info-label">Price:</span>
          <span className="info-value">{event.price ? `$${event.price}` : 'Free'}</span>
        </div>

        <div className="event-info-row">
          <i className="fa fa-users info-icon"></i>
          <span className="info-label">Availability:</span>
          <span className="info-value">
            {event.remainingSpots ? `${event.remainingSpots} spots left` : 'Limited seats'}
          </span>
        </div>

        <div className="event-info-row">
          <i className="fa fa-user info-icon"></i>
          <span className="info-label">Organizer:</span>
          <span className="info-value">{event.organizer || 'Kaleidoplan Team'}</span>
        </div>
      </div>

      <div className="event-notification-box">
        <h3 className="notification-title">Get Event Updates</h3>
        <p className="notification-text">Be the first to know about changes, ticket availability, and other updates.</p>

        <input
          type="email"
          className="email-input"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={notifyMe || isSubmitting}
        />

        {error && <p className="error-message">{error}</p>}

        <button
          className="notify-button"
          style={{ backgroundColor: notifyMe ? '#059669' : themeColor }}
          onClick={handleNotifyMe}
          disabled={notifyMe || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : notifyMe ? 'Notifications Enabled' : 'Notify Me'}
          {notifyMe && <i className="fa fa-check-circle" style={{ marginLeft: '8px' }}></i>}
        </button>
      </div>
    </div>
  );
};

export default EventSecondaryContent;
