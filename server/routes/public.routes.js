const express = require('express');
const router = express.Router();
const Event = require('../models/event.model');

// Default image URLs for events without images
const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1080&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1080&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1080&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1080&auto=format&fit=crop',
];

// Get all public events - no authentication required
router.get('/events', async (req, res, next) => {
  try {
    // First, check if we have any events at all (debugging)
    const totalEvents = await Event.countDocuments({});

    // Find events that are public - don't filter by public field since your data.csv doesn't have it
    const events = await Event.find({}).sort({ startDate: 1 }).limit(15);

    // Process events to match frontend expectations
    const processedEvents = events.map((event, index) => {
      const eventObj = event.toObject();

      // Always use MongoDB _id as id, never use temp-
      if (eventObj._id) {
        eventObj.id = eventObj._id.toString();
      }

      // Make sure name is properly set
      if (!eventObj.name && eventObj.eventId) {
        eventObj.name = `Event ${eventObj.eventId}`;
      }

      // Ensure playlistId is properly formatted - ensure it starts with "pl"
      // This is critical for the Spotify overlay
      if (!eventObj.playlistId) {
        // If the ID already has "pl" prefix, keep as is
        if (eventObj._id && !eventObj._id.toString().startsWith('pl')) {
          eventObj.playlistId = `pl${eventObj._id.toString()}`;
        } else if (eventObj.id && !eventObj.id.startsWith('pl')) {
          eventObj.playlistId = `pl${eventObj.id}`;
        } else {
          eventObj.playlistId = `pl-temp-${index}`;
        }
      }

      // Add default dates if missing
      if (!eventObj.startDate) {
        eventObj.startDate = new Date();
      }

      if (!eventObj.endDate) {
        // Default end date is 5 days after start date
        const endDate = new Date(eventObj.startDate);
        endDate.setDate(endDate.getDate() + 5);
        eventObj.endDate = endDate;
      }

      // Handle status calculation
      const now = new Date();
      if (!eventObj.status) {
        if (eventObj.startDate <= now && eventObj.endDate >= now) {
          eventObj.status = 'ongoing';
        } else if (eventObj.startDate > now) {
          eventObj.status = 'upcoming';
        } else {
          eventObj.status = 'completed';
        }
      }

      // IMPORTANT: Fix cover images
      if (!eventObj.coverImageUrl && eventObj.coverImage) {
        eventObj.coverImageUrl = eventObj.coverImage;
      }

      if (!eventObj.coverImageUrl) {
        // Consistently assign the same image for the same event
        eventObj.coverImageUrl = DEFAULT_IMAGES[index % DEFAULT_IMAGES.length];
      }

      // Ensure slideshowImages is an array
      if (
        !eventObj.slideshowImages ||
        !Array.isArray(eventObj.slideshowImages) ||
        eventObj.slideshowImages.length === 0
      ) {
        eventObj.slideshowImages = [eventObj.coverImageUrl];
      }

      return eventObj;
    });

    // If no events found after processing, create demo events
    if (processedEvents.length === 0) {
      const demoEvents = createDemoEvents();
      return res.json({ events: demoEvents });
    }

    res.json({ events: processedEvents });
  } catch (error) {
    console.error('Error fetching public events:', error);
    next(error);
  }
});

// Get public event by ID - no authentication required
router.get('/events/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Handle demo IDs that won't be in the database
    if (id.startsWith('demo-') || id.startsWith('temp-')) {
      const demoEvents = createDemoEvents();
      const demoEvent = demoEvents.find((event) => event.id === id || event._id === id);

      if (demoEvent) {
        return res.json(demoEvent);
      }
    }

    // Try to find the event by ID
    let event;
    try {
      event = await Event.findById(id);
    } catch (error) {
      // If ObjectId casting fails, try finding by string ID field
      event = await Event.findOne({ id: id });
    }

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventObj = event.toObject();

    // Process the event in the same way as in the list endpoint
    const now = new Date();

    // Ensure ID is set
    if (!eventObj.id) {
      eventObj.id = eventObj._id.toString();
    }

    // Add default dates if missing
    if (!eventObj.startDate) {
      eventObj.startDate = new Date();
    }

    if (!eventObj.endDate) {
      // Default end date is 5 days after start date
      const endDate = new Date(eventObj.startDate);
      endDate.setDate(endDate.getDate() + 5);
      eventObj.endDate = endDate;
    }

    // Ensure we have a playlist ID
    if (!eventObj.playlistId) {
      eventObj.playlistId = `pl${eventObj.id}`;
    }

    // Calculate status based on dates if not set
    if (!eventObj.status) {
      if (eventObj.startDate <= now && eventObj.endDate >= now) {
        eventObj.status = 'ongoing';
      } else if (eventObj.startDate > now) {
        eventObj.status = 'upcoming';
      } else {
        eventObj.status = 'completed';
      }
    }

    // Ensure coverImageUrl exists
    if (!eventObj.coverImageUrl && eventObj.coverImage) {
      eventObj.coverImageUrl = eventObj.coverImage;
    }

    if (!eventObj.coverImageUrl) {
      eventObj.coverImageUrl = DEFAULT_IMAGES[0];
    }

    // Ensure slideshowImages is an array
    if (
      !eventObj.slideshowImages ||
      !Array.isArray(eventObj.slideshowImages) ||
      eventObj.slideshowImages.length === 0
    ) {
      eventObj.slideshowImages = [eventObj.coverImageUrl];
    }

    res.json(eventObj);
  } catch (error) {
    console.error('Error fetching public event by ID:', error);
    next(error);
  }
});

// Helper to create demo events when none exist
function createDemoEvents() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  return [
    {
      _id: 'demo-1',
      id: 'demo-1',
      name: 'Music Festival 2025',
      description: 'A weekend of amazing music performances',
      location: 'City Park',
      startDate: tomorrow,
      endDate: nextWeek,
      coverImageUrl: DEFAULT_IMAGES[0],
      slideshowImages: [DEFAULT_IMAGES[0]],
      status: 'upcoming',
      playlistId: 'pl-demo-1',
      color: '#3357FF',
    },
    {
      _id: 'demo-2',
      id: 'demo-2',
      name: 'Tech Conference 2025',
      description: 'Learn about the latest technology trends',
      location: 'Convention Center',
      startDate: tomorrow,
      endDate: nextWeek,
      coverImageUrl: DEFAULT_IMAGES[1],
      slideshowImages: [DEFAULT_IMAGES[1]],
      status: 'upcoming',
      playlistId: 'pl-demo-2',
      color: '#FF5733',
    },
    {
      _id: 'demo-3',
      id: 'demo-3',
      name: 'Food Festival',
      description: 'Taste cuisine from around the world',
      location: 'Downtown Square',
      startDate: tomorrow,
      endDate: nextWeek,
      coverImageUrl: DEFAULT_IMAGES[2],
      slideshowImages: [DEFAULT_IMAGES[2]],
      status: 'upcoming',
      playlistId: 'pl-demo-3',
      color: '#33FF57',
    },
  ];
}

module.exports = router;
