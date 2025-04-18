import React, { useRef, useEffect, useState, memo } from 'react';
import AnimatedSection from '../ui/AnimatedSection';
import EventPrimaryContent from '../ui/EventPrimaryContent';
import EventSecondaryContent from '../ui/EventSecondaryContent';
import Map from '../Map';
import ImageSlideshow from '../ui/SlideShow';
import '../../styles/EventSection.css';
import { Event } from '../../models/types';

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface NavigationProps {
  navigate: (route: string, params?: Record<string, unknown>) => void;
}

interface EventSectionProps {
  event: Event;
  navigation: NavigationProps;
  onImageError: (eventId: string) => void;
  index: number;
  scrollY: number;
  sectionY: number;
  onVisibilityChange?: (isVisible: boolean, eventId: string) => void;
}

const EventSection = memo(
  ({ event, navigation, onImageError, index, scrollY, sectionY, onVisibilityChange }: EventSectionProps) => {
    const delay = index * 150;
    const containerRef = useRef<HTMLDivElement>(null);
    const isVisibleRef = useRef(false);
    const [sectionHeight, setSectionHeight] = useState(0);
    const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
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
        const observer = new ResizeObserver(entries => {
          for (const entry of entries) {
            setSectionHeight(entry.contentRect.height);
          }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
      }
    }, []);

    // Visibility detection with Intersection Observer
    useEffect(() => {
      if (!onVisibilityChange || !containerRef.current || !eventIdRef.current) return;

      const eventId = eventIdRef.current;

      const observer = new IntersectionObserver(
        (entries) => {
          // Use the first entry as we're only observing one element
          const isVisible = entries[0]?.isIntersecting ?? false;

          if (isVisible !== isVisibleRef.current) {
            isVisibleRef.current = isVisible;
            onVisibilityChange(isVisible, eventId);
          }
        },
        {
          threshold: 0.25, // Trigger when 25% of the element is visible
          rootMargin: '0px' // No margin
        }
      );

      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }, [onVisibilityChange]);

    // Get location for map - with optimization
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
    }, [event?.location, event?.latitude, event?.longitude, mapRegion]);

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
      : event.coverImageUrl
        ? [event.coverImageUrl]
        : [];

    return (
      <div className="event-section-container" ref={containerRef}>
        <div className="event-section-inner">
          <div className="event-content-row">
            {/* Left column */}
            <div className="event-left-column">
              <AnimatedSection scrollY={scrollY} sectionY={sectionY} delay={delay}>
                <EventPrimaryContent event={event} onImageError={() => onImageError(event.id)} />

                {slideshowImages.length > 0 && (
                  <div className="slideshow-container">
                    <h3 className="section-title">Event Gallery</h3>
                    <ImageSlideshow images={slideshowImages} height={200} interval={5000} showGradient={true} />
                  </div>
                )}

                <div className="description-container">
                  <h3 className="section-title">About this event</h3>
                  <p className="description-text">{event.description || 'No description available'}</p>
                </div>
              </AnimatedSection>
            </div>

            {/* Right column */}
            <div className="event-right-column">
              <AnimatedSection scrollY={scrollY} sectionY={sectionY} delay={delay + 200}>
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
                              longitude: mapRegion.longitude,
                            },
                            title: event.name,
                            description: event.location,
                          },
                        ]}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div className="map-placeholder">
                        <p className="placeholder-text">{locationError || 'Loading location...'}</p>
                      </div>
                    )}
                  </div>
                  <p className="location-text">
                    {event.location || 'Location not specified'}
                    {event.latitude && event.longitude
                      ? ` (${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)})`
                      : ''}
                  </p>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>

        <div className="event-divider"></div>
      </div>
    );
  },
);

// Add display name for debugging
EventSection.displayName = 'EventSection';

export default EventSection;
