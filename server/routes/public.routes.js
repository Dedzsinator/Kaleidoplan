const express = require('express');
const router = express.Router();
const Event = require('../models/event.model');

// Get all public events - no authentication required
router.get('/events', async (req, res, next) => {
  try {
    console.log('Fetching public events');

    // First, check if we have any events at all (debugging)
    const totalEvents = await Event.countDocuments({});
    console.log(`Total events in database: ${totalEvents}`);

    // Find events that are public
    // IMPORTANT: Removed date restriction to see if we get any events at all
    const events = await Event.find({}).sort({ startDate: 1 }).limit(10); // Limit for guest view

    console.log(`Found ${events.length} public events`);

    // Calculate status based on dates if not set
    const now = new Date();
    const eventsWithStatus = events.map((event) => {
      const eventObj = event.toObject();

      // Add debugging info
      console.log(`Event: ${eventObj.name}, Start: ${event.startDate}, End: ${event.endDate}`);

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

    res.json({ events: eventsWithStatus });
  } catch (error) {
    console.error('Error fetching public events:', error);
    next(error);
  }
});

// Get public event by ID - no authentication required
router.get('/events/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const now = new Date();
    const eventObj = event.toObject();

    // Calculate status if not set
    if (!eventObj.status) {
      if (event.startDate <= now && event.endDate >= now) {
        eventObj.status = 'ongoing';
      } else if (event.startDate > now) {
        eventObj.status = 'upcoming';
      } else {
        eventObj.status = 'completed';
      }
    }

    res.json(eventObj);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
