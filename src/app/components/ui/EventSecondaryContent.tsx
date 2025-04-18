import React, { useState } from 'react';
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
  const themeColor = event?.themeColor ?? '#3B82F6';

  const handleNotifyMe = () => {
    if (!email.trim()) {
      alert('Email Required: Please enter your email to get notifications.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      alert('Invalid Email: Please enter a valid email address.');
      return;
    }

    // Here you would normally send the email to your backend
    alert(`Notification Set: We'll notify you about updates for "${event.name}"`);
    setNotifyMe(true);
  };

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
        />

        <button
          className="notify-button"
          style={{ backgroundColor: notifyMe ? '#059669' : themeColor }}
          onClick={handleNotifyMe}
          disabled={notifyMe}
        >
          {notifyMe ? 'Notifications Enabled' : 'Notify Me'}
          {notifyMe && <i className="fa fa-check-circle" style={{ marginLeft: '8px' }}></i>}
        </button>
      </div>
    </div>
  );
};

export default EventSecondaryContent;
