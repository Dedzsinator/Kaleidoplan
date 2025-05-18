import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById } from '@services/eventService';
import { getSponsors } from '@services/sponsorService';
import { getUserById } from '@services/userService';
import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';
import Map from '../components/Map';
import ImageSlideshow from '../components/ui/SlideShow';
import EventImageUploader from '../components/ui/EventImageUploader';
import SpotifyRadioOverlay from '../components/actions/SpotifyRadioOverlay';
import { useAuth } from '../contexts/AuthContext';
import api from '@services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WeatherForecast from '../components/ui/WeatherForecast';
import axios from 'axios';
import '../styles/EventDetailScreen.css';

// Types
import { Event, Sponsor, User } from '../models/types';

const queryClient = new QueryClient();

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

// Local Organizer interface for UI display
interface Organizer {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

const DEFAULT_COLOR = '#3357FF';
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';

const EventDetailScreen: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if user is admin or organizer
  const isAdminOrOrganizer = user && (user.role === 'admin' || user.role === 'organizer');

  const [event, setEvent] = useState<Event | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [spotifyExpanded, setSpotifyExpanded] = useState(false);
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);

  // Image upload states
  const [pendingUploads, setPendingUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Add these state variables to your component
  const [isDeletingImage, setIsDeletingImage] = useState<boolean>(false);
  const [deleteStatus, setDeleteStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // Earlier in your component, make these changes to fix the circular reference:

  // 1. First, add this state variable if not already present
  const [currentGalleryImages, setCurrentGalleryImages] = useState<string[]>([]);

  // 2. Now define getCoverImage first (it doesn't depend on processSlideshowImages)
  const getCoverImage = useCallback(() => {
    if (!event) return DEFAULT_IMAGE;

    // Try coverImageUrl first
    if (event.coverImageUrl && typeof event.coverImageUrl === 'string' && event.coverImageUrl.trim() !== '') {
      return event.coverImageUrl;
    }

    // Try coverImage next (legacy field name)
    if (event.coverImage && typeof event.coverImage === 'string' && event.coverImage.trim() !== '') {
      return event.coverImage;
    }

    // Try first slideshow image if available
    if (Array.isArray(event.slideshowImages) && event.slideshowImages.length > 0) {
      const firstImage = event.slideshowImages[0];
      if (typeof firstImage === 'string' && !firstImage.includes(',')) {
        return firstImage;
      }
      if (typeof firstImage === 'string' && firstImage.includes(',')) {
        const split = firstImage.split(',')[0].trim();
        if (split) return split;
      }
    }

    // Last resort - use default
    return DEFAULT_IMAGE;
  }, [event]);

  // 3. Get the cover image value
  const coverImage = getCoverImage();

  // 4. Now define processSlideshowImages which can use coverImage
  // Update processSlideshowImages to always include cover image
  const processSlideshowImages = useCallback(() => {
    if (!event) return [];

    // Start with an array that includes the cover image (if it exists)
    const result = [];

    // Add cover image first (if it exists and isn't DEFAULT_IMAGE)
    if (coverImage && coverImage !== DEFAULT_IMAGE) {
      result.push(coverImage);
    }

    // If no slideshowImages, return just the cover image (if we added one)
    if (!event.slideshowImages) {
      return result;
    }

    // Process slideshowImages based on its type
    let processedSlideshow: string[] = [];

    // If it's an array with one comma-separated string
    if (
      Array.isArray(event.slideshowImages) &&
      event.slideshowImages.length === 1 &&
      typeof event.slideshowImages[0] === 'string' &&
      event.slideshowImages[0].includes(',')
    ) {
      processedSlideshow = event.slideshowImages[0]
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);
    }
    // If it's already a proper array
    else if (Array.isArray(event.slideshowImages) && event.slideshowImages.length > 0) {
      processedSlideshow = event.slideshowImages;
    }
    // If it's a direct string
    else if (typeof event.slideshowImages === 'string') {
      if (event.slideshowImages.includes(',')) {
        processedSlideshow = event.slideshowImages
          .split(',')
          .map((url) => url.trim())
          .filter((url) => url.length > 0);
      } else {
        processedSlideshow = [event.slideshowImages];
      }
    }

    // Add all slideshow images that aren't duplicates of the cover image
    for (const img of processedSlideshow) {
      if (img !== coverImage) {
        result.push(img);
      }
    }

    return result;
  }, [event, coverImage]);

  // 5. Don't redeclare slideshowImages here, just use processSlideshowImages directly
  // in your useEffect
  useEffect(() => {
    if (event) {
      const processedImages = processSlideshowImages();
      setCurrentGalleryImages(processedImages || []);
    }
  }, [event, processSlideshowImages]);

  const handleDeleteImage = async (imageUrl: string, isCover: boolean = false) => {
    if (!eventId || !imageUrl) return;

    setIsDeletingImage(true);
    setDeleteStatus(null);

    try {
      // The direct approach: update the event object correctly
      const updatePayload: Partial<Event> = {};

      if (isCover) {
        updatePayload.coverImageUrl = '';
        updatePayload.coverImagePublicId = '';
      } else {
        // For slideshow images, remove the image from the array properly
        if (event) {
          // First, handle different possible formats of slideshow images
          let currentImages: string[] = [];

          if (Array.isArray(event.slideshowImages)) {
            // Process array format - check if any elements contain commas
            for (const item of event.slideshowImages) {
              if (typeof item === 'string') {
                if (item.includes(',')) {
                  // Split comma-separated URLs into separate items
                  const splitItems = item
                    .split(',')
                    .map((url) => url.trim())
                    .filter((url) => url.length > 0);
                  currentImages.push(...splitItems);
                } else {
                  currentImages.push(item);
                }
              }
            }
          } else if (typeof event.slideshowImages === 'string') {
            // Process string format
            currentImages = event.slideshowImages
              .split(',')
              .map((url) => url.trim())
              .filter((url) => url.length > 0);
          }

          // Filter out the image to be deleted
          const updatedImages = currentImages.filter((img) => img !== imageUrl);

          updatePayload.slideshowImages = updatedImages;
        }
      }

      // Send update directly to the server with PUT
      await api.put(`/events/${eventId}`, updatePayload);

      // Update the UI immediately
      if (isCover) {
        setEvent((prev) => (prev ? { ...prev, coverImageUrl: '' } : null));
      } else {
        setCurrentGalleryImages((prevImages) => prevImages.filter((img) => img !== imageUrl));
        setEvent((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            slideshowImages: updatePayload.slideshowImages,
          };
        });
      }

      setDeleteStatus({
        message: `Image ${isCover ? 'cover' : ''} removed successfully`,
        type: 'success',
      });

      // Refresh the event data to keep UI and server in sync
      await fetchEventData();
    } catch (error) {
      console.error('Error deleting image:', error);
      setDeleteStatus({
        message: error instanceof Error ? error.message : 'Failed to delete image',
        type: 'error',
      });
    } finally {
      setIsDeletingImage(false);

      // Clear the status message after 3 seconds
      setTimeout(() => {
        setDeleteStatus(null);
      }, 3000);
    }
  };

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

  const getEventOrganizers = useCallback(
    async (eventData: Event, currentUser: { role?: string } | null) => {
      // Move the handleEventOrganizersArray function inside the useCallback
      function handleEventOrganizersArray(eventData: Event) {
        if (eventData?.organizers && Array.isArray(eventData.organizers)) {
          // Create organizer objects directly without making API calls
          const organizerData = (eventData.organizers as Array<string | { userId?: string; id?: string }>).map(
            (organizer: string | { userId?: string; id?: string }) => {
              // Handle both string IDs and object formats
              const userId = typeof organizer === 'string' ? organizer : organizer.userId || organizer.id || '';
              const shortId = userId.substring(0, 6);

              return {
                id: userId,
                displayName: `${shortId}`,
                email: '',
                photoURL: '',
              };
            },
          );

          setOrganizers(organizerData);
        } else {
          setOrganizers([]);
        }
      }

      try {
        // Only try to access the admin endpoint if user is admin/organizer
        if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'organizer')) {
          try {
            const organizerAssignmentsResponse = await api.get('/admin/organizer-assignments');

            if (organizerAssignmentsResponse?.assignments) {
              // Get assignments for this specific event
              const eventAssignments = organizerAssignmentsResponse.assignments[eventId || ''] || [];

              if (eventAssignments.length > 0) {
                // Fetch user data directly from Firebase using admin endpoint
                const organizerPromises = eventAssignments.map(async (userId: string) => {
                  try {
                    // Use the Firebase admin endpoint to get user data directly
                    const userData = await api.get(`/admin/firebase/users/${userId}`);
                    // If that doesn't work, try the alternative endpoint format
                    return {
                      id: userId,
                      displayName: userData?.displayName || userData?.email || `User ${userId.substring(0, 6)}`,
                      email: userData?.email || '',
                      photoURL: userData?.photoURL || '',
                    };
                  } catch (userError) {
                    console.warn(`Could not fetch user data for ${userId}, using placeholder`);
                    // Fallback to placeholder if user fetch fails
                    return {
                      id: userId,
                      displayName: `Organizer ${userId.substring(0, 6)}`,
                      email: '',
                      photoURL: '',
                    };
                  }
                });

                const organizerData = await Promise.all(organizerPromises);
                setOrganizers(organizerData);
                return;
              }
            }
          } catch (adminError) {}
        }

        // For non-admin users or if admin endpoint fails
        handleEventOrganizersArray(eventData);
      } catch (error) {
        console.error('Error getting organizers:', error);
        setOrganizers([]);
      }
    },
    [eventId], // handleEventOrganizersArray is now inside the callback, so we remove it from dependencies
  );

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

    setLoading(true);
    let eventData: Event | null = null;

    try {
      // Check if this is a temp ID with random numbers (which MongoDB can't handle)
      const isTempRandomId = eventId.startsWith('temp-') && !isNaN(parseFloat(eventId.split('temp-')[1]));

      if (!isTempRandomId) {
        // For real MongoDB IDs, fetch from API
        try {
          eventData = await getEventById(eventId);

          if (eventData) {
            // Set the event data first so we have access to it
            setEvent(eventData);

            // Get organizers using our new method
            await getEventOrganizers(eventData, user);

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
              } catch (sponsorError) {
                console.error(
                  'Error fetching sponsors:',
                  sponsorError instanceof Error ? sponsorError.message : 'Unknown error',
                );
                setSponsors([]);
              }
            } else {
              setSponsors([]);
            }
          }
        } catch (apiError) {
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
                setEvent(eventData);
              }
            } catch (e) {
              console.error('Error parsing cached events:', e);
            }
          }

          if (!eventData) {
            throw new Error('Event not found');
          }
        }
      } else {
        // Handle temp ID - try session storage
        const cachedEventsStr = sessionStorage.getItem('all-events');
        if (cachedEventsStr) {
          try {
            const cachedEvents = JSON.parse(cachedEventsStr);
            const cachedEvent = cachedEvents.find((e: Record<string, unknown>) => e.id === eventId);
            if (cachedEvent) {
              if (!cachedEvent.color) cachedEvent.color = DEFAULT_COLOR;
              if (!cachedEvent.status) cachedEvent.status = 'upcoming';
              if (!cachedEvent.startDate) cachedEvent.startDate = new Date();
              if (!cachedEvent.endDate) cachedEvent.endDate = new Date();
              eventData = cachedEvent as Event;
              setEvent(eventData);
            }
          } catch (e) {
            console.error('Error parsing cached events:', e);
            throw new Error('Failed to load temporary event');
          }
        }
      }

      // If we still don't have event data, it wasn't found
      if (!eventData) {
        throw new Error('Event not found');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching event data:', err instanceof Error ? err.message : 'Unknown error');
      setError('Failed to load event details');
      setLoading(false);
    }
  }, [eventId, user, getEventOrganizers]);

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

  const collectImageAfterUpload = (imageUrl: string, imageType: 'cover' | 'slideshow') => {
    if (imageType === 'slideshow') {
      setPendingUploads((prev) => [...prev, imageUrl]);
    } else if (imageType === 'cover') {
      setPendingUploads((prev) => [...prev, `cover:${imageUrl}`]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setPendingUploads((prev) => {
      const newUploads = [...prev];
      newUploads.splice(index, 1);
      return newUploads;
    });
  };

  const saveGalleryImages = async () => {
    if (!eventId || pendingUploads.length === 0) {
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const updatePayload: Partial<Event> = {};

      // Process slideshow images
      const slideshowImages = pendingUploads.filter((url) => !url.startsWith('cover:'));
      if (slideshowImages.length > 0) {
        // If event already has slideshow images, append new ones
        const existingImages = event?.slideshowImages || [];
        let combinedImages;

        if (Array.isArray(existingImages)) {
          combinedImages = [...existingImages, ...slideshowImages];
        } else if (typeof existingImages === 'string') {
          // Handle case where slideshowImages might be a comma-separated string
          const existingArray = existingImages
            .split(',')
            .map((url) => url.trim())
            .filter((url) => url);
          combinedImages = [...existingArray, ...slideshowImages];
        } else {
          combinedImages = slideshowImages;
        }

        updatePayload.slideshowImages = combinedImages;
      }

      // Process cover image (use the last one if multiple were uploaded)
      const coverImages = pendingUploads
        .filter((url) => url.startsWith('cover:'))
        .map((url) => url.replace('cover:', ''));

      if (coverImages.length > 0) {
        updatePayload.coverImageUrl = coverImages[coverImages.length - 1];
      }

      // Send update to server
      await api.put(`/events/${eventId}`, updatePayload);

      // Clear pending uploads
      setPendingUploads([]);

      // Set success state
      setUploadSuccess(true);

      // Wait a moment, then redirect to home with success message
      setTimeout(() => {
        navigate('/', {
          state: {
            message: 'Images saved successfully!',
            severity: 'success',
          },
        });
      }, 2000);
    } catch (err) {
      console.error('Error saving images:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to save images');
    } finally {
      setUploading(false);
    }
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

  const slideshowImages = processSlideshowImages();

  return (
    <div className="event-detail-screen" style={colorStyles}>
      <NavBar />

      {/* Hero Section */}
      <div className="event-hero" style={{ backgroundImage: `url(${coverImage})` }}>
        <div className="event-hero-overlay" style={{ backgroundColor: event.color || DEFAULT_COLOR }}></div>

        {/* Add delete button for cover image (only for admin/organizer) */}
        {isAdminOrOrganizer && coverImage && coverImage !== DEFAULT_IMAGE && (
          <button
            className="cover-image-delete-button"
            onClick={() => handleDeleteImage(coverImage, true)}
            disabled={isDeletingImage}
            title="Delete cover image"
          >
            <i className="fa fa-trash"></i>
          </button>
        )}

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
        {uploadSuccess && (
          <div className="success-message">Images uploaded successfully! Redirecting to home page...</div>
        )}

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

        {/* Weather Forecast */}
        {mapRegion && (
          <section className="event-weather">
            <div className="event-card">
              <h2>Weather Forecast</h2>
              <p className="section-subtitle">Expected weather during the event period</p>
              <QueryClientProvider client={queryClient}>
                <WeatherForecast
                  latitude={mapRegion.latitude}
                  longitude={mapRegion.longitude}
                  startDate={eventStartDate}
                  endDate={eventEndDate}
                  eventColor={event.color || DEFAULT_COLOR}
                />
              </QueryClientProvider>
            </div>
          </section>
        )}

        {/* Organizers Section - Always visible but with different content depending on role */}
        <section className="event-organizers">
          <div className="event-card">
            <h2>Event Organizers</h2>
            <div className="organizer-list">
              {organizers.length > 0 ? (
                organizers.map((organizer) => (
                  <div key={organizer.id} className="organizer-item">
                    {organizer.photoURL ? (
                      <img
                        src={organizer.photoURL}
                        alt={organizer.displayName || 'Organizer'}
                        className="organizer-avatar"
                      />
                    ) : (
                      <div className="organizer-avatar-placeholder">
                        {(organizer.displayName || 'O')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="organizer-info">
                      <div className="organizer-name">{organizer.displayName || 'Unnamed Organizer'}</div>
                      {isAdminOrOrganizer && organizer.email && (
                        <div className="organizer-email">{organizer.email}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-organizers">No organizers assigned to this event.</p>
              )}
            </div>
          </div>
        </section>

        {/* Image Upload Section - Only visible to Admin/Organizer */}
        {isAdminOrOrganizer && (
          <section className="event-image-management">
            <div className="event-card">
              <h2>Manage Event Images</h2>

              <div className="event-image-section">
                {/* Make sure the uploader is rendered unconditionally */}
                <div className="image-uploader-container" style={{ marginTop: '15px' }}>
                  <EventImageUploader
                    eventId={eventId || ''}
                    imageType="cover"
                    buttonLabel="Change Cover Image"
                    onImageUploaded={(imageUrl) => collectImageAfterUpload(imageUrl, 'cover')}
                  />
                </div>
              </div>

              <div className="event-image-section mt-4">
                {/* Ensure this uploader is visible */}
                <div className="image-uploader-container" style={{ marginTop: '15px' }}>
                  <EventImageUploader
                    eventId={eventId || ''}
                    imageType="slideshow"
                    allowMultiple={true}
                    buttonLabel="Select Gallery Images"
                    batchUpload={true}
                    onImageUploaded={(imageUrl) => collectImageAfterUpload(imageUrl, 'slideshow')}
                    onMultipleImagesUploaded={(imageUrls) =>
                      imageUrls.forEach((url) => collectImageAfterUpload(url, 'slideshow'))
                    }
                  />
                </div>
              </div>

              {pendingUploads.length > 0 && (
                <div className="pending-uploads mt-4">
                  <h3>New Images to Upload</h3>
                  <div className="pending-images-preview">
                    {pendingUploads.map((url, idx) => (
                      <div key={idx} className="pending-image-container">
                        <img
                          src={url.startsWith('cover:') ? url.substring(6) : url}
                          alt={`Pending upload ${idx + 1}`}
                          className="pending-image-preview"
                        />
                        <button
                          className="remove-image-btn"
                          onClick={() => handleRemoveImage(idx)}
                          title="Remove image"
                        >
                          ×
                        </button>
                        {url.startsWith('cover:') && <div className="image-type-badge">Cover</div>}
                      </div>
                    ))}
                  </div>

                  <div className="save-actions">
                    <button className="save-gallery-button" onClick={saveGalleryImages} disabled={uploading}>
                      {uploading ? 'Saving...' : 'Save Images & Update Event'}
                    </button>
                    {uploadError && <div className="upload-error">{uploadError}</div>}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

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

        {/* Gallery Section - Show slideshow of images */}
        {currentGalleryImages.length > 0 && (
          <section className="event-gallery">
            <div className="event-card">
              <h2>Gallery</h2>

              {deleteStatus && (
                <div className={`delete-status-message ${deleteStatus.type}`}>{deleteStatus.message}</div>
              )}

              {isAdminOrOrganizer ? (
                <div className="admin-gallery-grid">
                  {currentGalleryImages.map((imageUrl, index) => (
                    <div key={`gallery-img-${index}`} className="admin-gallery-item">
                      <img src={imageUrl} alt={`Gallery image ${index + 1}`} className="admin-gallery-image" />
                      <button
                        className="image-delete-button"
                        onClick={() => handleDeleteImage(imageUrl)}
                        disabled={isDeletingImage}
                        title="Delete image"
                      >
                        <i className="fa fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <ImageSlideshow images={currentGalleryImages} height={400} interval={5000} showGradient={true} />
              )}
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
