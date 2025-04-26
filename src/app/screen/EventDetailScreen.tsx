import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById } from '../../services/eventService';
import { getSponsors } from '../../services/sponsorService';
import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';
import Map from '../components/Map';
import ImageSlideshow from '../components/ui/SlideShow';
import SpotifyRadioOverlay from '../components/actions/SpotifyRadioOverlay';
import '../styles/EventDetailScreen.css';

// Types
import { Event, Sponsor, Performer } from '../models/types';

// Helper functions to safely parse dates
const safeParseDate = (dateValue: unknown): Date => {
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string') return new Date(dateValue);
  return new Date(); // Fallback to current date
};

const formatDate = (dateValue: unknown): string => {
  return safeParseDate(dateValue).toLocaleDateString();
};

const formatDateTime = (dateValue: unknown): string => {
  return safeParseDate(dateValue).toLocaleString();
};

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface ApiError {
  message?: string;
  status?: number;
  [key: string]: unknown;
}

const DEFAULT_COLOR = '#3357FF';
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';

const EventDetailScreen: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [spotifyExpanded, setSpotifyExpanded] = useState(false);
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);

  // Calculate contrast color (black or white) based on event color
  const getContrastColor = (hexColor: string): string => {
    // Remove # if present
    hexColor = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // CSS variables based on event color
  const colorStyles = event?.color
    ? ({
        '--event-color': event.color,
        '--event-color-light': `${event.color}33`, // 20% opacity
        '--event-color-medium': `${event.color}99`, // 60% opacity
        '--text-on-color': getContrastColor(event.color),
        '--border-color': `${event.color}66`, // 40% opacity
      } as React.CSSProperties)
    : {};

  const fetchEventData = useCallback(async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      let eventData: Event | null = null;

      try {
        // Check if this is a temp ID with random numbers (which MongoDB can't handle)
        const isTempRandomId = eventId.startsWith('temp-') && !isNaN(parseFloat(eventId.split('temp-')[1]));

        if (!isTempRandomId) {
          // For real MongoDB IDs, fetch from API
          eventData = await getEventById(eventId);
        } else {
          throw new Error('Temp ID - using session storage');
        }
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error';

        console.error('API fetch error:', errorMessage);

        // Try session storage as fallback
        const cachedEventsStr = sessionStorage.getItem('all-events');
        if (cachedEventsStr) {
          try {
            const cachedEvents = JSON.parse(cachedEventsStr);
            const cachedEvent = cachedEvents.find((e: Record<string, unknown>) => e.id === eventId);
            if (cachedEvent) {
              // Ensure the cached event has all required properties
              if (!cachedEvent.color) cachedEvent.color = DEFAULT_COLOR;
              if (!cachedEvent.status) cachedEvent.status = 'upcoming';
              if (!cachedEvent.startDate) cachedEvent.startDate = new Date();
              if (!cachedEvent.endDate) cachedEvent.endDate = new Date();
              eventData = cachedEvent as Event;
            }
          } catch (e) {
            console.error('Error parsing cached events:', e);
          }
        }
      }

      if (eventData) {
        // Set the event data
        setEvent(eventData);

        // Set map region if location exists
        if (eventData.latitude && eventData.longitude) {
          setMapRegion({
            latitude: Number(eventData.latitude),
            longitude: Number(eventData.longitude),
            latitudeDelta: Number(eventData.latitudeDelta) || 0.01,
            longitudeDelta: Number(eventData.longitudeDelta) || 0.01,
          });
        }

        // Fetch sponsors if sponsorIds exist
        if (eventData.sponsorIds && Array.isArray(eventData.sponsorIds) && eventData.sponsorIds.length > 0) {
          try {
            const sponsorData = await getSponsors(eventData.sponsorIds);
            setSponsors(sponsorData || []);
          } catch (sponsorError: unknown) {
            console.error(
              'Error fetching sponsors:',
              sponsorError instanceof Error ? sponsorError.message : 'Unknown error',
            );
            setSponsors([]);
          }
        } else {
          setSponsors([]);
        }

        setLoading(false);
        return;
      }

      // If we reach here, we couldn't find the event
      throw new Error('Event not found');
    } catch (err: unknown) {
      console.error('Error fetching event data:', err instanceof Error ? err.message : 'Unknown error');
      setError('Failed to load event details');
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  // Handle Spotify controls
  const handleToggleSpotify = () => {
    setIsSpotifyPlaying(!isSpotifyPlaying);
  };

  const handleExpandSpotify = () => {
    setSpotifyExpanded(!spotifyExpanded);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Event not found'}</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  // Safely treat properties that might come from unknown index signature
  const eventName = String(event.name || 'Untitled Event');
  const eventStartDate = safeParseDate(event.startDate);
  const eventEndDate = safeParseDate(event.endDate);
  const coverImage = (event.coverImageUrl as string) || DEFAULT_IMAGE;
  const slideshowImages = Array.isArray(event.slideshowImages) ? event.slideshowImages : coverImage ? [coverImage] : [];

  return (
    <div className="event-detail-screen" style={colorStyles}>
      <NavBar />

      {/* Hero Section */}
      <div className="event-hero" style={{ backgroundImage: `url(${coverImage})` }}>
        <div className="event-hero-overlay" style={{ backgroundColor: event.color || DEFAULT_COLOR }}></div>
        <div className="event-hero-content">
          <h1 className="event-title">{eventName}</h1>
          <p className="event-date">
            {formatDate(eventStartDate)} - {formatDate(eventEndDate)}
          </p>

          {event.ticketUrl && (
            <a
              href={typeof event.ticketUrl === 'string' ? event.ticketUrl : '#'}
              className="ticket-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Tickets
            </a>
          )}
        </div>
      </div>

      <div className="event-content-container">
        {/* Main Info Section */}
        <section className="event-main-info">
          <div className="event-card">
            <h2>Event Details</h2>
            <div className="info-row">
              <div className="info-label">Date & Time:</div>
              <div className="info-value">
                {formatDateTime(eventStartDate)} - {formatDateTime(eventEndDate)}
              </div>
            </div>

            <div className="info-row">
              <div className="info-label">Location:</div>
              <div className="info-value">{event.location || 'TBA'}</div>
            </div>

            <div className="info-row">
              <div className="info-label">Type:</div>
              <div className="info-value">{typeof event.type === 'string' ? event.type : 'General Event'}</div>
            </div>

            <div className="info-row">
              <div className="info-label">Status:</div>
              <div className="info-value status-badge" data-status={event.status || 'upcoming'}>
                {event.status || 'Upcoming'}
              </div>
            </div>

            {event.website && (
              <div className="info-row">
                <div className="info-label">Website:</div>
                <div className="info-value">
                  <a
                    href={typeof event.website === 'string' ? event.website : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {typeof event.website === 'string' ? event.website : 'Event Website'}
                  </a>
                </div>
              </div>
            )}

            <div className="event-description">
              <h3>About This Event</h3>
              <p>{event.description || 'No description available.'}</p>
            </div>
          </div>

          {/* Map */}
          {mapRegion && (
            <div className="event-card map-card">
              <h2>Location</h2>
              <div className="map-container">
                <Map
                  region={mapRegion}
                  markers={[
                    {
                      coordinate: {
                        latitude: mapRegion.latitude,
                        longitude: mapRegion.longitude,
                      },
                      title: event.name,
                      description: event.location || 'Event Location',
                    },
                  ]}
                  style={{ width: '100%', height: '300px' }}
                />
              </div>
              <p className="location-text">
                {event.location || 'Location not specified'}
                {event.latitude && event.longitude
                  ? ` (${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)})`
                  : ''}
              </p>
            </div>
          )}
        </section>

        {/* Performers Section - Enhanced Version */}
        {event.performers && Array.isArray(event.performers) && event.performers.length > 0 ? (
          <section className="event-performers">
            <div className="event-card">
              <h2>Performers</h2>
              <div className="performers-grid">
                {event.performers.map((performer, index) => {
                  // First check if this is a string ID rather than an object
                  if (typeof performer === 'string') {
                    return null;
                  }

                  // Cast performer to the correct type and add proper type checking
                  const typedPerformer = performer as Performer;

                  // Extract ID with proper fallbacks - using both id and _id for MongoDB compatibility
                  const performerId = typedPerformer._id || `performer-${index}`;

                  // Get name with fallback
                  const performerName = typedPerformer.name || 'Performer';

                  // Get bio with fallback
                  const performerBio = typedPerformer.bio || '';

                  // Get image with fallback - use ONLY the defined image property from the type
                  const performerImage = typedPerformer.image || null;

                  return (
                    <div
                      className="performer-card"
                      key={performerId}
                      style={{
                        borderColor: `${event.color || DEFAULT_COLOR}66`,
                      }}
                    >
                      <div className="performer-image-container" style={{ borderColor: event.color }}>
                        <img
                          src={
                            performerImage ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(performerName)}&background=${event.color?.substring(1) || '3357FF'}&color=fff`
                          }
                          alt={performerName}
                          className="performer-image"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(performerName)}&background=${event.color?.substring(1) || '3357FF'}&color=fff`;
                          }}
                        />
                      </div>
                      <h3 className="performer-name">{performerName}</h3>

                      {performerBio && (
                        <div className="performer-bio-container">
                          <p className="performer-bio">{performerBio}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {/* Sponsors Section */}
        {sponsors.length > 0 && (
          <section className="event-sponsors">
            <div className="event-card">
              <h2>Event Sponsors</h2>
              <div className="sponsors-grid">
                {sponsors.map((sponsor) => (
                  <div className="sponsor-item" key={sponsor.id}>
                    {sponsor.logoUrl ? (
                      <div className="sponsor-logo-container">
                        <img
                          src={sponsor.logoUrl}
                          alt={sponsor.name}
                          className="sponsor-logo"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="sponsor-fallback-name" style={{ display: 'none' }}>
                          {sponsor.name}
                        </div>
                      </div>
                    ) : (
                      <div className="sponsor-fallback-name">{sponsor.name}</div>
                    )}
                    <div className="sponsor-details">
                      <h3 className="sponsor-name">{sponsor.name}</h3>
                      <p className={`sponsor-level ${(sponsor.level || 'partner').toLowerCase()}`}>
                        {sponsor.level || 'Partner'}
                      </p>
                      {sponsor.description && <p className="sponsor-description">{sponsor.description}</p>}
                      {sponsor.website && (
                        <a href={sponsor.website} className="sponsor-website" target="_blank" rel="noopener noreferrer">
                          Visit Website
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Spotify Section */}
        {event.spotifyPlaylistId && (
          <section className="event-spotify">
            <div className="event-card">
              <h2>Event Soundtrack</h2>
              <p className="spotify-intro">Listen to tracks curated for this event</p>

              <div className="spotify-controls">
                <button className={`spotify-button ${isSpotifyPlaying ? 'playing' : ''}`} onClick={handleToggleSpotify}>
                  {isSpotifyPlaying ? 'Pause' : 'Play'} Soundtrack
                </button>
                <button className="spotify-expand-button" onClick={handleExpandSpotify}>
                  {spotifyExpanded ? 'Collapse' : 'Expand'} Player
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Gallery Section */}
        {slideshowImages.length > 0 && (
          <section className="event-gallery">
            <div className="event-card">
              <h2>Gallery</h2>
              <ImageSlideshow images={slideshowImages} height={400} interval={5000} showGradient={true} />
            </div>
          </section>
        )}
      </div>

      {/* Spotify Player Overlay */}
      {event.spotifyPlaylistId && (
        <SpotifyRadioOverlay
          currentEvent={event}
          isPlaying={isSpotifyPlaying}
          onTogglePlay={handleToggleSpotify}
          onExpand={handleExpandSpotify}
          expanded={spotifyExpanded}
        />
      )}

      <Footer />
    </div>
  );
};

export default EventDetailScreen;
