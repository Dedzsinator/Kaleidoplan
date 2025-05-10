const Event = require('../models/event.model');

// Get public events - RETURNS ALL FIELDS
// Get all public events
exports.getPublicEvents = async (req, res, next) => {
  try {
    // First, check total events count
    const totalEvents = await Event.countDocuments({});

    // Just get all events without filtering
    const events = await Event.find({}).sort({ startDate: 1 }).limit(15);

    if (events.length === 0) {
      return res.json({ events: [] });
    }

    // Process events to match our expected structure
    const processedEvents = events.map((event) => {
      const eventObj = event.toObject();

      // Make sure we have required fields from data.csv structure
      if (!eventObj.id && eventObj._id) {
        eventObj.id = eventObj._id.toString();
      }

      // Ensure we have a playlist ID that matches our naming convention
      if (!eventObj.playlistId) {
        eventObj.playlistId = `pl${eventObj.id}`;
      }

      // Set default startDate and endDate if missing
      if (!eventObj.startDate) {
        eventObj.startDate = new Date();
      }

      if (!eventObj.endDate) {
        const endDate = new Date(eventObj.startDate);
        endDate.setDate(endDate.getDate() + 5);
        eventObj.endDate = endDate;
      }

      // Calculate status
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

      // Ensure coverImageUrl is set
      if (!eventObj.coverImageUrl && eventObj.coverImage) {
        eventObj.coverImageUrl = eventObj.coverImage;
      }

      if (!eventObj.coverImageUrl) {
        eventObj.coverImageUrl =
          'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1080&auto=format&fit=crop';
      }

      return eventObj;
    });

    res.json({ events: processedEvents });
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
