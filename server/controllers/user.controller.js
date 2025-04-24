const mongoose = require('mongoose');
const Event = require('../models/event.model');
const OrganizerEvent = require('../models/organizer-event.model');
const EventInterest = require('../models/event-interest.model');
const User = require('../models/user.model');
const admin = require('../config/firebase');

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user from Firebase
    const userRecord = await admin.auth().getUser(req.uid);

    // Create a user object with the necessary fields
    const user = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || userRecord.email.split('@')[0],
      photoURL: userRecord.photoURL,
      role: (userRecord.customClaims && userRecord.customClaims.role) || 'user',
      createdAt: userRecord.metadata.creationTime,
      lastLogin: userRecord.metadata.lastSignInTime,
    };

    res.status(200).json({ user });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
};

// Update current user profile
exports.updateCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { displayName, photoURL } = req.body;

    // Update user in Firebase
    await admin.auth().updateUser(req.uid, {
      displayName,
      photoURL,
    });

    // Get updated user
    const userRecord = await admin.auth().getUser(req.uid);

    res.status(200).json({
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        role: (userRecord.customClaims && userRecord.customClaims.role) || 'user',
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};

// Get all users from Firebase
exports.getAllUsers = async (req, res) => {
  try {
    console.log('Getting all users from Firebase...');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Firebase has different pagination

    // Firebase Auth listUsers returns up to 1000 users at a time with pagination
    let users = [];
    let nextPageToken;

    // Get batch of users from Firebase
    const listUsersResult = await admin.auth().listUsers(limit);
    users = listUsersResult.users;

    console.log(`Found ${users.length} users from Firebase`);

    // Format user data to match expected format in frontend
    const formattedUsers = users.map((user) => {
      // Extract role from custom claims
      const role = (user.customClaims && user.customClaims.role) || 'user';

      return {
        _id: user.uid, // Use uid as _id for compatibility
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        role: role,
        createdAt: user.metadata.creationTime,
        lastLogin: user.metadata.lastSignInTime,
        photoURL: user.photoURL,
        // Without MongoDB, we won't have managed events
        managedEvents: [],
      };
    });

    res.status(200).json({
      users: formattedUsers,
      pagination: {
        total: users.length,
        pages: 1,
        page: 1,
        limit: users.length,
      },
    });
  } catch (error) {
    console.error('Error getting users from Firebase:', error);
    res.status(500).json({ error: 'Failed to retrieve users: ' + error.message });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { role } = req.body;

    // Validate role
    if (!['user', 'organizer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Update Firebase custom claims
    await admin.auth().setCustomUserClaims(userId, { role });

    // Get updated user
    const userRecord = await admin.auth().getUser(userId);

    res.status(200).json({
      user: {
        _id: userRecord.uid,
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: role,
        photoURL: userRecord.photoURL,
      },
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Delete from Firebase
    await admin.auth().deleteUser(userId);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

exports.assignEventToOrganizer = async (req, res) => {
  try {
    const userId = req.params.userId;
    const eventId = req.params.eventId;
    
    console.log(`Server: Assigning event ${eventId} to user ${userId}`);
    
    // Check if this is a temporary event ID
    const isTemporaryEvent = eventId.startsWith('temp-');
    console.log(`Is temporary event: ${isTemporaryEvent}`);
    
    // Only validate against MongoDB if it's not a temporary event
    if (!isTemporaryEvent) {
      // Check if the event exists
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID format' });
      }
      
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
    }
    
    // Get user from Firebase
    let userRecord;
    try {
      userRecord = await admin.auth().getUser(userId);
    } catch (firebaseError) {
      console.error('Firebase error getting user:', firebaseError);
      return res.status(404).json({ error: 'User not found in Firebase' });
    }
    
    // Set custom claims to make user an organizer if not already
    try {
      const customClaims = userRecord.customClaims || {};
      if (customClaims.role !== 'organizer' && customClaims.role !== 'admin') {
        console.log(`Updating Firebase role for user ${userId} to organizer`);
        await admin.auth().setCustomUserClaims(userId, { 
          ...customClaims,
          role: 'organizer' 
        });
      }
    } catch (claimsError) {
      console.error('Error setting Firebase custom claims:', claimsError);
      // Continue anyway - we'll still create the relationship in MongoDB
    }
    
    // Ensure user exists in MongoDB
    let user = await User.findOne({ uid: userId });
    
    if (!user) {
      // Create user in MongoDB if not exists
      try {
        let user = await User.findOne({ uid: userId });
        
        if (!user) {
          // Create new user - IMPORTANT: use uid field, not userId
          user = new User({
            uid: userId,  // This is the critical field - must use uid, not userId
            email: userRecord.email,
            displayName: userRecord.displayName || userRecord.email.split('@')[0],
            photoURL: userRecord.photoURL,
            role: 'organizer',
            lastLogin: new Date()
          });
          await user.save();
          console.log(`Created new MongoDB user for ${userId}`);
        } else {
          // Update existing user
          user.role = 'organizer';
          await user.save();
          console.log(`Updated existing MongoDB user ${userId} to organizer role`);
        }
      } catch (userUpdateError) {
        console.error('Error updating user in MongoDB:', userUpdateError);
        // Continue anyway
      }
    }
    
    // Create the organizer-event relationship
    try {
      // First check if relationship already exists
      const existingRelationship = await OrganizerEvent.findOne({
        userId: userId,
        eventId: eventId
      });
      
      if (existingRelationship) {
        console.log('User is already an organizer for this event');
        return res.status(200).json({
          message: 'User is already an organizer for this event',
          user: {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            role: 'organizer'
          },
          eventId: eventId,
          isTemporary: isTemporaryEvent
        });
      }
      
      // Create new relationship
      const organizerEvent = new OrganizerEvent({
        userId: userId,  // This is correct - continue using userId here
        eventId: eventId,
        isTemporary: isTemporaryEvent,
        assignedBy: req.user?.uid || 'system'
      });
      
      await organizerEvent.save();
      console.log(`Successfully created organizer-event relationship between ${userId} and ${eventId}`);
    } catch (saveError) {
      console.error('Error saving organizer-event relationship:', saveError);
      throw saveError;
    }
    
    console.log(`User ${userId} is now assigned to event ${eventId}`);
    
    res.status(200).json({
      message: 'User assigned as organizer for event',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: 'organizer'
      },
      eventId: eventId,
      isTemporary: isTemporaryEvent
    });
  } catch (error) {
    console.error('Error assigning event to organizer:', error);
    res.status(500).json({ error: 'Failed to assign organizer to event', details: error.message });
  }
};

exports.removeEventFromOrganizer = async (req, res) => {
  try {
    const userId = req.params.userId;
    const eventId = req.params.eventId;
    
    console.log(`Server: Removing event ${eventId} from user ${userId}`);
    
    // Delete the organizer-event relationship
    const result = await OrganizerEvent.deleteOne({ userId, eventId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Organizer assignment not found' });
    }
    
    // Check if user still organizes any events
    const organizerCount = await OrganizerEvent.countDocuments({ userId });
    
    // If this was the last event, update user role if necessary
    if (organizerCount === 0) {
      // Check if user exists in MongoDB
      const user = await User.findOne({ uid: userId });
      
      if (user && user.role === 'organizer') {
        // Only update if they don't have admin role
        const userRecord = await admin.auth().getUser(userId);
        const customClaims = userRecord.customClaims || {};
        
        if (customClaims.role === 'organizer') {
          // Update Firebase claims - change back to regular user
          await admin.auth().setCustomUserClaims(userId, { 
            ...customClaims,
            role: 'user' 
          });
          
          // Update MongoDB user role
          user.role = 'user';
          await user.save();
        }
      }
    }
    
    res.status(200).json({
      message: 'Event removed from organizer',
      remaining: organizerCount
    });
  } catch (error) {
    console.error('Error removing event from organizer:', error);
    res.status(500).json({ error: 'Failed to remove event from organizer' });
  }
};

exports.getUserEvents = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) { // Make sure we check req.user.uid, not req.uid
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.uid; // Use this consistently
    console.log(`Fetching events for user ${userId}`);
    
    const eventInterests = await EventInterest.find({ userId });
    
    console.log(`Found ${eventInterests.length} event interests for user ${userId}`);
    
    if (eventInterests.length === 0) {
      console.log('No event interests found, returning empty array');
      return res.json({ events: [] });
    }
    
    // Extract the event IDs
    const eventIds = eventInterests.map(interest => interest.eventId);
    console.log('Event IDs from interests:', eventIds);
    
    // Fetch the events
    let events = [];
    const Event = require('../models/event.model');
    
    // First, try direct string ID lookup which is more likely to work
    try {
      events = await Event.find({ id: { $in: eventIds } });
      console.log(`Found ${events.length} events by string ID lookup`);
    } catch (error) {
      console.error('Error during string ID lookup:', error);
    }
    
    // If we didn't find all events by string ID, try ObjectId lookup as fallback
    if (events.length < eventIds.length) {
      try {
        // Only try to convert IDs that are valid ObjectIds
        const mongoose = require('mongoose');
        const objectIdEventIds = eventIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => mongoose.Types.ObjectId(id));
        
        if (objectIdEventIds.length > 0) {
          const objectIdEvents = await Event.find({ _id: { $in: objectIdEventIds } });
          console.log(`Found ${objectIdEvents.length} additional events by ObjectId lookup`);
          
          // Merge events, avoiding duplicates
          const existingIds = events.map(e => e.id || e._id.toString());
          const newEvents = objectIdEvents.filter(e => 
            !existingIds.includes(e.id || e._id.toString())
          );
          
          events = [...events, ...newEvents];
        }
      } catch (error) {
        console.error('Error during ObjectId lookup:', error);
      }
    }
    
    console.log(`Found ${events.length} total events out of ${eventIds.length} interest records`);
    
    // Format events with interest level
    const formattedEvents = events.map(event => {
      // Convert event to a plain object
      const eventObj = event.toObject ? event.toObject() : {...event};
      
      // Ensure id field is set
      if (!eventObj.id && eventObj._id) {
        eventObj.id = eventObj._id.toString();
      }
      
      // Find corresponding interest
      const interest = eventInterests.find(i => 
        i.eventId === eventObj.id || i.eventId === (eventObj._id ? eventObj._id.toString() : null)
      );
      
      // Add interest level
      eventObj.interestLevel = interest ? interest.interestLevel : 'interested';
      
      return eventObj;
    });
    
    console.log(`Returning ${formattedEvents.length} events to client`);
    return res.json({ events: formattedEvents });
  } catch (error) {
    console.error('Error getting user events:', error);
    res.status(500).json({ error: 'Failed to retrieve user events' });
  }
};

exports.setAdminRole = async (req, res) => {
  try {
    if (!req.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Set admin role in Firebase
    await admin.auth().setCustomUserClaims(req.uid, { role: 'admin' });

    // Get updated user
    const userRecord = await admin.auth().getUser(req.uid);

    res.status(200).json({
      message: 'Admin role set successfully, please log out and log back in.',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Error setting admin role:', error);
    res.status(500).json({ error: 'Failed to set admin role' });
  }
};
