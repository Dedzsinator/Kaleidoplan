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

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const DEFAULT_COLOR = '#3357FF';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';

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
  const colorStyles = event?.color ? {
    '--event-color': event.color,
    '--event-color-light': `${event.color}33`, // 20% opacity
    '--event-color-medium': `${event.color}99`, // 60% opacity
    '--text-on-color': getContrastColor(event.color),
    '--border-color': `${event.color}66` // 40% opacity
  } as React.CSSProperties : {};

  const fetchEventData = useCallback(async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      console.log('Fetching data for event ID:', eventId);

      // Always try to fetch from API first for real data
      let eventData = null;

      try {
        // Check if this is a temp ID with random numbers (which MongoDB can't handle)
        const isTempRandomId = eventId.startsWith('temp-') && !isNaN(parseFloat(eventId.split('temp-')[1]));

        if (!isTempRandomId) {
          // For real MongoDB IDs, fetch from API
          eventData = await getEventById(eventId);
          console.log('Raw API response for event:', JSON.stringify(eventData));
        } else {
          console.log('Skipping API call for temp random ID');
          throw new Error('Temp ID - using session storage');
        }
      } catch (apiError: any) {
        console.error('API fetch error:', apiError?.message || apiError);

        // Try session storage as fallback
        const cachedEventsStr = sessionStorage.getItem('all-events');
        if (cachedEventsStr) {
          try {
            const cachedEvents = JSON.parse(cachedEventsStr);
            const cachedEvent = cachedEvents.find((e: Event) => e.id === eventId);
            if (cachedEvent) {
              console.log('Found event in session storage:', cachedEvent);
              eventData = cachedEvent;
            }
          } catch (e) {
            console.error('Error parsing cached events:', e);
          }
        }
      }

      if (eventData) {
        // Display full event data structure to debug
        console.log('Full event data:', JSON.stringify(eventData, null, 2));

        // Set the event data
        setEvent(eventData);

        // Set map region if location exists
        if (eventData.latitude && eventData.longitude) {
          setMapRegion({
            latitude: eventData.latitude,
            longitude: eventData.longitude,
            latitudeDelta: eventData.latitudeDelta || 0.01,
            longitudeDelta: eventData.longitudeDelta || 0.01
          });
        }

        // Fetch sponsors if sponsorIds exist
        if (eventData.sponsorIds && eventData.sponsorIds.length > 0) {
          console.log('Sponsor IDs found, fetching sponsors:', eventData.sponsorIds);
          try {
            const sponsorData = await getSponsors(eventData.sponsorIds);
            console.log('Sponsor data received:', sponsorData);
            setSponsors(sponsorData || []);
          } catch (sponsorError) {
            console.error('Error fetching sponsors:', sponsorError);
            setSponsors([]);
          }
        } else {
          console.log('No sponsor IDs found in event data');
          setSponsors([]);
        }

        setLoading(false);
        return;
      }

      // If we reach here, we couldn't find the event
      throw new Error('Event not found');
    } catch (err) {
      console.error('Error fetching event data:', err);
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

  const coverImage = event.coverImageUrl || DEFAULT_IMAGE;
  const slideshowImages = Array.isArray(event.slideshowImages) ? event.slideshowImages : coverImage ? [coverImage] : [];

  return (
    <div className="event-detail-screen" style={colorStyles}>
      <NavBar />

      {/* Hero Section */}
      <div className="event-hero" style={{ backgroundImage: `url(${coverImage})` }}>
        <div className="event-hero-overlay" style={{ backgroundColor: event.color || DEFAULT_COLOR }}></div>
        <div className="event-hero-content">
          <h1 className="event-title">{event.name}</h1>
          <p className="event-date">{new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}</p>

          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
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
                {new Date(event.startDate).toLocaleString()} - {new Date(event.endDate).toLocaleString()}
              </div>
            </div>

            <div className="info-row">
              <div className="info-label">Location:</div>
              <div className="info-value">{event.location || 'TBA'}</div>
            </div>

            <div className="info-row">
              <div className="info-label">Type:</div>
              <div className="info-value">{event.type || 'General Event'}</div>
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
                  <a href={event.website} target="_blank" rel="noopener noreferrer">
                    {event.website}
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
                      description: event.location,
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
        {(event.performers && Array.isArray(event.performers) && event.performers.length > 0) ? (
          <section className="event-performers">
            <div className="event-card">
              <h2>Performers</h2>
              <div className="performers-grid">
                {event.performers.map((performer, index) => {
                  // First check if this is a string ID rather than an object
                  if (typeof performer === 'string') {
                    console.log('Performer is a string ID, not an object:', performer);
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

                  // Better debugging with actual type info
                  console.log('Rendering performer:', {
                    id: performerId,
                    name: performerName,
                    hasImage: !!performerImage,
                    hasRequiredFields: !!(typedPerformer.createdAt && typedPerformer.updatedAt),
                    rawPerformer: typedPerformer
                  });

                  return (
                    <div
                      className="performer-card"
                      key={performerId}
                      style={{
                        borderColor: `${event.color || DEFAULT_COLOR}66`,
                      }}
                    >
                      <div
                        className="performer-image-container"
                        style={{ borderColor: event.color }}
                      >
                        <img
                          src={performerImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(performerName)}&background=${event.color?.substring(1) || '3357FF'}&color=fff`}
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
                      <div className="sponsor-fallback-name">
                        {sponsor.name}
                      </div>
                    )}
                    <div className="sponsor-details">
                      <h3 className="sponsor-name">{sponsor.name}</h3>
                      <p className={`sponsor-level ${(sponsor.level || 'partner').toLowerCase()}`}>
                        {sponsor.level || 'Partner'}
                      </p>
                      {sponsor.description && (
                        <p className="sponsor-description">{sponsor.description}</p>
                      )}
                      {sponsor.website && (
                        <a
                          href={sponsor.website}
                          className="sponsor-website"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
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
                <button
                  className={`spotify-button ${isSpotifyPlaying ? 'playing' : ''}`}
                  onClick={handleToggleSpotify}
                >
                  {isSpotifyPlaying ? 'Pause' : 'Play'} Soundtrack
                </button>
                <button
                  className="spotify-expand-button"
                  onClick={handleExpandSpotify}
                >
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
              <ImageSlideshow
                images={slideshowImages}
                height={400}
                interval={5000}
                showGradient={true}
              />
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
