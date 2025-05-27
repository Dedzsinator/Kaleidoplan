import admin from 'firebase-admin';
import cors from 'cors';
import express from 'express';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import mongoose from 'mongoose';

import serviceAccount from '../serviceAccountKey.json';

require('dotenv').config();

// Setup MongoDB connection with Mongoose
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kaleidoplan', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {});

// Define Mongoose schemas based on the new collection structure
const eventSchema = new mongoose.Schema({
  name: String,
  description: String,
  startDate: Date,
  endDate: Date,
  color: String,
  coverImageUrl: String,
  slideshowImages: [String],
  performers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Performer' }],
  createdBy: String,
  createdAt: Date,
  updatedAt: Date,
  location: String,
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
});

const performerSchema = new mongoose.Schema({
  name: String,
  bio: String,
  image: String,
  createdAt: Date,
  updatedAt: Date,
});

const taskSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  name: String,
  description: String,
  deadline: Date,
  assignedTo: String,
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  createdAt: Date,
  updatedAt: Date,
  createdBy: String,
});

const sponsorSchema = new mongoose.Schema({
  name: String,
  description: String,
  website: String,
  createdAt: Date,
  updatedAt: Date,
});

const eventSponsorSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sponsor' },
  createdAt: Date,
});

const logSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'] },
  changedBy: String,
  changedAt: Date,
});

const eventInterestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String },
  userEmail: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Event' },
  eventName: { type: String },
  eventDate: { type: Date },
  reminderFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly',
  },
  createdAt: { type: Date, default: Date.now },
  lastReminded: { type: Date },
});

// Create Mongoose models
const Event = mongoose.model('Event', eventSchema);
const Performer = mongoose.model('Performer', performerSchema);
const Task = mongoose.model('Task', taskSchema);
const Sponsor = mongoose.model('Sponsor', sponsorSchema);
const EventSponsor = mongoose.model('EventSponsor', eventSponsorSchema);
const Log = mongoose.model('Log', logSchema);
const EventInterest = mongoose.model('EventInterest', eventInterestSchema);

// Setup Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No valid token' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      next();
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized - Error during authentication' });
  }
};

// Error handling middleware
app.use((err, req, res) => {
  console.error('Unhandled error in server:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message || 'Unknown error occurred',
  });
});

// PUBLIC ENDPOINTS (no auth required)

