const Event = require('../models/event.model');
const EventSponsor = require('../models/event-sponsor.model');
const EventInterest = require('../models/event-interest.model'); 
const OrganizerEvent = require('../models/organizer-event.model');
const mongoose = require('mongoose');
const { admin } = require('../config/firebase');

const getAllEvents = async (req, res, next) => {
  try {
    console.log('Controller: Fetching ALL events');
    const { includeOrganizers } = req.query;

    // Fetch all events from MongoDB
    const events = await Event.find({});
    console.log(`Found ${events.length} events in the database`);

    // Transform events to include proper ID handling
    const formattedEvents = events.map(event => {
      // Convert to plain object
      const eventObj = event.toObject();
      
      // Create a new object with MongoDB _id used for the id field
      return {
        ...eventObj,
        id: event.id.toString(), 
      };
    });

    // If organizers are requested, fetch and include them
    if (includeOrganizers === 'true') {
      console.log('Including organizer information with events');
      
      // Fetch all organizer-event relationships
      const organizerEvents = await OrganizerEvent.find({});
      
      // Create a map of eventId -> organizer array
      const organizerMap = {};
      organizerEvents.forEach(oe => {
        if (!organizerMap[oe.eventId]) {
          organizerMap[oe.eventId] = [];
        }
        organizerMap[oe.eventId].push(oe.userId);
      });
      
      // Add organizers to each event
      formattedEvents.forEach(event => {
        const eventId = event.id || event._id;
        event.organizers = organizerMap[eventId] || [];
      });
      
      console.log('Added organizer information to events');
    }

    res.json({ events: formattedEvents });
  } catch (error) {
    console.error('Error in getAllEvents:', error);
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

const getManagedEvents = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.uid;
    console.log('Controller: Fetching events managed by organizer', userId);
    
    // If user is admin, return all events
    if (req.user.role === 'admin') {
      console.log('Admin user - returning all events');
      return getAllEvents(req, res, next);
    }
    
    // Find all event assignments for this user
    const organizedEvents = await OrganizerEvent.find({ userId });
    console.log(`Found ${organizedEvents.length} organizer assignments for user ${userId}`);
    
    if (organizedEvents.length === 0) {
      return res.json({ events: [] });
    }
    
    // Separate permanent and temporary event IDs
    const permanentEventIds = [];
    const temporaryEvents = [];
    
    organizedEvents.forEach(assignment => {
      if (assignment.isTemporary || assignment.eventId.startsWith('temp-')) {
        // For temporary events, we'll create placeholder objects
        temporaryEvents.push({
          id: assignment.eventId,
          name: `Draft Event (${assignment.eventId.substring(0, 8)}...)`,
          status: 'draft',
          isTemporary: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000), // +1 day
          color: '#CCCCCC'
        });
      } else if (mongoose.Types.ObjectId.isValid(assignment.eventId)) {
        permanentEventIds.push(mongoose.Types.ObjectId(assignment.eventId));
      }
    });
    
    // Find all permanent events
    const permanentEvents = permanentEventIds.length > 0 
      ? await Event.find({ _id: { $in: permanentEventIds } })
      : [];
    
    console.log(`Found ${permanentEvents.length} permanent events and ${temporaryEvents.length} temporary events`);
    
    // Calculate status for permanent events
    const now = new Date();
    const eventsWithStatus = permanentEvents.map((event) => {
      const eventObj = event.toObject();
      
      // Ensure event has status
      if (event.startDate <= now && event.endDate >= now) {
        eventObj.status = 'ongoing';
      } else if (event.startDate > now) {
        eventObj.status = 'upcoming';
      } else {
        eventObj.status = 'completed';
      }
      
      return eventObj;
    });
    
    // Combine permanent and temporary events
    res.json({ events: [...eventsWithStatus, ...temporaryEvents] });
  } catch (error) {
    console.error('Error fetching managed events:', error);
    next(error);
  }
};

const toggleEventInterest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { interestLevel = 'interested' } = req.body;
    
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.uid;
    
    // Validate interest level
    if (!['interested', 'attending'].includes(interestLevel)) {
      return res.status(400).json({ 
        error: 'Invalid interest level. Must be "interested" or "attending"'
      });
    }
    
    // Check if the event exists
    const event = await Event.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id },
        { id: id }
      ]
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if interest already exists
    const existingInterest = await EventInterest.findOne({ 
      userId, 
      eventId: event._id.toString() 
    });
    
    if (existingInterest) {
      // If interest level is the same, remove the interest (toggle off)
      if (existingInterest.interestLevel === interestLevel) {
        await EventInterest.deleteOne({ _id: existingInterest._id });
        return res.json({ status: 'removed', interestLevel: null });
      } 
      // Otherwise update the interest level
      else {
        existingInterest.interestLevel = interestLevel;
        await existingInterest.save();
        return res.json({ status: 'updated', interestLevel });
      }
    } 
    // Create new interest
    else {
      const newInterest = new EventInterest({
        userId,
        eventId: event._id.toString(),
        interestLevel
      });
      
      await newInterest.save();
      return res.status(201).json({ status: 'added', interestLevel });
    }
  } catch (error) {
    console.error('Error toggling event interest:', error);
    next(error);
  }
};

/**
 * Check if user is interested in an event
 */
const checkEventInterest = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.uid;
    
    // Check if the event exists
    const event = await Event.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id },
        { id: id }
      ]
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Find interest
    const interest = await EventInterest.findOne({ 
      userId, 
      eventId: event._id.toString() 
    });
    
    if (interest) {
      return res.json({ status: 'found', interestLevel: interest.interestLevel });
    } else {
      return res.json({ status: 'not-found', interestLevel: null });
    }
  } catch (error) {
    console.error('Error checking event interest:', error);
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
  getManagedEvents,
  toggleEventInterest,
  checkEventInterest
};
