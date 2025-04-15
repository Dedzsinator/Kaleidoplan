import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../../services/eventService';
import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';
import EventSection from '../components/layout/EventSection';
import '../styles/Guest.css';

// Event type import
import { Event } from '../models/types';

// Constants
const DEFAULT_IMAGE_URL = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80';
const HEADER_OFFSET = 100;

// View modes
type ViewMode = 'card' | 'detailed';

const GuestScreen = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerOpacity, setHeaderOpacity] = useState(0.8);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('card'); // Default to card view
  const navigate = useNavigate();

  // Use ref for currentVisibleEvent to avoid triggering renders
  const currentVisibleEventRef = useRef<{ id: string, name: string }>({ id: '', name: '' });

  // Refs for section positions
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Flag to control re-fetches
  const hasLoadedEvents = useRef(false);

  // Visibility change handler with stable reference
  const handleVisibilityChange = useCallback((isVisible: boolean, eventId: string) => {
    // Skip if we don't have an event ID
    if (!eventId) return;

    if (isVisible) {
      setActiveEventId(prevId => {
        // Only update if changed
        return prevId !== eventId ? eventId : prevId;
      });

      // Update ref instead of state to avoid re-renders
      const event = events.find(e => e.id === eventId);
      if (event && currentVisibleEventRef.current.id !== eventId) {
        currentVisibleEventRef.current = {
          id: eventId,
          name: event.name || 'Unknown Event'
        };
      }
    } else if (activeEventId === eventId) {
      // Only unset if this event was the active one
      setActiveEventId(null);
    }
  }, [activeEventId, events]);

  // Scroll handler with throttling
  useEffect(() => {
    const throttledScroll = () => {
      const position = window.scrollY;
      const newOpacity = Math.min(0.8 + (position / HEADER_OFFSET) * 0.2, 1);
      setHeaderOpacity(newOpacity);
      setScrollPosition(position);
    };

    // Throttle scroll events
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
  }, []); // Empty dependency - only run once

  // Fetch events once on mount
  useEffect(() => {
    if (!hasLoadedEvents.current) {
      fetchEvents();
      hasLoadedEvents.current = true;
    }
  }, []);

  // Event validator with memoization
  const validateEvent = useCallback((event: any, index: number): Event | null => {
    if (!event) {
      console.error(`Invalid event data at position ${index}`);
      return null;
    }

    // Create a shallow copy to avoid mutating the original
    const validatedEvent = { ...event };

    if (!validatedEvent.playlistId) {
      validatedEvent.playlistId = `pl${validatedEvent.id || index + 1}`;
    }

    if (!validatedEvent.id) {
      validatedEvent.id = `temp-id-${index}`;
    }

    if (!validatedEvent.name) {
      validatedEvent.name = "Unnamed Event";
    }

    if (validatedEvent.coverImage && !validatedEvent.coverImageUrl) {
      validatedEvent.coverImageUrl = validatedEvent.coverImage;
    }

    if (!validatedEvent.coverImageUrl ||
      typeof validatedEvent.coverImageUrl !== 'string' ||
      validatedEvent.coverImageUrl.trim() === '') {
      const placeholderImages = [
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1080&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1080&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1080&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1080&auto=format&fit=crop'
      ];
      validatedEvent.coverImageUrl = placeholderImages[index % placeholderImages.length];
    }

    if (validatedEvent.slideshowImages) {
      if (typeof validatedEvent.slideshowImages === 'string') {
        validatedEvent.slideshowImages = validatedEvent.slideshowImages
          .split(',')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0);
      } else if (Array.isArray(validatedEvent.slideshowImages) &&
        validatedEvent.slideshowImages.length === 1 &&
        typeof validatedEvent.slideshowImages[0] === 'string' &&
        validatedEvent.slideshowImages[0].includes(',')) {
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

    if (!validatedEvent.slideshowImages ||
      !Array.isArray(validatedEvent.slideshowImages) ||
      validatedEvent.slideshowImages.length === 0) {
      if (validatedEvent.coverImageUrl) {
        validatedEvent.slideshowImages = [validatedEvent.coverImageUrl];
      }
    }

    return validatedEvent;
  }, []);

  const fetchEvents = async () => {
    try {
      setError(null);

      // Only force refresh on initial load or explicit refresh action
      const forceRefresh = !events.length;
      const eventsData = await getEvents({ forceRefresh });

      const validEvents = eventsData
        .map((event: any, index: number) => validateEvent(event, index))
        .filter((event: Event | null) => event !== null) as Event[];

      setEvents(validEvents);
      if (validEvents.length === 0) {
        setError('No valid events found');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = useCallback((eventId: string) => {
    navigate(`/events/${eventId}`);
  }, [navigate]);

  const handleImageError = useCallback((eventId: string) => {
    console.log(`Failed to load image for event: ${eventId}`);
  }, []);

  // Toggle between card view and detailed view
  const toggleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // Memoize event items creation to prevent unnecessary re-creation
  const renderEventItems = useCallback(() => {
    return events.map((event, index) => (
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
  }, [events, scrollPosition, handleVisibilityChange, handleImageError, navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Discovering extraordinary events...</p>
      </div>
    );
  }

  // For hero section
  const heroEvent = events.find(event => event.coverImageUrl) || events[0];
  const heroImageUrl = heroEvent?.coverImageUrl || DEFAULT_IMAGE_URL;

  return (
    <div className="guest-screen">
      {/* Hero Section */}
      <div className="hero-section" style={{ backgroundImage: `url(${heroImageUrl})` }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Discover Amazing Events</h1>
          <p className="hero-subtitle">Find the perfect event for your interests</p>
          <button className="hero-button" onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}>
            Explore Events
          </button>
        </div>
      </div>

      {/* Fixed NavBar */}
      <NavBar opacity={headerOpacity} />

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
        </div>

        {events.length === 0 ? (
          <div className="no-events-container">
            <p className="no-events-text">
              No events found. Check back soon for new events!
            </p>
          </div>
        ) : (
          <div className={viewMode === 'card' ? "card-events-container" : "detailed-events-container"}>
            {renderEventItems()}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default GuestScreen;