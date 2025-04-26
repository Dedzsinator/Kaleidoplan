import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getEvents } from '../../services/eventService';
import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';
import EventSection from '../components/layout/EventSection';
import UserWelcomeCard from '../components/user/UserWelcomeCard';
import QuickActions from '../components/user/QuicActions';
import '../styles/Guest.css';
import '../styles/HomeScreen.css';

// Event type import
import { Event, User } from '../models/types';

// Constants
const DEFAULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80';
const HEADER_OFFSET = 100;

// View modes
type ViewMode = 'card' | 'detailed';

const HomeScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerOpacity, setHeaderOpacity] = useState(0.8);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Use ref for currentVisibleEvent to avoid triggering renders
  const currentVisibleEventRef = useRef<{ id: string; name: string }>({ id: '', name: '' });

  // Refs for section positions
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Flag to control re-fetches
  const hasLoadedEvents = useRef(false);

  // Create an adapter user for components that need the exact User type
  const adaptedUser: User | null = user
    ? {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        role: user.role || 'user',
      }
    : null;

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Define validateEvent before fetchEvents since fetchEvents depends on it
  const validateEvent = useCallback((event: Event, index: number): Event | null => {
    if (!event) return null;

    // Create a shallow copy to avoid mutating the original
    const validatedEvent = { ...event };

    // Add validation logic here (similar to GuestScreen)

    return validatedEvent;
  }, []);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      const fetchedEvents = await getEvents({ forceRefresh: true });

      const validatedEvents = fetchedEvents
        .map((event, index) => validateEvent(event, index))
        .filter(Boolean) as Event[];

      setEvents(validatedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [validateEvent]);

  // Fetch events once on mount
  useEffect(() => {
    if (!hasLoadedEvents.current) {
      fetchEvents();
      hasLoadedEvents.current = true;
    }
  }, [fetchEvents]);

  // Scroll handler with throttling
  useEffect(() => {
    const throttledScroll = () => {
      const position = window.scrollY;
      const newOpacity = Math.min(0.8 + (position / HEADER_OFFSET) * 0.2, 1);
      setHeaderOpacity(newOpacity);
      setScrollPosition(position);
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
  }, []);

  // Handle visibility changes for events
  const handleVisibilityChange = useCallback(
    (isVisible: boolean, eventId: string) => {
      if (!eventId) return;

      if (isVisible) {
        setActiveEventId((prevId) => (prevId !== eventId ? eventId : prevId));

        const event = events.find((e) => e.id === eventId);
        if (event && currentVisibleEventRef.current.id !== eventId) {
          currentVisibleEventRef.current = {
            id: eventId,
            name: event.name || 'Unknown Event',
          };
        }
      } else if (activeEventId === eventId) {
        setActiveEventId(null);
      }
    },
    [activeEventId, events],
  );

  const handleEventClick = useCallback(
    (eventId: string) => {
      navigate(`/events/${eventId}`);
    },
    [navigate],
  );

  const handleImageError = useCallback((eventId: string) => {}, []);

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
        <p className="loading-text">Loading your personalized event feed...</p>
      </div>
    );
  }

  // For hero section
  const heroEvent = events.find((event) => event.coverImageUrl) || events[0];
  const heroImageUrl = heroEvent?.coverImageUrl || DEFAULT_IMAGE_URL;

  return (
    <div className="home-screen">
      {/* Fixed NavBar - will automatically display user profile since user is authenticated */}
      <NavBar opacity={headerOpacity} />

      {/* Hero Section */}
      <div className="hero-section" style={{ backgroundImage: `url(${heroImageUrl})` }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Your Personal Event Dashboard</h1>
          <p className="hero-subtitle">View and manage your events</p>
        </div>
      </div>

      {/* Welcome Cards Section */}
      <div className="welcome-section">
        {adaptedUser && <UserWelcomeCard user={adaptedUser} />}
        {adaptedUser && (
          <QuickActions user={adaptedUser} onLogout={handleLogout} onNavigate={(path: string) => navigate(path)} />
        )}
      </div>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-header">
          <h2 className="content-title">Your Events</h2>
          <p className="content-subtitle">Discover upcoming and ongoing experiences</p>
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
            <p className="no-events-text">No events found. Check back soon for new events!</p>
          </div>
        ) : (
          <div className={viewMode === 'card' ? 'card-events-container' : 'detailed-events-container'}>
            {renderEventItems()}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomeScreen;
