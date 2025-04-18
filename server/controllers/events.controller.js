// Events controller for managing event data with MongoDB
const Event = require('../models/event.model');
const EventSponsor = require('../models/event-sponsor.model');
const mongoose = require('mongoose');
const { admin } = require('../config/firebase');

/**
 * Get all events with optional filtering
 */
// Simplified version of getAllEvents that just returns all events without any populate calls
const getAllEvents = async (req, res, next) => {
  try {
    console.log('Controller: Fetching ALL events (with no filters or populate)');

    // Execute query to get all events WITHOUT trying to populate performers
    const events = await Event.find({}).sort({ startDate: 1 });

    console.log(`Found ${events.length} total events in database`);

    // Calculate status based on dates
    const now = new Date();
    const eventsWithStatus = events.map((event) => {
      const eventObj = event.toObject();

      // Ensure we always have status for each event
      if (event.startDate <= now && event.endDate >= now) {
        eventObj.status = 'ongoing';
      } else if (event.startDate > now) {
        eventObj.status = 'upcoming';
      } else {
        eventObj.status = 'completed';
      }

      return eventObj;
    });

    // Debug output to show fields in first event (if any)
    if (eventsWithStatus.length > 0) {
      console.log('First event fields:', Object.keys(eventsWithStatus[0]));
    }

    // Return all events directly
    console.log(`Returning ${eventsWithStatus.length} events to client`);
    res.json({
      events: eventsWithStatus,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    next(error);
  }
};

/**
 * Get event by ID
 */
const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`Controller: Fetching event with ID: ${id}`);

    // Handle both ObjectId and string IDs
    let eventId;
    try {
      eventId = mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id;
      console.log('Using ObjectId:', eventId);
    } catch (e) {
      eventId = id;
      console.log('Using string ID:', eventId);
    }

    // Query with fallback for different ID formats BUT WITHOUT POPULATE
    const event = await Event.findOne({
      $or: [{ _id: eventId }, { id: id }],
    }); // Removed the populate that was causing issues

    if (!event) {
      console.log(`Event not found: ${id}`);
      return res.status(404).json({ error: 'Event not found' });
    }

    console.log(`Found event: ${event.name}`);

    // Calculate status based on dates if not set
    const now = new Date();
    const eventObj = event.toObject();

    if (!eventObj.status) {
      if (event.startDate <= now && event.endDate >= now) {
        eventObj.status = 'ongoing';
      } else if (event.startDate > now) {
        eventObj.status = 'upcoming';
      } else {
        eventObj.status = 'completed';
      }
    }

    // Get event sponsors - try/catch in case EventSponsor model isn't defined
    try {
      const eventSponsors = await EventSponsor.find({ eventId: event._id });
      eventObj.sponsors = eventSponsors.map((es) => es.sponsorId);
    } catch (sponsorError) {
      console.log('Could not fetch sponsors, continuing without them');
      eventObj.sponsors = [];
    }

    console.log(`Returning event with ${eventObj.sponsors?.length || 0} sponsor IDs`);
    res.json(eventObj);
  } catch (error) {
    console.error(`Error fetching event ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * Create new event
 */
const createEvent = async (req, res, next) => {
  try {
    console.log('Controller: Creating new event');
    console.log('Request body:', JSON.stringify(req.body));

    // Create event with data from request body
    const newEvent = new Event({
      ...req.body,
      createdBy: req.user.uid,
      createdAt: new Date(),
    });

    // Calculate status based on dates if not provided
    if (!newEvent.status) {
      const now = new Date();
      if (newEvent.startDate <= now && newEvent.endDate >= now) {
        newEvent.status = 'ongoing';
      } else if (newEvent.startDate > now) {
        newEvent.status = 'upcoming';
      } else {
        newEvent.status = 'completed';
      }
    }

    const savedEvent = await newEvent.save();
    console.log(`Event created with ID: ${savedEvent._id}`);

    // Process sponsor associations if provided
    if (req.body.sponsors && Array.isArray(req.body.sponsors)) {
      const sponsorPromises = req.body.sponsors.map((sponsorId) => {
        return new EventSponsor({
          eventId: savedEvent._id,
          sponsorId: sponsorId,
          createdAt: new Date(),
        }).save();
      });

      await Promise.all(sponsorPromises);
      console.log(`Added ${req.body.sponsors.length} sponsors to event`);
    }

    res.status(201).json(savedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    next(error);
  }
};

/**
 * Update existing event
 */
const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`Controller: Updating event ${id}`);
    console.log('Update data:', JSON.stringify(req.body));

    // Handle both ObjectId and string IDs
    let eventId;
    try {
      eventId = mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id;
    } catch (e) {
      eventId = id;
    }

    // Find the event first
    const event = await Event.findOne({
      $or: [{ _id: eventId }, { id: id }],
    });

    if (!event) {
      console.log(`Event not found: ${id}`);
      return res.status(404).json({ error: 'Event not found' });
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedBy: req.user.uid,
      updatedAt: new Date(),
    };

    // Calculate status based on dates if not provided
    if (!updateData.status) {
      const now = new Date();
      if (updateData.startDate && updateData.endDate) {
        if (new Date(updateData.startDate) <= now && new Date(updateData.endDate) >= now) {
          updateData.status = 'ongoing';
        } else if (new Date(updateData.startDate) > now) {
          updateData.status = 'upcoming';
        } else {
          updateData.status = 'completed';
        }
      }
    }

    // Find and update the event
    const updatedEvent = await Event.findOneAndUpdate(
      {
        $or: [{ _id: eventId }, { id: id }],
      },
      updateData,
      { new: true, runValidators: true },
    );

    // Update sponsors if provided
    if (req.body.sponsors && Array.isArray(req.body.sponsors)) {
      // First remove existing associations
      await EventSponsor.deleteMany({ eventId: event._id });

      // Then add the new ones
      const sponsorPromises = req.body.sponsors.map((sponsorId) => {
        return new EventSponsor({
          eventId: event._id,
          sponsorId: sponsorId,
          createdAt: new Date(),
        }).save();
      });

      await Promise.all(sponsorPromises);
      console.log(`Updated sponsors: ${req.body.sponsors.length} sponsors associated`);
    }

    console.log(`Event ${id} updated successfully`);
    res.json(updatedEvent);
  } catch (error) {
    console.error(`Error updating event ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * Delete event
 */
const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`Controller: Deleting event ${id}`);

    // Handle both ObjectId and string IDs
    let eventId;
    try {
      eventId = mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id;
    } catch (e) {
      eventId = id;
    }

    // Find and delete the event
    const deletedEvent = await Event.findOneAndDelete({
      $or: [{ _id: eventId }, { id: id }],
    });

    if (!deletedEvent) {
      console.log(`Event not found: ${id}`);
      return res.status(404).json({ error: 'Event not found' });
    }

    // Also delete related records (sponsors, tasks, etc.)
    await Promise.all([
      EventSponsor.deleteMany({ eventId: deletedEvent._id }),
      // You could add more related data deletion here if needed
    ]);

    console.log(`Event ${id} and related data deleted successfully`);
    res.json({
      message: 'Event deleted successfully',
      id,
      name: deletedEvent.name,
    });
  } catch (error) {
    console.error(`Error deleting event ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * Get event interests (for reminders)
 */
const getEventInterests = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`Controller: Fetching interests for event ${id}`);

    // Handle both ObjectId and string IDs
    let eventId;
    try {
      eventId = mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id;
    } catch (e) {
      eventId = id;
    }

    // Find the event's interests
    const interests = await EventInterest.find({ eventId }).select(
      'userId userName userEmail reminderFrequency createdAt lastReminded',
    );

    console.log(`Found ${interests.length} interests for event ${id}`);
    res.json(interests);
  } catch (error) {
    console.error(`Error fetching interests for event ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventInterests,
};
