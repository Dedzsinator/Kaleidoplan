import React, { useRef, useEffect, useState, memo } from 'react';
import AnimatedSection from '../ui/AnimatedSection';
import EventPrimaryContent from '../ui/EventPrimaryContent';
import EventSecondaryContent from '../ui/EventSecondaryContent';
import Map from '../Map';
import ImageSlideshow from '../ui/SlideShow';
import '../../styles/EventSection.css';
import { Event } from '@models/types';
import '../../styles/animations.css';

// Helper to ensure we always have a string ID
const ensureEventId = (event: Event): string => {
  return event.id || event._id || `temp-${Math.random().toString(36).substring(2, 9)}`;
};

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface EventSectionProps {
  event: Event;
  navigation: { navigate: (path: string) => void };
  onVisibilityChange?: (isVisible: boolean, eventId: string, element: HTMLElement | null) => void;
  onImageError?: (eventId: string) => void;
  index: number;
  scrollY: number;
  sectionY?: number;
}

interface EventSectionProps {
  event: Event;
  navigation: { navigate: (path: string) => void };
  onVisibilityChange?: (isVisible: boolean, eventId: string, element: HTMLElement | null) => void;
  onImageError?: (eventId: string) => void;
  index: number;
  scrollY: number;
  sectionY?: number;
}

