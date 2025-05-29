import path from 'path';
import fs from 'fs';

import mongoose from 'mongoose';
import multer from 'multer';

import Event from '../models/event.model';
import EventSponsor from '../models/event-sponsor.model';
import EventInterest from '../models/event-interest.model';
import OrganizerEvent from '../models/organizer-event.model';
import notificationService from '../services/notification.service';

// const { admin } = require('../config/firebase');

const cloudinary = require('cloudinary').v2;

const configureCloudinary = () => {
  if (process.env.CLOUDINARY_CLOUD_NAME && !cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
};

configureCloudinary();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/events');

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExt = path.extname(file.originalname);
    const eventId = req.body.eventId || 'unknown-event';
    cb(null, `event-${eventId}-${uniqueSuffix}${fileExt}`);
  },
});

// Single image upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Only allow image files
    const allowedFileTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFileTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
}).single('image');

// Multiple image upload middleware
const uploadMultiple = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
  fileFilter: function (req, file, cb) {
    // Only allow image files
    const allowedFileTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFileTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
}).array('images', 10); // Max 10 images

// Single image upload controller
const uploadEventImage = (req, res) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      console.error('Other upload error:', err);
      return res.status(500).json({
        success: false,
        message: `Server error: ${err.message}`,
      });
    }

    // Check if file exists
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    // Try to update event or perform other operations
    try {
      // Create image URL
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/events/${req.file.filename}`;

      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        imageUrl: imageUrl,
        imageType: req.body.imageType || 'cover',
      });
    } catch (error) {
      // Delete the file if any error occurs after upload
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting file:', unlinkErr);
        });
      }
      return res.status(500).json({
        success: false,
        message: `Server error after upload: ${error.message}`,
      });
    }
  });
};

const uploadMultipleEventImages = (req, res) => {
  uploadMultiple(req, res, async function (err) {
    // Track uploaded files to delete them on error
    const filesToDelete = [];

    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      console.error('Other upload error:', err);
      return res.status(500).json({
        success: false,
        message: `Server error: ${err.message}`,
      });
    }

    // Check if files exist
    if (!req.files || req.files.length === 0) {
      console.error('No files in request');
      return res.status(400).json({
        success: false,
        message: 'No image files provided',
      });
    }

    try {
      // Create image URLs
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const imageUrls = req.files.map((file) => `${baseUrl}/uploads/events/${file.filename}`);

      // commented out the part where the event is getting updated (i dont want to save images in static storage, only db)

      // Return success response with image URLs
      return res.status(200).json({
        success: true,
        message: 'Images uploaded successfully',
        imageUrls: imageUrls,
      });
    } catch (error) {
      console.error('Error in upload handler:', error);

      // Delete all uploaded files on any error
      deleteUploadedFiles(filesToDelete);

      return res.status(500).json({
        success: false,
        message: 'Server error processing uploaded files',
      });
    }
  });
};

// Helper function to delete uploaded files
const deleteUploadedFiles = (filePaths) => {
  if (!filePaths || !filePaths.length) return;

  filePaths.forEach((filePath) => {
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Error deleting file ${filePath}:`, err);
      else console.warn(`Successfully deleted file: ${filePath}`);
    });
  });
};

const storeImageReference = async (req, res) => {
  try {
    const { eventId, imageType, imageUrl, cloudinaryPublicId } = req.body;

    // Log received data for debugging

    // Validate input
    if (!eventId || !imageType || !imageUrl || !cloudinaryPublicId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Get the event - handle both string IDs and ObjectIds
    const eventQuery = {
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(eventId) ? mongoose.Types.ObjectId(eventId) : null },
        { id: eventId },
      ],
    };

    const event = await Event.findOne(eventQuery);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Handle different image types
    if (imageType === 'cover') {
      // For cover images, just update the fields directly
      await Event.updateOne(
        { _id: event._id },
        {
          $set: {
            coverImageUrl: imageUrl,
            coverImagePublicId: cloudinaryPublicId,
          },
        },
      );

      return res.status(200).json({
        success: true,
        message: 'Cover image reference stored successfully',
      });
    } else if (imageType === 'slideshow') {
      await Event.updateOne({ _id: event._id, slideshowImages: { $exists: false } }, { $set: { slideshowImages: [] } });

      await Event.updateOne(
        { _id: event._id, slideshowImagePublicIds: { $exists: false } },
        { $set: { slideshowImagePublicIds: [] } },
      );

      await Event.updateOne(
        { _id: event._id, $expr: { $eq: [{ $type: '$slideshowImages' }, 'string'] } },
        {
          $set: {
            slideshowImages: [],
            slideshowImagePublicIds: [],
          },
        },
      );

      await Event.updateOne(
        { _id: event._id },
        {
          $push: {
            slideshowImages: imageUrl,
            slideshowImagePublicIds: cloudinaryPublicId,
          },
        },
      );

      return res.status(200).json({
        success: true,
        message: 'Slideshow image reference stored successfully',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid image type',
    });
  } catch (error) {
    console.error('Error storing image reference:', error);
    // Add more detailed error logging
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    return res.status(500).json({
      success: false,
      message: 'Server error storing image reference',
      error: error.message,
    });
  }
};

