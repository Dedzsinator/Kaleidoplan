import express from 'express';

const router = express.Router();
import Event from '../models/event.model';

// Default image URLs for events without images
const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1080&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1080&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1080&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1080&auto=format&fit=crop',
];

router.get('/events', async (req, res, next) => {
  try {
    // Only find events from the database
    const events = await Event.find({}).sort({ startDate: 1 }).limit(15);

    // Process events to match frontend expectations
    const processedEvents = events.map((event, index) => {
      const eventObj = event.toObject();

      // Always use MongoDB _id as id
      if (eventObj._id) {
        eventObj.id = eventObj._id.toString();
      }

      // Fix cover images
      if (!eventObj.coverImageUrl && eventObj.coverImage) {
        eventObj.coverImageUrl = eventObj.coverImage;
      }

      if (!eventObj.coverImageUrl) {
        // Use default images for presentation only
        eventObj.coverImageUrl = DEFAULT_IMAGES[index % DEFAULT_IMAGES.length];
      }

      // Ensure slideshowImages is an array of strings
      if (!eventObj.slideshowImages || !Array.isArray(eventObj.slideshowImages)) {
        if (typeof eventObj.slideshowImages === 'string' && eventObj.slideshowImages.trim()) {
          // Convert comma-separated string to array
          eventObj.slideshowImages = eventObj.slideshowImages
            .split(',')
            .map((url) => url.trim())
            .filter((url) => url.length > 0);
        } else {
          eventObj.slideshowImages = [];
        }
      }

      // If still empty, use the cover image
      if (eventObj.slideshowImages.length === 0) {
        eventObj.slideshowImages = [eventObj.coverImageUrl];
      }

      return eventObj;
    });

    res.json({ events: processedEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    next(error);
  }
});

router.get('/events/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Remove demo and temp ID handling - only use database
    // Try to find the event by ID
    let event;
    try {
      // First try with the ID as is (might be a valid ObjectId)
      event = await Event.findById(id);
    } catch (error) {
      console.error('Error finding event by ID:', error);
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

module.exports = router;
