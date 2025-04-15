import React, { useRef, useEffect, useState, memo } from 'react';
import AnimatedSection from '../ui/AnimatedSection';
import EventPrimaryContent from '../ui/EventPrimaryContent';
import EventSecondaryContent from '../ui/EventSecondaryContent';
import Map from '../Map';
import ImageSlideshow from '../ui/SlideShow';
import '../../styles/EventSection.css';

// Define TypeScript interfaces for props
interface Event {
  id: string;
  name: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
  coverImageUrl?: string;
  slideshowImages?: string[];
  [key: string]: any; // Allow other properties
}

interface EventSectionProps {
  event: Event;
  navigation: any; // Replace with appropriate type
  onImageError: (eventId: string) => void;
  index: number;
  scrollY: number;
  sectionY: number;
  onVisibilityChange?: (isVisible: boolean, eventId: string) => void;
}

// Track total scroll listeners for debugging
let totalScrollListeners = 0;

const EventSection = memo(({
  event,
  navigation,
  onImageError,
  index,
  scrollY,
  sectionY,
  onVisibilityChange
}: EventSectionProps) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Log every 5th render in development
  if (process.env.NODE_ENV !== 'production' && renderCount.current % 5 === 0) {
    console.log(`EventSection ${event?.id} rendering: ${renderCount.current} times`);
  }

  const delay = index * 150;
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);
  const [sectionHeight, setSectionHeight] = useState(0);
  const [mapRegion, setMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [locationError, setLocationError] = useState('');

  // Store event ID in ref to avoid rebuilding effects
  const eventIdRef = useRef(event?.id);

  // Update the ref if event ID changes
  if (event?.id !== eventIdRef.current) {
    eventIdRef.current = event?.id;
  }

  // Measure the section height for visibility calculations
  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.getBoundingClientRect().height;
      setSectionHeight(height);
    }
  }, [index]); // Only depend on index, not event which changes frequently

  // Visibility detection with aggressive throttling
  useEffect(() => {
    // Skip if no callback or we can't measure
    if (!onVisibilityChange || sectionHeight <= 0 || !eventIdRef.current) return;

    // Store eventId in closure for stability
    const eventId = eventIdRef.current;

    // Tracking last update time for throttling
    let lastUpdateTime = 0;
    const THROTTLE_MS = 250; // Only trigger callback max 4 times per second

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastUpdateTime < THROTTLE_MS) return;

      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Element is visible if it's in the viewport
      const isVisible =
        rect.top <= windowHeight * 0.75 &&
        rect.bottom >= windowHeight * 0.25;

      // Only trigger callback when visibility actually changes
      if (isVisible !== isVisibleRef.current) {
        isVisibleRef.current = isVisible;
        lastUpdateTime = now;
        onVisibilityChange(isVisible, eventId);
      }
    };

    // Use requestAnimationFrame for smooth performance
    let rafId: number | null = null;

    const throttledHandleScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          handleScroll();
          rafId = null;
        });
      }
    };

    // Debug total listeners
    totalScrollListeners++;
    console.log(`Adding scroll listener #${totalScrollListeners} for event ${eventId}`);

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });

    // Initial check after a slight delay to ensure rendering is complete
    setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      totalScrollListeners--;
      console.log(`Removing scroll listener, ${totalScrollListeners} remaining`);
    };
  }, [sectionHeight, onVisibilityChange]); // Remove event dependency

  // Get location for map - with optimization
  useEffect(() => {
    // Skip if we don't have location info or we already have map data
    if ((!event?.location && !(event?.latitude && event?.longitude)) ||
      (mapRegion && event?.latitude === mapRegion.latitude && event?.longitude === mapRegion.longitude)) {
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
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(event.location)}`
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
  }, [event?.location, event?.latitude, event?.longitude]);

  // If event is missing, render a placeholder
  if (!event || !event.id) {
    return (
      <div className="error-container">
        <p className="error-text">Invalid event data at position {index}</p>
      </div>
    );
  }

  // Prepare slideshow images
  const slideshowImages = Array.isArray(event.slideshowImages)
    ? event.slideshowImages
    : (event.coverImageUrl ? [event.coverImageUrl] : []);

  return (
    <div
      className="event-section-container"
      ref={containerRef}
    >
      <div className="event-section-inner">
        <div className="event-content-row">
          {/* Left column */}
          <div className="event-left-column">
            <AnimatedSection
              scrollY={scrollY}
              sectionY={sectionY}
              delay={delay}
            >
              <EventPrimaryContent
                event={event}
                onImageError={() => onImageError(event.id)}
              />

              {slideshowImages.length > 0 && (
                <div className="slideshow-container">
                  <h3 className="section-title">Event Gallery</h3>
                  <ImageSlideshow
                    images={slideshowImages}
                    height={200}
                    interval={5000}
                    showGradient={true}
                  />
                </div>
              )}

              <div className="description-container">
                <h3 className="section-title">About this event</h3>
                <p className="description-text">
                  {event.description || "No description available"}
                </p>
              </div>
            </AnimatedSection>
          </div>

          {/* Right column */}
          <div className="event-right-column">
            <AnimatedSection
              scrollY={scrollY}
              sectionY={sectionY}
              delay={delay + 200}
            >
              <div className="secondary-container">
                <EventSecondaryContent event={event} />
              </div>

              <div className="map-wrapper">
                <h3 className="section-title">Event Location</h3>
                <div className="map-container">
                  {mapRegion ? (
                    <Map
                      region={mapRegion}
                      markers={[
                        {
                          coordinate: {
                            latitude: mapRegion.latitude,
                            longitude: mapRegion.longitude
                          },
                          title: event.name,
                          description: event.location
                        }
                      ]}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div className="map-placeholder">
                      <p className="placeholder-text">
                        {locationError || 'Loading location...'}
                      </p>
                    </div>
                  )}
                </div>
                <p className="location-text">
                  {event.location || "Location not specified"}
                  {event.latitude && event.longitude ? ` (${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)})` : ''}
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>

      <div className="event-divider"></div>
    </div>
  );
});

export default EventSection;