const storeMultipleImageReferences = async (req, res) => {
  try {
    const { eventId, imageType, imageUrls, cloudinaryPublicIds } = req.body;

    // Validate input
    if (
      !eventId ||
      !imageType ||
      !imageUrls ||
      !imageUrls.length ||
      !cloudinaryPublicIds ||
      !cloudinaryPublicIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Get the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // For slideshow images
    if (imageType === 'slideshow') {
      // Check if slideshowImages is a string or doesn't exist
      if (!event.slideshowImages || typeof event.slideshowImages === 'string') {
        // Initialize as empty array or convert string to array if it has content
        let initialArray = [];
        if (typeof event.slideshowImages === 'string' && event.slideshowImages.trim()) {
          initialArray = event.slideshowImages.split(',').map((url) => url.trim());
        }

        // Add the new URLs
        initialArray.push(...imageUrls);

        // Set the entire arrays
        await Event.updateOne(
          { _id: event._id },
          {
            $set: {
              slideshowImages: initialArray,
              slideshowImagePublicIds: cloudinaryPublicIds,
            },
          },
        );
      } else {
        // It's already an array, so we can use $push with $each
        await Event.updateOne(
          { _id: event._id },
          {
            $push: {
              slideshowImages: { $each: imageUrls },
              slideshowImagePublicIds: { $each: cloudinaryPublicIds },
            },
          },
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Image references stored successfully',
    });
  } catch (error) {
    console.error('Error storing image references:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error storing image references',
      error: error.message,
    });
  }
};

// New function for deletion by full URL
const deleteEventImageByUrl = async (req, res) => {
  try {
    const { eventId, imageUrl, isCoverImage } = req.body;

    if (!eventId || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: eventId or imageUrl',
      });
    }

    // Find the event first
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Extract domain parts to find potential publicId
    let publicId = null;

    if (imageUrl.includes('cloudinary.com')) {
      // This is a Cloudinary image - try to extract public ID
      // Format varies but is often like: cloudinary.com/[cloud_name]/image/upload/[version]/[public_id].[ext]
      const urlParts = imageUrl.split('/');
      const uploadIndex = urlParts.indexOf('upload');

      if (uploadIndex >= 0 && uploadIndex < urlParts.length - 1) {
        // Get everything after upload, skip the version (v1234) part if it exists
        let afterUpload = urlParts.slice(uploadIndex + 1).join('/');

        // Remove version prefix if it exists
        if (afterUpload.match(/^v\d+\//)) {
          afterUpload = afterUpload.replace(/^v\d+\//, '');
        }

        // Remove file extension
        publicId = afterUpload.replace(/\.[^/.]+$/, '');

        // Try to delete from Cloudinary if we have the config
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          try {
            configureCloudinary();
          } catch (cloudinaryError) {
            console.error('Error deleting from Cloudinary:', cloudinaryError);
            // Continue with database update even if Cloudinary fails
          }
        }
      }
    }

    // Update the event in the database
    if (isCoverImage) {
      // Update cover image
      await Event.updateOne({ _id: eventId }, { $set: { coverImageUrl: '', coverImagePublicId: '' } });
    } else {
      // Update slideshow images
      // For string format
      if (typeof event.slideshowImages === 'string') {
        const updatedImages = event.slideshowImages
          .split(',')
          .map((url) => url.trim())
          .filter((url) => url !== imageUrl)
          .join(',');

        await Event.updateOne({ _id: eventId }, { $set: { slideshowImages: updatedImages } });
      }
      // For array format
      else if (Array.isArray(event.slideshowImages)) {
        const updatedImages = event.slideshowImages.filter((url) => url !== imageUrl);

        await Event.updateOne({ _id: eventId }, { $set: { slideshowImages: updatedImages } });
      }

      // Also remove from publicIds array if we found a publicId
      if (publicId && Array.isArray(event.slideshowImagePublicIds)) {
        await Event.updateOne({ _id: eventId }, { $pull: { slideshowImagePublicIds: publicId } });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting image by URL:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting image',
      error: error.message,
    });
  }
};

