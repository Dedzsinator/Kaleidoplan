import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getEvents } from '../../services/eventService';
import { filterEventsByProximity, getCurrentLocation, Coordinates } from '../../services/filterService';
import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';
import EventSection from '../components/layout/EventSection';
import SpotifyRadioOverlay from '../components/actions/SpotifyRadioOverlay';
import '../styles/Guest.css';

// Event type import
import { Event } from '../models/types';
import { hexToRgb, interpolateColors } from '../hooks/useColor';

// Constants
const DEFAULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80';
const HEADER_OFFSET = 100;
const DEFAULT_COLOR = '#3357FF';
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1080&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1080&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1080&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1080&auto=format&fit=crop',
];

// View modes
type ViewMode = 'card' | 'detailed';

const GuestScreen = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerOpacity, setHeaderOpacity] = useState(0.8);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [isOverlayExpanded, setIsOverlayExpanded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [filterApplied, setFilterApplied] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<{
    search?: string;
    nearbyLocation?: Coordinates;
    radius?: number;
  }>({});
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  // Gradient transition states
  const [backgroundGradient, setBackgroundGradient] = useState('linear-gradient(to bottom, rgba(51, 87, 255, 0.2), rgba(51, 87, 255, 0.05))');
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR);
  const [nextColor, setNextColor] = useState(DEFAULT_COLOR);
  const [transitionProgress, setTransitionProgress] = useState(0);

  const visibleEventsRef = useRef<{
    [id: string]: {
      element: HTMLElement,
      color: string,
      top: number,
      height: number,
      visible: boolean
    }
  }>({});

  const navigate = useNavigate();

  // Use ref for currentVisibleEvent to avoid triggering renders
  const currentVisibleEventRef = useRef<{ id: string; name: string }>({ id: '', name: '' });

  // Refs for section positions
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Flag to control re-fetches
  const hasLoadedEvents = useRef(false);

  // Define validateEvent before fetchEvents since fetchEvents depends on it
  const validateEvent = useCallback((event: any, index: number): Event | null => {
    if (!event) {
      console.error(`Invalid event data at position ${index}`);
      return null;
    }

    // Create a shallow copy to avoid mutating the original
    const validatedEvent = { ...event };

    if (!validatedEvent.id && validatedEvent._id) {
      validatedEvent.id = validatedEvent._id;
    }

    // Ensure we have a playlistId for Spotify integration
    if (!validatedEvent.playlistId) {
      validatedEvent.playlistId = `pl-${validatedEvent.id || `temp-${index}`}`;
    }

    if (!validatedEvent.id) {
      // Generate a valid MongoDB-like ID (24 hex chars)
      const randomId = Array.from({ length: 24 }, () =>
        Math.floor(Math.random() * 16).toString(16)).join('');
      validatedEvent.id = `demo-${randomId}`;
    }

    if (!validatedEvent.name) {
      validatedEvent.name = 'Unnamed Event';
    }

    if (validatedEvent.coverImage && !validatedEvent.coverImageUrl) {
      validatedEvent.coverImageUrl = validatedEvent.coverImage;
    }

    if (
      !validatedEvent.coverImageUrl ||
      typeof validatedEvent.coverImageUrl !== 'string' ||
      validatedEvent.coverImageUrl.trim() === ''
    ) {
      validatedEvent.coverImageUrl = PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
    }

    // Ensure every event has a color
    if (!validatedEvent.color) {
      // Generate a consistent color based on the event ID or index
      const colors = ['#3357FF', '#FF5733', '#33FF57', '#FF33A8', '#33A8FF', '#A833FF'];
      validatedEvent.color = colors[index % colors.length];
    }

    if (validatedEvent.slideshowImages) {
      if (typeof validatedEvent.slideshowImages === 'string') {
        validatedEvent.slideshowImages = validatedEvent.slideshowImages
          .split(',')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0);
      } else if (
        Array.isArray(validatedEvent.slideshowImages) &&
        validatedEvent.slideshowImages.length === 1 &&
        typeof validatedEvent.slideshowImages[0] === 'string' &&
        validatedEvent.slideshowImages[0].includes(',')
      ) {
        validatedEvent.slideshowImages = validatedEvent.slideshowImages[0]
          .split(',')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0);
      }

      if (Array.isArray(validatedEvent.slideshowImages)) {
        validatedEvent.slideshowImages = validatedEvent.slideshowImages
          .filter((url: string) => typeof url === 'string' && url.trim().length > 0)
          .map((url: string) => url.trim());
      }
    }

    if (
      !validatedEvent.slideshowImages ||
      !Array.isArray(validatedEvent.slideshowImages) ||
      validatedEvent.slideshowImages.length === 0
    ) {
      if (validatedEvent.coverImageUrl) {
        validatedEvent.slideshowImages = [validatedEvent.coverImageUrl];
      } else {
        // Add a fallback image if no slideshowImages and no coverImageUrl
        validatedEvent.slideshowImages = [PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length]];
      }
    }

    return validatedEvent;
  }, []);

  // Create demo events if no real events are available
  const createDemoEvents = useCallback(() => {
    console.log('Creating demo events');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    const demoEvents = [
      {
        id: 'demo-1',
        name: 'Music Festival',
        description: 'A weekend of amazing music performances',
        location: 'City Park',
        startDate: tomorrow,
        endDate: nextWeek,
        coverImageUrl: PLACEHOLDER_IMAGES[0],
        slideshowImages: [PLACEHOLDER_IMAGES[0]],
        status: 'upcoming',
        playlistId: 'pl-demo-1',
        color: '#3357FF',
      },
      {
        id: 'demo-2',
        name: 'Tech Conference',
        description: 'Learn about the latest technology trends',
        location: 'Convention Center',
        startDate: tomorrow,
        endDate: nextWeek,
        coverImageUrl: PLACEHOLDER_IMAGES[1],
        slideshowImages: [PLACEHOLDER_IMAGES[1]],
        status: 'upcoming',
        playlistId: 'pl-demo-2',
        color: '#FF5733',
      },
      {
        id: 'demo-3',
        name: 'Food Festival',
        description: 'Taste cuisine from around the world',
        location: 'Downtown Square',
        startDate: tomorrow,
        endDate: nextWeek,
        coverImageUrl: PLACEHOLDER_IMAGES[2],
        slideshowImages: [PLACEHOLDER_IMAGES[2]],
        status: 'upcoming',
        playlistId: 'pl-demo-3',
        color: '#33FF57',
      },
    ] as Event[];

    setEvents(demoEvents);
  }, []);

  const applyFilters = useCallback(() => {
    // Start with all events
    let filtered = [...events];
    let hasFilter = false;

    // Apply search filter if present
    const searchTerm = searchParams.get('search');
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      hasFilter = true;
      setFilterCriteria(prev => ({ ...prev, search: searchTerm }));
    }

    // Apply location filter if present
    const hasNearbyFilter = searchParams.get('near') === 'true';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');

    if (hasNearbyFilter && lat && lng) {
      const userLocation = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng)
      };

      const radiusValue = radius ? parseInt(radius) : 300;

      filtered = filterEventsByProximity(filtered, userLocation, radiusValue);
      hasFilter = true;
      setFilterCriteria(prev => ({
        ...prev,
        nearbyLocation: userLocation,
        radius: radiusValue
      }));
    }

    setFilteredEvents(filtered);
    setFilterApplied(hasFilter);
  }, [events, searchParams]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching events from service...');

      // First try the standard API endpoint through eventService
      const fetchedEvents = await getEvents({ forceRefresh: true });
      console.log('Received events:', fetchedEvents.length);

      if (fetchedEvents.length > 0) {
        // Validate and format each event
        const validatedEvents = fetchedEvents
          .map((event, index) => validateEvent(event, index))
          .filter(Boolean) as Event[];

        // Store all events in session storage for detail view
        sessionStorage.setItem('all-events', JSON.stringify(validatedEvents));
        setEvents(validatedEvents);
      } else {
        // If no events from the main API, use demo events as fallback
        console.log('No events available, creating demo events');
        createDemoEvents();
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again later.');
      createDemoEvents();
    } finally {
      setLoading(false);
    }
  }, [validateEvent, createDemoEvents]);

  const handleVisibilityChange = useCallback((isVisible: boolean, eventId: string, element: HTMLElement | null) => {
    if (!eventId || !element) return;

    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const eventColor = event.color || DEFAULT_COLOR;
    const rect = element.getBoundingClientRect();

    // Update our reference of visible events
    visibleEventsRef.current[eventId] = {
      element,
      color: eventColor,
      top: rect.top,
      height: rect.height,
      visible: isVisible
    };

    if (isVisible) {
      setActiveEventId(eventId);
    }

    // Update colors based on visible events
    updateGradientColors();
  }, [events]);

  const updateGradientColors = useCallback(() => {
    const visibleEvents = Object.values(visibleEventsRef.current).filter(e => e.visible);
    if (visibleEvents.length === 0) return;

    // Sort by position (top to bottom)
    visibleEvents.sort((a, b) => a.top - b.top);

    // Find which event is most centered in the viewport
    const viewportCenter = window.innerHeight / 2;
    let closestEvent = visibleEvents[0];
    let minDistance = Math.abs(closestEvent.top - viewportCenter);

    for (const event of visibleEvents) {
      const distance = Math.abs(event.top - viewportCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestEvent = event;
      }
    }

    // Find next event (if any)
    const currentIndex = visibleEvents.indexOf(closestEvent);
    const hasNextEvent = currentIndex < visibleEvents.length - 1;
    const nextEvent = hasNextEvent ? visibleEvents[currentIndex + 1] : null;

    // Calculate transition progress between current and next event
    if (nextEvent) {
      const currentEventPosition = closestEvent.top + closestEvent.height / 2;
      const nextEventPosition = nextEvent.top + nextEvent.height / 2;
      const totalDistance = nextEventPosition - currentEventPosition;

      // If the events are far apart, only start transition when closer
      const transitionZone = Math.min(totalDistance, window.innerHeight * 0.7);
      const viewportCenter = window.scrollY + window.innerHeight / 2;

      let progress = 0;
      if (viewportCenter > currentEventPosition) {
        progress = Math.min(1, (viewportCenter - currentEventPosition) / transitionZone);
      }

      setCurrentColor(closestEvent.color);
      setNextColor(nextEvent.color);
      setTransitionProgress(progress);
    } else {
      // Just use the current event's color
      setCurrentColor(closestEvent.color);
      setNextColor(closestEvent.color);
      setTransitionProgress(0);
    }
  }, [scrollPosition]);

  const handleAroundMe = useCallback(() => {
    setIsLocationLoading(true);

    // Show a visible loading indicator
    const loadingToast = document.createElement('div');
    loadingToast.className = 'location-toast';
    loadingToast.innerHTML = `
    <div class="location-toast-inner">
      <div class="location-spinner"></div>
      <span>Finding your location...</span>
    </div>
  `;
    document.body.appendChild(loadingToast);

    // Function to apply location filter
    const applyLocationFilter = (latitude: number, longitude: number, source: string) => {
      console.log(`Got location from ${source}: ${latitude}, ${longitude}`);

      // Filter events by proximity
      const filtered = filterEventsByProximity(
        events,
        { latitude, longitude },
        300
      );

      // Update state
      setFilteredEvents(filtered);
      setFilterApplied(true);
      setFilterCriteria(prev => ({
        ...prev,
        nearbyLocation: { latitude, longitude },
        radius: 300
      }));

      // Update URL params
      setSearchParams({
        near: 'true',
        lat: latitude.toString(),
        lng: longitude.toString(),
        radius: '300'
      });

      // Clean up
      document.body.removeChild(loadingToast);
      setIsLocationLoading(false);
    };

    // Function to handle failure
    const handleFailure = (error: any) => {
      console.error('Error getting location:', error);

      // Try IP-based geolocation as last resort
      fetch('https://ipapi.co/json/')
        .then(response => response.json())
        .then(data => {
          if (data.latitude && data.longitude) {
            applyLocationFilter(data.latitude, data.longitude, 'IP geolocation');

            // Show notification about less accurate location
            const noticeToast = document.createElement('div');
            noticeToast.className = 'notice-toast';
            noticeToast.innerHTML = `
            <div class="notice-toast-inner">
              <i class="fa fa-info-circle"></i>
              <span>Using approximate location based on your IP address.</span>
              <button class="close-toast">×</button>
            </div>
          `;
            document.body.appendChild(noticeToast);

            noticeToast.querySelector('.close-toast')?.addEventListener('click', () => {
              document.body.removeChild(noticeToast);
            });

            setTimeout(() => {
              if (document.body.contains(noticeToast)) {
                document.body.removeChild(noticeToast);
              }
            }, 8000);
          } else {
            showErrorMessage("Couldn't determine your location automatically.");
          }
        })
        .catch(() => {
          showErrorMessage("Couldn't determine your location. Please try again later.");
        });
    };

    // Function to show error message
    const showErrorMessage = (message: string) => {
      document.body.removeChild(loadingToast);
      setIsLocationLoading(false);

      const errorToast = document.createElement('div');
      errorToast.className = 'error-toast';
      errorToast.innerHTML = `
      <div class="error-toast-inner">
        <i class="fa fa-exclamation-circle"></i>
        <span>${message}</span>
        <button class="close-toast">×</button>
      </div>
    `;
      document.body.appendChild(errorToast);

      errorToast.querySelector('.close-toast')?.addEventListener('click', () => {
        document.body.removeChild(errorToast);
      });

      setTimeout(() => {
        if (document.body.contains(errorToast)) {
          document.body.removeChild(errorToast);
        }
      }, 8000);
    };

    // Try browser geolocation first
    getCurrentLocation()
      .then(coords => {
        applyLocationFilter(coords.latitude, coords.longitude, 'browser geolocation');
      })
      .catch(handleFailure);

  }, [events, setSearchParams, filterEventsByProximity]);

  useEffect(() => {
    try {
      const startRgb = hexToRgb(currentColor) || hexToRgb(DEFAULT_COLOR);
      const endRgb = hexToRgb(nextColor) || hexToRgb(DEFAULT_COLOR);

      if (startRgb && endRgb) {
        const interpolatedColor = interpolateColors(startRgb, endRgb, transitionProgress);
        const gradient = `linear-gradient(to bottom, 
          rgba(${interpolatedColor.r}, ${interpolatedColor.g}, ${interpolatedColor.b}, 0.2), 
          rgba(${interpolatedColor.r}, ${interpolatedColor.g}, ${interpolatedColor.b}, 0.05))`;

        setBackgroundGradient(gradient);
      }
    } catch (error) {
      console.error('Error updating gradient:', error);
    }
  }, [currentColor, nextColor, transitionProgress]);

  useEffect(() => {
    const throttledScroll = () => {
      const position = window.scrollY;
      const newOpacity = Math.min(0.8 + (position / HEADER_OFFSET) * 0.2, 1);
      setHeaderOpacity(newOpacity);
      setScrollPosition(position);

      // Update event visibility measurements
      Object.keys(visibleEventsRef.current).forEach(id => {
        const eventInfo = visibleEventsRef.current[id];
        if (eventInfo.element) {
          const rect = eventInfo.element.getBoundingClientRect();
          eventInfo.top = rect.top;
        }
      });

      // Update color gradient
      updateGradientColors();
    };

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          throttledScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateGradientColors]);

  useEffect(() => {
    if (!hasLoadedEvents.current) {
      fetchEvents();
      hasLoadedEvents.current = true;
    }
  }, [fetchEvents]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters, events, searchParams]);

  const handleEventClick = useCallback(
    (eventId: string) => {
      navigate(`/events/${eventId}`);
    },
    [navigate],
  );

  const navigateToRandomEvent = useCallback(() => {
    if (events.length > 0) {
      const randomIndex = Math.floor(Math.random() * events.length);
      const randomEvent = events[randomIndex];

      // Ensure the event is stored in session storage before navigating
      try {
        const allEventsStr = sessionStorage.getItem('all-events') || '[]';
        const allEvents = JSON.parse(allEventsStr);

        // If event is not already in storage, add it
        if (!allEvents.find((e: any) => e.id === randomEvent.id)) {
          allEvents.push(randomEvent);
          sessionStorage.setItem('all-events', JSON.stringify(allEvents));
        }
      } catch (e) {
        // Fallback - just store this event
        sessionStorage.setItem('all-events', JSON.stringify([randomEvent]));
      }

      console.log(`Navigating to random event: ${randomEvent.id}`);
      navigate(`/events/${randomEvent.id}`);
    } else {
      window.scrollTo({ top: 600, behavior: 'smooth' });
    }
  }, [events, navigate]);

  const handleImageError = useCallback((eventId: string) => {
    console.log(`Failed to load image for event: ${eventId}`);
  }, []);

  // Toggle between card view and detailed view
  const toggleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // New handlers for Spotify Radio Overlay
  const handleToggleRadioPlay = useCallback(() => {
    setIsRadioPlaying((prev) => !prev);
  }, []);

  const handleToggleOverlayExpand = useCallback(() => {
    setIsOverlayExpanded((prev) => !prev);
  }, []);

  const eventsToDisplay = filterApplied ? filteredEvents : events;

  const clearFilters = useCallback(() => {
    setSearchParams({});
    setFilterApplied(false);
    setFilterCriteria({});
  }, [setSearchParams]);

  const renderEventItems = useCallback(() => {
    return eventsToDisplay.map((event, index) => (
      <EventSection
        key={event.id}
        event={event}
        navigation={{ navigate }}
        onImageError={handleImageError}
        index={index}
        scrollY={scrollPosition}
        sectionY={index * 100}
        onVisibilityChange={handleVisibilityChange}
      />
    ));
  }, [eventsToDisplay, scrollPosition, handleVisibilityChange, handleImageError, navigate]);

  const currentActiveEvent = events.find((event) => event.id === activeEventId);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Discovering extraordinary events...</p>
      </div>
    );
  }

  // For hero section
  const heroEvent = events.find((event) => event.coverImageUrl) || events[0];
  const heroImageUrl = heroEvent?.coverImageUrl || DEFAULT_IMAGE_URL;

  return (
    <div className="guest-screen">
      {/* Gradient background overlay - this is the missing element */}
      <div
        className="color-gradient-background"
        style={{
          background: backgroundGradient,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          transition: 'background 0.8s ease-out'
        }}
      />

      {/* Hero Section */}
      <div className="hero-section" style={{ backgroundImage: `url(${heroImageUrl})` }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Discover Amazing Events</h1>
          <p className="hero-subtitle">Find the perfect event for your interests</p>
          <button className="hero-button" onClick={navigateToRandomEvent}>
            Explore Events
          </button>
        </div>
      </div>

      <NavBar
        opacity={headerOpacity}
        onSearch={(term) => {
          setSearchParams({ search: term });
        }}
        onAroundMe={handleAroundMe}
        isLocationLoading={isLocationLoading}
      />

      {/* Main Content */}
      <main className="main-content">
        <div className="content-header">
          <h2 className="content-title">Events Calendar</h2>
          <p className="content-subtitle">Explore upcoming and ongoing experiences</p>
          {error && <p className="error-message">{error}</p>}

          {/* View Mode Selector */}
          <div className="view-mode-selector">
            <button
              className={`view-mode-button ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => toggleViewMode('card')}
            >
              <span className="icon">📇</span>
              <span className="label">Card View</span>
            </button>
            <button
              className={`view-mode-button ${viewMode === 'detailed' ? 'active' : ''}`}
              onClick={() => toggleViewMode('detailed')}
            >
              <span className="icon">📋</span>
              <span className="label">Detailed View</span>
            </button>
          </div>

          {filterApplied && (
            <div className="filter-indicators">
              {filterCriteria.search && (
                <div className="filter-badge">
                  <i className="fa fa-search"></i>
                  <span>{filterCriteria.search}</span>
                  <button
                    className="clear-filter"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('search');
                      setSearchParams(newParams);
                    }}
                    aria-label="Clear search filter"
                  >
                    ×
                  </button>
                </div>
              )}

              {filterCriteria.nearbyLocation && (
                <div className="filter-badge">
                  <i className="fa fa-map-marker-alt"></i>
                  <span>
                    Within {filterCriteria.radius}km
                    {isLocationLoading && <span className="loading-dot-animation"></span>}
                  </span>
                  <button
                    className="clear-filter"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('near');
                      newParams.delete('lat');
                      newParams.delete('lng');
                      newParams.delete('radius');
                      setSearchParams(newParams);
                    }}
                    aria-label="Clear location filter"
                  >
                    ×
                  </button>
                </div>
              )}

              <button className="clear-all-filters" onClick={clearFilters}>
                <i className="fa fa-times-circle"></i>
                Clear All
              </button>
            </div>
          )}

        </div>

        {eventsToDisplay.length === 0 ? (
          <div className="no-events-container">
            {filterApplied ? (
              <>
                <p className="no-events-text">No events match your search criteria.</p>
                <button className="clear-filters-button" onClick={clearFilters}>Clear Filters</button>
              </>
            ) : (
              <p className="no-events-text">No events found. Check back soon for new events!</p>
            )}
          </div>
        ) : (
          <div className={viewMode === 'card' ? 'card-events-container' : 'detailed-events-container'}>
            {renderEventItems()}
          </div>
        )}
      </main>


      {/* Spotify Radio Overlay 
      {currentActiveEvent && (
        <SpotifyRadioOverlay
          currentEvent={currentActiveEvent}
          isPlaying={isRadioPlaying}
          onTogglePlay={handleToggleRadioPlay}
          onExpand={handleToggleOverlayExpand}
          expanded={isOverlayExpanded}
        />
      )}
      */}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default GuestScreen;