// Get all public events
app.get('/api/public/events', async (req, res) => {
  try {
    const events = await Event.find().populate('performers', 'name image');

    // Calculate status based on dates if not set
    const now = new Date();
    const eventsWithStatus = events.map((event) => {
      const eventObj = event.toObject();

      // If status is not set, calculate based on dates
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

    res.json(eventsWithStatus);
  } catch (error) {
    console.error('Error fetching public events:', error);
    res.status(500).json({ error: 'Failed to fetch public events' });
  }
});

app.get('/api/playlists/:id', async (req, res) => {
  try {
    const playlistId = req.params.id;
    // You could fetch from a database if you have one
    // For now, return a mock playlist
    const mockPlaylist = {
      _id: playlistId,
      name: `Playlist ${playlistId}`,
      description: 'Auto-generated playlist',
      tracks: {
        1: { name: 'Track 1', artist: 'Artist 1', duration: '3:45', spotifyId: '5ghIJDpPoe3CfHMGu71E6T' },
        2: { name: 'Track 2', artist: 'Artist 2', duration: '4:20', spotifyId: '7snQQk1zcKl8gZ92AnueZW' },
      },
    };
    res.json(mockPlaylist);
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// Get public event by ID
app.get('/api/public/events/:id', async (req, res) => {
  try {
    let eventId;
    try {
      eventId = new mongoose.Types.ObjectId(req.params.id);
    } catch (e) {
      console.warn('Invalid ObjectId format for event ID: ', e, req.params.id);
      // If ID is not valid ObjectId, try as string ID
      eventId = req.params.id;
    }

    const event = await Event.findOne({
      $or: [{ _id: eventId }, { id: req.params.id }],
    }).populate('performers', 'name bio image');

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

    res.json(eventObj);
  } catch (error) {
    console.error(`Error fetching public event ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch public event' });
  }
});

// AUTHENTICATED ENDPOINTS

// Get all events (authenticated)
app.get('/api/events', authenticate, async (req, res) => {
  try {
    const events = await Event.find().populate('performers', 'name image');

    // Calculate status based on dates if not set
    const now = new Date();
    const eventsWithStatus = events.map((event) => {
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

      return eventObj;
    });

    res.json(eventsWithStatus);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get event by ID (authenticated)
app.get('/api/events/:id', authenticate, async (req, res) => {
  try {
    let eventId;
    try {
      eventId = new mongoose.Types.ObjectId(req.params.id);
    } catch (e) {
      console.warn('Invalid ObjectId format for event ID: ', e, req.params.id);
      eventId = req.params.id;
    }

    const event = await Event.findOne({
      $or: [{ _id: eventId }, { id: req.params.id }],
    }).populate('performers', 'name bio image');

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

    // Get event sponsors if any
    const eventSponsors = await EventSponsor.find({ eventId: event._id }).populate('sponsorId', 'name website');

    eventObj.sponsors = eventSponsors.map((es) => es.sponsorId);

    res.json(eventObj);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Task routes
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    const { assignedTo, eventId } = req.query;
    const query = {};

    if (assignedTo) query.assignedTo = assignedTo;
    if (eventId) query.eventId = new mongoose.Types.ObjectId(eventId);

    const tasks = await Task.find(query).populate('eventId', 'name startDate endDate');

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.get('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    let taskId;
    try {
      taskId = new mongoose.Types.ObjectId(req.params.id);
    } catch (e) {
      console.warn('Invalid ObjectId format for task ID: ', e, req.params.id);
      taskId = req.params.id;
    }

    const task = await Task.findOne({
      $or: [{ _id: taskId }, { taskId: req.params.id }],
    }).populate('eventId', 'name startDate endDate');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

app.patch('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { status, updatedBy } = req.body;

    let taskId;
    try {
      taskId = new mongoose.Types.ObjectId(req.params.id);
    } catch (e) {
      console.warn('Invalid ObjectId format for task ID: ', e, req.params.id);
      taskId = req.params.id;
    }

    // Get the task to find its current status
    const task = await Task.findOne({
      $or: [{ _id: taskId }, { taskId: req.params.id }],
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update the task
    await Task.updateOne(
      {
        $or: [{ _id: taskId }, { taskId: req.params.id }],
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
          updatedBy,
        },
      },
    );

    // Create log entry
    await Log.create({
      taskId: task._id,
      status: status.replace('-', '_'),
      changedBy: updatedBy,
      changedAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Task log routes
app.get('/api/taskLogs', authenticate, async (req, res) => {
  try {
    const { taskId } = req.query;
    const query = {};

    if (taskId) {
      try {
        query.taskId = new mongoose.Types.ObjectId(taskId);
      } catch (e) {
        console.warn('Invalid ObjectId format for task ID: ', e, taskId);
        query.taskId = taskId;
      }
    }

    const logs = await Log.find(query).sort({ changedAt: -1 }).populate('taskId', 'name');

    res.json(logs);
  } catch (error) {
    console.error('Error fetching task logs:', error);
    res.status(500).json({ error: 'Failed to fetch task logs' });
  }
});

// Event interest (reminder) endpoints
app.post('/api/events/:eventId/subscribe', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId, userName, userEmail, reminderFrequency } = req.body;

    // Find the event first to get details
    let eventObjectId;
    try {
      eventObjectId = new mongoose.Types.ObjectId(eventId);
    } catch (e) {
      console.warn('Invalid ObjectId format for event ID: ', e, eventId);
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    const event = await Event.findById(eventObjectId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Create or update interest
    const interest = await EventInterest.findOneAndUpdate(
      { userId, eventId: eventObjectId },
      {
        userId,
        userName,
        userEmail,
        eventId: eventObjectId,
        eventName: event.name,
        eventDate: event.startDate,
        reminderFrequency: reminderFrequency || 'weekly',
      },
      { upsert: true, new: true },
    );

    res.status(200).json({ success: true, interest });
  } catch (error) {
    console.error('Error subscribing to event:', error);
    res.status(500).json({ message: 'Error subscribing to event' });
  }
});

app.post('/api/events/:eventId/unsubscribe', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body;

    let eventObjectId;
    try {
      eventObjectId = new mongoose.Types.ObjectId(eventId);
    } catch (e) {
      console.warn('Invalid ObjectId format for event ID: ', e, eventId);
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    await EventInterest.findOneAndDelete({ userId, eventId: eventObjectId });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing from event:', error);
    res.status(500).json({ message: 'Error unsubscribing from event' });
  }
});

app.get('/api/events/:eventId/check-interest', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    let eventObjectId;
    try {
      eventObjectId = new mongoose.Types.ObjectId(eventId);
    } catch (e) {
      console.warn('Invalid ObjectId format for event ID: ', e, eventId);
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    const interest = await EventInterest.findOne({ userId, eventId: eventObjectId });

    res.status(200).json({ isInterested: !!interest });
  } catch (error) {
    console.error('Error checking interest:', error);
    res.status(500).json({ message: 'Error checking interest' });
  }
});

// Performer routes
app.get('/api/performers', authenticate, async (req, res) => {
  try {
    const performers = await Performer.find();
    res.json(performers);
  } catch (error) {
    console.error('Error fetching performers:', error);
    res.status(500).json({ error: 'Failed to fetch performers' });
  }
});

app.get('/api/performers/:id', authenticate, async (req, res) => {
  try {
    let performerId;
    try {
      performerId = new mongoose.Types.ObjectId(req.params.id);
    } catch (e) {
      console.warn('Invalid ObjectId format for performer ID: ', e, req.params.id);
      return res.status(400).json({ message: 'Invalid performer ID format' });
    }

    const performer = await Performer.findById(performerId);

    if (!performer) {
      return res.status(404).json({ error: 'Performer not found' });
    }

    res.json(performer);
  } catch (error) {
    console.error('Error fetching performer:', error);
    res.status(500).json({ error: 'Failed to fetch performer' });
  }
});

// Sponsor routes
app.get('/api/sponsors', authenticate, async (req, res) => {
  try {
    const sponsors = await Sponsor.find();
    res.json(sponsors);
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    res.status(500).json({ error: 'Failed to fetch sponsors' });
  }
});

app.get('/api/sponsors/:id', authenticate, async (req, res) => {
  try {
    let sponsorId;
    try {
      sponsorId = new mongoose.Types.ObjectId(req.params.id);
    } catch (e) {
      console.warn('Invalid ObjectId format for sponsor ID: ', e, req.params.id);
      return res.status(400).json({ message: 'Invalid sponsor ID format' });
    }

    const sponsor = await Sponsor.findById(sponsorId);

    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    res.json(sponsor);
  } catch (error) {
    console.error('Error fetching sponsor:', error);
    res.status(500).json({ error: 'Failed to fetch sponsor' });
  }
});

// Function to send reminder email
const sendReminderEmail = async (interest) => {
  try {
    const event = await Event.findById(interest.eventId);
    if (!event) return;

    const eventDate = new Date(event.startDate);
    const now = new Date();
    const daysRemaining = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));

    // Format email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Event Reminder: ${event.name}</h2>
        <p>Hello ${interest.userName || 'there'},</p>
        <p>This is a reminder about the event you're interested in attending.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${event.name}</h3>
          <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
          <p><strong>Location:</strong> ${event.location || 'TBA'}</p>
          <p><strong>Days remaining:</strong> ${daysRemaining}</p>
        </div>
        
        <p>We look forward to seeing you there!</p>
        <p>Regards,<br>The Kaleidoplan Team</p>
      </div>
    `;

    await transporter.sendMail({
      from: '"Kaleidoplan Events" <notifications@kaleidoplan.com>',
      to: interest.userEmail,
      subject: `Reminder: ${event.name} is in ${daysRemaining} days`,
      html: emailContent,
    });

    // Update last reminded time
    await EventInterest.findByIdAndUpdate(interest._id, {
      lastReminded: new Date(),
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
  }
};

// Schedule daily job to send reminders at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  try {
    const interests = await EventInterest.find({});

    for (const interest of interests) {
      const event = await Event.findById(interest.eventId);
      if (!event) continue;

      const eventDate = new Date(event.startDate);
      const now = new Date();

      // If event is in the past, delete the interest
      if (eventDate < now) {
        await EventInterest.findByIdAndDelete(interest._id);
        continue;
      }

      const daysRemaining = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
      const lastReminded = interest.lastReminded ? new Date(interest.lastReminded) : null;

      let shouldSendReminder = false;

      // Check if we should send based on frequency and last reminded
      if (!lastReminded) {
        shouldSendReminder = true;
      } else {
        const daysSinceLastReminder = Math.ceil((now - lastReminded) / (1000 * 60 * 60 * 24));

        switch (interest.reminderFrequency) {
          case 'daily':
            shouldSendReminder = daysSinceLastReminder >= 1;
            break;
          case 'weekly':
            shouldSendReminder = daysSinceLastReminder >= 7;
            break;
          case 'monthly':
            shouldSendReminder = daysSinceLastReminder >= 30;
            break;
        }
      }

      // Send specific reminders 1 day before the event
      if (daysRemaining === 1 && (!lastReminded || (now - lastReminded) / (1000 * 60 * 60) >= 12)) {
        // Only if not reminded in last 12h
        shouldSendReminder = true;
      }

      if (shouldSendReminder) {
        await sendReminderEmail(interest);
      }
    }
  } catch (error) {
    console.error('Error in reminder job:', error);
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {});
