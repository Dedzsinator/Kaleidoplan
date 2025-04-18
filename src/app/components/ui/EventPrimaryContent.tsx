import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import '../../styles/EventPrimaryContent.css';

interface EventPrimaryContentProps {
  event: {
    id: string;
    name: string;
    coverImageUrl?: string;
    startDate?: string | Date;
    location?: string;
    status?: string;
    description?: string;
    themeColor?: string;
  };
  onImageError: (eventId: string) => void;
}

const formatEventDate = (date: string | Date | undefined) => {
  if (!date) return 'Date TBD';

  try {
    let eventDate;
    if (typeof date === 'string') {
      eventDate = new Date(date);
    } else {
      eventDate = date;
    }

    if (!eventDate || !isValid(eventDate)) {
      console.warn(`Invalid date value:`, date);
      return 'Date TBD';
    }

    return format(eventDate, 'MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return 'Date TBD';
  }
};

const getStatusColor = (status: string | undefined) => {
  switch (status) {
    case 'upcoming':
      return { text: 'text-blue-400', dot: 'bg-blue-400' };
    case 'ongoing':
      return { text: 'text-green-400', dot: 'bg-green-400' };
    case 'completed':
      return { text: 'text-gray-400', dot: 'bg-gray-400' };
    default:
      return { text: 'text-gray-400', dot: 'bg-gray-400' };
  }
};

const EventPrimaryContent = ({ event, onImageError }: EventPrimaryContentProps) => {
  const navigate = useNavigate();
  const hasImage = !!event.coverImageUrl;
  const themeColor = event.themeColor || '#3B82F6';
  const statusColor = getStatusColor(event.status);

  return (
    <div className="event-primary-container">
      <div
        className="event-image-container"
        style={{
          boxShadow: `0 10px 15px ${themeColor}4D`,
        }}
      >
        {hasImage ? (
          <img
            src={event.coverImageUrl}
            className="event-image"
            alt={`${event.name} cover`}
            onError={() => onImageError(event.id)}
          />
        ) : (
          <div className="event-placeholder-image">
            <span className="event-placeholder-text">{event.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="event-content-container">
        <h1 className="event-title">{event.name}</h1>

        <div className="event-meta-row">
          <i className="event-icon fas fa-calendar"></i>
          <span className="event-meta-text">{formatEventDate(event.startDate)}</span>
        </div>

        <div className="event-meta-row">
          <i className="event-icon fas fa-map-marker-alt"></i>
          <span className="event-meta-text">{event.location || 'Location unavailable'}</span>
        </div>

        <div className="event-status-container">
          <div
            className="event-status-dot"
            style={{
              backgroundColor: statusColor.dot.includes('blue')
                ? '#3B82F6'
                : statusColor.dot.includes('green')
                  ? '#10B981'
                  : '#9CA3AF',
            }}
          ></div>
          <span
            className="event-status-text"
            style={{
              color: statusColor.text.includes('blue')
                ? '#3B82F6'
                : statusColor.text.includes('green')
                  ? '#10B981'
                  : '#9CA3AF',
            }}
          >
            {(event.status || 'UPCOMING').toUpperCase()}
          </span>
        </div>

        {event.description && <p className="event-description">{event.description}</p>}

        <button
          className="event-button"
          style={{ backgroundColor: themeColor }}
          onClick={() => navigate(`/events/${event.id}`)}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default EventPrimaryContent;
