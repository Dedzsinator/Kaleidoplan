import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import InterestButton from './InterestButton';
import axios from 'axios';
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
  onClick?: () => void;
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

const EventPrimaryContent = ({ event, onImageError, onClick }: EventPrimaryContentProps) => {
  const navigate = useNavigate();
  const hasImage = !!event.coverImageUrl;
  const themeColor = event.themeColor || '#3B82F6';
  const statusColor = getStatusColor(event.status);

  // Add state to track if details are expanded and the event details
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventPrimaryContentProps['event'] | null>(null);

  const handleTitleClick = async () => {
    setIsExpanded(!isExpanded);

    // Only fetch details if expanding and we don't already have them
    if (!isExpanded && !eventDetails) {
      setIsLoading(true);
      try {
        const response = await axios.get(`/api/events/${event.id}`);
        setEventDetails(response.data);
      } catch (error) {
        console.error('Error fetching event details:', error);
        // Use the data we already have as fallback
        setEventDetails(event);
      } finally {
        setIsLoading(false);
      }
    }
  };

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
        <h1 className="event-title" onClick={handleTitleClick} style={{ cursor: 'pointer' }}>
          {event.name} {isExpanded ? '▲' : '▼'}
        </h1>

        <div className="event-actions">
          <InterestButton eventId={event.id} size="medium" />
        </div>

        {/* Only show details when expanded */}
        {isExpanded && (
          <div className="event-details-container">
            {isLoading ? (
              <div className="event-loading">Loading details...</div>
            ) : (
              <>
                <div className="event-meta-row">
                  <i className="event-icon fas fa-calendar"></i>
                  <span className="event-meta-text">{formatEventDate(eventDetails?.startDate || event.startDate)}</span>
                </div>

                <div className="event-meta-row">
                  <i className="event-icon fas fa-map-marker-alt"></i>
                  <span className="event-meta-text">
                    {eventDetails?.location || event.location || 'Location unavailable'}
                  </span>
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
                    {(eventDetails?.status || event.status || 'UPCOMING').toUpperCase()}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {event.description && <p className="event-description">{event.description}</p>}

        <button className="event-button" style={{ backgroundColor: themeColor }} onClick={onClick}>
          View Details
        </button>
      </div>
    </div>
  );
};

export default EventPrimaryContent;
