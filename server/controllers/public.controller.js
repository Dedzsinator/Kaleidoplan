const Event = require('../models/event.model');

// Get public events - RETURNS ALL FIELDS
exports.getPublicEvents = async (req, res, next) => {
  try {
    console.log('Controller: Fetching public events');

    // Remove the projection to get ALL fields
    const events = await Event.find({ isPublic: true }).sort({ startDate: 1 });

    console.log(`Found ${events.length} public events`);

    // Convert to more frontend-friendly format with normalized field names
    const now = new Date();
    const eventsWithStatus = events.map((event) => {
      // Convert to object safely
      const eventObj = typeof event.toObject === 'function' ? event.toObject() : { ...event };

      // Debug log all fields in one event to verify complete data
      if (events.indexOf(event) === 0) {
        console.log('Event data fields:', Object.keys(eventObj));
      }

      // Ensure we have an id field (frontend expects id, not _id)
      if (eventObj._id) {
        eventObj.id = eventObj._id.toString();
      } else {
        // Generate a fallback id if _id doesn't exist
        eventObj.id = `temp-${Math.random().toString(36).substring(2, 15)}`;
      }

      // Normalize coverImage to coverImageUrl if needed
      if (eventObj.coverImage && !eventObj.coverImageUrl) {
        eventObj.coverImageUrl = eventObj.coverImage;
      }

      // Ensure slideshowImages is an array
      if (eventObj.slideshowImages && typeof eventObj.slideshowImages === 'string') {
        eventObj.slideshowImages = eventObj.slideshowImages.split(',').map((url) => url.trim());
      } else if (!eventObj.slideshowImages && eventObj.coverImageUrl) {
        eventObj.slideshowImages = [eventObj.coverImageUrl];
      }

      // Ensure we always have status
      if (!eventObj.status) {
        if (event.startDate <= now && event.endDate >= now) {
          eventObj.status = 'ongoing';
        } else if (event.startDate > now) {
          eventObj.status = 'upcoming';
        } else {
          eventObj.status = 'completed';
        }
      }

      return eventObj;
    });

    // Return data in the format the frontend expects: { events: [...] }
    res.status(200).json({ events: eventsWithStatus });
  } catch (error) {
    console.error('Error fetching public events:', error);
    next(error);
  }
};

exports.getPublicEventById = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, isPublic: true });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Convert to plain object safely
    const eventObj = typeof event.toObject === 'function' ? event.toObject() : { ...event };

    // Ensure id field exists
    if (eventObj._id) {
      eventObj.id = eventObj._id.toString();
    } else {
      eventObj.id = req.params.id;
    }

    // Calculate status based on dates
    const now = new Date();
    if (event.startDate <= now && event.endDate >= now) {
      eventObj.status = 'ongoing';
    } else if (event.startDate > now) {
      eventObj.status = 'upcoming';
    } else {
      eventObj.status = 'completed';
    }

    res.status(200).json(eventObj);
  } catch (error) {
    console.error('Error fetching public event by ID:', error);
    next(error);
  }
};