const hexToRgba = (hex: string, alpha: number = 1): string => {
  hex = hex.replace('#', '');

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const EventSection = memo(
  ({ event, navigation, onImageError, index, scrollY, sectionY = 0, onVisibilityChange }: EventSectionProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const delay = index * 150;
    const isVisibleRef = useRef(false);
    const [sectionHeight, setSectionHeight] = useState(0);
    const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
    const [locationError, setLocationError] = useState('');

    const eventIdRef = useRef(event?.id);

    const definiteEventId = ensureEventId(event);

    if (event?.id !== eventIdRef.current) {
      eventIdRef.current = event?.id;
    }

    useEffect(() => {
      if (containerRef.current) {
        const observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
            setSectionHeight(entry.contentRect.height);
          }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
      }
    }, []);

    // Calculate visibility and call the callback
    useEffect(() => {
      const calculateVisibility = () => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const visibilityThreshold = windowHeight * 0.3; // Consider visible when 30% in viewport

        // Calculate how much of the section is in the viewport
        const inViewportTop = Math.min(windowHeight, Math.max(0, rect.bottom));
        const inViewportBottom = Math.max(0, Math.min(windowHeight, rect.top));
        const inViewport = inViewportTop - inViewportBottom;

        // Calculate visibility percentage
        const visibilityPercentage = inViewport / rect.height;
        const isVisible = visibilityPercentage >= 0.3;

        // Only call callback when visibility state changes
        if (isVisible !== isVisibleRef.current) {
          isVisibleRef.current = isVisible;
          if (onVisibilityChange) {
            onVisibilityChange(isVisible, definiteEventId, containerRef.current);
          }
        }
      };

      calculateVisibility();

      // Store reference to the current container element
      const currentContainerRef = containerRef.current;

      // Also recalculate on scroll
      window.addEventListener('scroll', calculateVisibility);
      return () => window.removeEventListener('scroll', calculateVisibility);
    }, [event.id, onVisibilityChange, sectionHeight, definiteEventId]);

    useEffect(() => {
      // Skip if we don't have location info or we already have map data
      if (
        (!event?.location && !(event?.latitude && event?.longitude)) ||
        (mapRegion && event?.latitude === mapRegion.latitude && event?.longitude === mapRegion.longitude)
      ) {
        return;
      }

      const getLocation = async () => {
        // First check if we already have coordinates in the event object
        if (event?.latitude && event?.longitude) {
          setMapRegion({
            latitude: event.latitude,
            longitude: event.longitude,
            latitudeDelta: event.latitudeDelta || 0.01,
            longitudeDelta: event.longitudeDelta || 0.01,
          });
          setLocationError('');
          return;
        }

        // Fall back to geocoding if we don't have coordinates
        if (event?.location) {
          try {
            const cachedLocation = sessionStorage.getItem(`geo_${event.location}`);
            if (cachedLocation) {
              const { lat, lon } = JSON.parse(cachedLocation);
              setMapRegion({
                latitude: parseFloat(lat),
                longitude: parseFloat(lon),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
              return;
            }

            // For web, we need to use a geocoding API with caching
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(event.location)}`,
            );

            const data = await response.json();

            if (data && data.length > 0) {
              const { lat, lon } = data[0];
              // Cache the result
              sessionStorage.setItem(`geo_${event.location}`, JSON.stringify({ lat, lon }));

              setMapRegion({
                latitude: parseFloat(lat),
                longitude: parseFloat(lon),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
              setLocationError('');
            } else {
              setLocationError('Location not found');
            }
          } catch (error) {
            console.error('Error getting location:', error);
            setLocationError('Error getting location');
          }
        }
      };

      // Debounce location fetching
      const timerId = setTimeout(getLocation, 300);
      return () => clearTimeout(timerId);
    }, [event?.location, event?.latitude, event?.longitude, event?.latitudeDelta, event?.longitudeDelta, mapRegion]);

    // Get color from event, or use a default
    const eventColor = event?.color || '#3357FF';

    // Create CSS variable styles for the event color
    const colorStyles = {
      '--event-color': eventColor,
      '--event-glow-filter': `drop-shadow(0 0 8px ${hexToRgba(eventColor, 0.7)})`,
      '--event-box-shadow': `0 0 20px ${hexToRgba(eventColor, 0.3)}, 
                             inset 0 0 20px ${hexToRgba(eventColor, 0.1)}`,
      '--event-border-color': hexToRgba(eventColor, 0.3),
      '--event-wave-color': hexToRgba(eventColor, 0.15),
    } as React.CSSProperties;

    // Log the color for debugging
    useEffect(() => {}, [event.id, eventColor]);

    const delayClass = `delay-${Math.min(index % 5, 4)}`;

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const isNowVisible = entry.isIntersecting;
            setIsVisible(isNowVisible);

            // Only animate once when it becomes visible
            if (isNowVisible && !hasAnimated) {
              setHasAnimated(true);
            }

            // Call the original visibility handler
            if (onVisibilityChange) {
              onVisibilityChange(isNowVisible, definiteEventId, containerRef.current);
            }
          });
        },
        {
          threshold: 0.1, // Trigger when at least 10% is visible
          rootMargin: '0px 0px -10% 0px', // Start animation slightly before element enters viewport
        },
      );

      // Capture the current ref value
      const currentRef = containerRef.current;

      if (currentRef) {
        observer.observe(currentRef);
      }

      return () => {
        if (currentRef) {
          observer.unobserve(currentRef);
        }
      };
    }, [event.id, hasAnimated, onVisibilityChange, definiteEventId]);

    // Calculate animation classes
    const animationClasses = hasAnimated ? `fade-in-up ${delayClass}` : 'initially-hidden';

    return (
      <div
        ref={containerRef}
        className={`event-section-container ${animationClasses}`}
        style={colorStyles}
        data-event-id={event.id}
        data-event-color={eventColor}
      >
        <AnimatedSection delay={delay} scrollY={scrollY} sectionY={sectionY} triggerPoint={window.innerHeight * 0.7}>
          <div className="event-section-inner">
            <div className="event-content-row">
              <div className="event-left-column">
                <EventPrimaryContent
                  event={{ ...event, id: definiteEventId }} // Pass with definite ID
                  onImageError={() => onImageError?.(definiteEventId)} // Use definite ID
                  onClick={() => navigation.navigate(`/events/${definiteEventId}`)} // Use definite ID
                />
              </div>
              <div className="event-right-column">
                <div className="secondary-container">
                  <EventSecondaryContent event={{ ...event, id: definiteEventId }} /> {/* Pass with definite ID */}
                </div>

                {/* Show map if coordinates are available */}
                {mapRegion ? (
                  <div className="map-wrapper">
                    <h3 className="section-title">Location</h3>
                    <div className="map-container">
                      <Map region={mapRegion} />
                    </div>
                    <p className="location-text">
                      {typeof event.location === 'string' ? event.location : 'See map for details'}
                    </p>
                  </div>
                ) : event.location ? (
                  <div className="map-wrapper">
                    <h3 className="section-title">Location</h3>
                    <div className="map-placeholder">
                      <p className="placeholder-text">
                        {typeof event.location === 'string' ? event.location : 'Location information unavailable'}
                      </p>
                    </div>
                  </div>
                ) : null}

                {locationError && (
                  <div className="error-container">
                    <p className="error-text">{locationError}</p>
                  </div>
                )}
              </div>
            </div>

            {event.slideshowImages && (
              <div className="slideshow-container">
                <h3 className="section-title">Gallery</h3>
                <ImageSlideshow
                  images={(() => {
                    // Process the slideshowImages to ensure proper format
                    if (!event.slideshowImages) return [];

                    // If it's already an array with multiple elements, use it directly
                    if (Array.isArray(event.slideshowImages) && event.slideshowImages.length > 1) {
                      return event.slideshowImages;
                    }

                    // Handle the case where it's an array with one comma-separated string
                    if (
                      Array.isArray(event.slideshowImages) &&
                      event.slideshowImages.length === 1 &&
                      typeof event.slideshowImages[0] === 'string' &&
                      event.slideshowImages[0].includes(',')
                    ) {
                      return event.slideshowImages[0]
                        .split(',')
                        .map((url) => url.trim())
                        .filter((url) => url.length > 0);
                    }

                    // Handle direct string case
                    if (typeof event.slideshowImages === 'string') {
                      if (event.slideshowImages.includes(',')) {
                        return event.slideshowImages
                          .split(',')
                          .map((url) => url.trim())
                          .filter((url) => url.length > 0);
                      }
                      return [event.slideshowImages];
                    }

                    // Fallback to cover image if available
                    if (event.coverImageUrl) return [event.coverImageUrl];

                    return [];
                  })()}
                  height={240}
                  showGradient={true}
                />
              </div>
            )}

            {/* Description section */}
            {event.description && (
              <div className="description-container">
                <h3 className="section-title">About this event</h3>
                <p className="description-text">{event.description}</p>
              </div>
            )}
          </div>
        </AnimatedSection>
      </div>
    );
  },
);

export default EventSection;