// Delete an image from Cloudinary
const deleteEventImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    // Set up Cloudinary configuration if using Cloudinary
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      configureCloudinary();
      try {
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database update even if Cloudinary fails
      }
    }

    // Find all events that might have this image
    const events = await Event.find({
      $or: [
        { coverImagePublicId: publicId },
        { coverImageUrl: { $regex: publicId } },
        { slideshowImages: { $elemMatch: { $regex: publicId } } },
        { slideshowImagePublicIds: publicId },
      ],
    });

    if (!events || events.length === 0) {
      console.warn('No events found with publicId:', publicId);
    }

    // Update slideshow images - more complex operation as we need to filter arrays
    for (const event of events) {
      // Handle string slideshowImages (for backward compatibility)
      if (typeof event.slideshowImages === 'string') {
        const updatedImages = event.slideshowImages
          .split(',')
          .map((url) => url.trim())
          .filter((url) => !url.includes(publicId))
          .join(',');

        await Event.updateOne({ _id: event._id }, { $set: { slideshowImages: updatedImages } });
      }
      // Handle array slideshowImages
      else if (Array.isArray(event.slideshowImages)) {
        const updatedImages = event.slideshowImages.filter((url) => !url.includes(publicId));

        await Event.updateOne({ _id: event._id }, { $set: { slideshowImages: updatedImages } });
      }

      // Also update the publicIds array if it exists
      if (Array.isArray(event.slideshowImagePublicIds)) {
        await Event.updateOne({ _id: event._id }, { $pull: { slideshowImagePublicIds: publicId } });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting image',
      error: error.message,
    });
  }
};

module.exports = {
  // ...other exports
  storeImageReference,
  storeMultipleImageReferences,
  deleteEventImage,
};

const getAllEvents = async (req, res, next) => {
  try {
    const { includeOrganizers } = req.query;

    // Fetch all events from MongoDB
    const events = await Event.find({});

    // Transform events to include proper ID handling
    const formattedEvents = events.map((event) => {
      // Convert to plain object
      const eventObj = event.toObject();

      // Create a new object with MongoDB _id used for the id field
      return {
        ...eventObj,
        // Safely handle the case where event.id might be undefined
        id: event._id ? event._id.toString() : event.id ? event.id.toString() : undefined,
      };
    });

    // If organizers are requested, fetch and include them
    if (includeOrganizers === 'true') {
      // Fetch all organizer-event relationships
      const organizerEvents = await OrganizerEvent.find({});

      // Create a map of eventId -> organizer array
      const organizerMap = {};
      organizerEvents.forEach((oe) => {
        if (!organizerMap[oe.eventId]) {
          organizerMap[oe.eventId] = [];
        }
        organizerMap[oe.eventId].push(oe.userId);
      });

      // Add organizers to each event
      formattedEvents.forEach((event) => {
        const eventId = event.id || (event._id ? event._id.toString() : '');
        event.organizers = organizerMap[eventId] || [];
      });
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

    // Handle both ObjectId and string IDs
    let eventId;
    try {
      eventId = mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id;
    } catch (e) {
      console.warn('ID could not be converted to ObjectId, using as string:', e);
      eventId = id;
    }

    // Query with fallback for different ID formats BUT WITHOUT POPULATE
    const event = await Event.findOne({
      $or: [{ _id: eventId }, { id: id }],
    }); // Removed the populate that was causing issues

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

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
      console.error('Error fetching sponsors for event:', sponsorError);
      eventObj.sponsors = [];
    }

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
    }

    notificationService.sendNotification(
      'event:created',
      {
        eventId: newEvent._id,
        name: newEvent.name,
        createdBy: req.user.displayName || req.user.email || req.user.uid,
        createdAt: new Date(),
      },
      'authenticated',
    );

    return res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    next(error);
  }
};

const validateEventData = (data) => {
  const errors = [];

  // Required fields
  if (data.name !== undefined && (!data.name || data.name.trim() === '')) {
    errors.push('Event name cannot be empty');
  }

  // Type validation
  if (data.startDate && isNaN(new Date(data.startDate).getTime())) {
    errors.push('Invalid start date format');
  }
  if (data.endDate && isNaN(new Date(data.endDate).getTime())) {
    errors.push('Invalid end date format');
  }

  // Logic validation
  if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate))
    errors.push('End date must be after start date');

  return errors;
};

/**
 * Update existing event
 */
const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Handle both ObjectId and string IDs
    let eventId;
    try {
      eventId = mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id;
    } catch (e) {
      console.warn('ID could not be converted to ObjectId, using as string:', e);
      eventId = id;
    }

    // Find the event first
    const event = await Event.findOne({
      $or: [{ _id: eventId }, { id: id }],
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const validationErrors = validateEventData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid event data',
        details: validationErrors,
      });
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
    }

    notificationService.sendNotification(
      'event:updated',
      {
        eventId: updatedEvent._id,
        name: updatedEvent.name,
        updatedBy: req.user.displayName || req.user.email || req.user.uid,
        updatedAt: new Date(),
      },
      'authenticated',
    );

    return res.json(updatedEvent);
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

    // Handle both ObjectId and string IDs
    let eventId;
    try {
      eventId = mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id;
    } catch (e) {
      console.warn('ID could not be converted to ObjectId, using as string:', e);
      eventId = id;
    }

    // Find and delete the event
    const deletedEvent = await Event.findOneAndDelete({
      $or: [{ _id: eventId }, { id: id }],
    });

    if (!deletedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Also delete related records (sponsors, tasks, etc.)
    await Promise.all([
      EventSponsor.deleteMany({ eventId: deletedEvent._id }),
      // You could add more related data deletion here if needed
    ]);

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

    // Handle both ObjectId and string IDs
    let eventId;
    try {
      eventId = mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id;
    } catch (e) {
      console.warn('ID could not be converted to ObjectId, using as string:', e);
      eventId = id;
    }

    // Find the event's interests
    const interests = await EventInterest.find({ eventId }).select(
      'userId userName userEmail reminderFrequency createdAt lastReminded',
    );

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

    // If user is admin, return all events
    if (req.user.role === 'admin') {
      return getAllEvents(req, res, next);
    }

    // Find all event assignments for this user
    const organizedEvents = await OrganizerEvent.find({ userId });

    if (organizedEvents.length === 0) {
      return res.json({ events: [] });
    }

    // Separate permanent and temporary event IDs
    const permanentEventIds = [];
    const temporaryEvents = [];

    organizedEvents.forEach((assignment) => {
      if (assignment.isTemporary || assignment.eventId.startsWith('temp-')) {
        // For temporary events, we'll create placeholder objects
        temporaryEvents.push({
          id: assignment.eventId,
          name: `Draft Event (${assignment.eventId.substring(0, 8)}...)`,
          status: 'draft',
          isTemporary: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000), // +1 day
          color: '#CCCCCC',
        });
      } else if (mongoose.Types.ObjectId.isValid(assignment.eventId)) {
        permanentEventIds.push(mongoose.Types.ObjectId(assignment.eventId));
      }
    });

    // Find all permanent events
    const permanentEvents = permanentEventIds.length > 0 ? await Event.find({ _id: { $in: permanentEventIds } }) : [];

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
    const userName = req.user.displayName || req.user.email || req.user.uid;

    // Find event
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if interest already exists
    const existingInterest = await EventInterest.findOne({
      userId,
      eventId: event._id.toString(),
    });

    if (existingInterest) {
      // If we're removing the interest (toggle off)
      if (existingInterest.interestLevel === interestLevel) {
        await EventInterest.findByIdAndDelete(existingInterest._id);

        notificationService.sendNotification(
          'event:liked',
          {
            eventId: event._id.toString(),
            name: event.name,
            userName,
            action: 'removed',
            interestLevel: interestLevel || null,
          },
          'authenticated',
        );

        return res.json({ status: 'removed' });
      } else {
        // Update interest level
        existingInterest.interestLevel = interestLevel;
        await existingInterest.save();

        // Send notification about updated interest
        notificationService.sendNotification(
          'event:liked',
          {
            eventId: event._id,
            name: event.name,
            userName: userName,
            interestLevel: interestLevel,
            action: 'updated',
          },
          'authenticated',
        );

        return res.json({ status: 'updated', interestLevel });
      }
    } else {
      // Create new interest
      const eventInterest = new EventInterest({
        userId,
        userName,
        userEmail: req.user.email,
        eventId: event._id.toString(),
        eventName: event.name,
        eventDate: event.startDate,
        interestLevel,
        createdAt: new Date(),
      });

      await eventInterest.save();

      // Send notification about new interest
      notificationService.sendNotification(
        'event:liked',
        {
          eventId: event._id,
          name: event.name,
          userName: userName,
          interestLevel: interestLevel,
          action: 'added',
        },
        'authenticated',
      );

      return res.json({ status: 'updated', interestLevel });
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
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id }, { id: id }],
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Find interest
    const interest = await EventInterest.findOne({
      userId,
      eventId: event._id.toString(),
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
  checkEventInterest,
  uploadEventImage,
  uploadMultipleEventImages,
  storeImageReference,
  storeMultipleImageReferences,
  deleteEventImage,
  deleteEventImageByUrl,
};
