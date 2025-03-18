const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kaleidoplan';
let db;

async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

const authenticate = async (req, res, next) => {
    console.log('Authentication attempt:', req.path);
    console.log('Headers:', JSON.stringify(req.headers));
    
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No valid authorization header found');
        return res.status(401).json({ error: 'Unauthorized - No valid token' });
      }
  
      const token = authHeader.split('Bearer ')[1];
      console.log('Token found, verifying with Firebase Admin...');
      
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log('Token verified successfully for user:', decodedToken.uid);
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
  
  app.use((err, req, res, next) => {
    console.error('Unhandled error in server:', err);
    res.status(500).json({ 
      error: 'Server error', 
      message: err.message || 'Unknown error occurred'
    });
  });
  
  // Add this route to bypass authentication for debugging
  app.get('/api/public/events', async (req, res) => {
    try {
      console.log('Fetching public events (no auth)');
      const events = await db.collection('events').find().toArray();
      console.log(`Found ${events.length} public events`);
      if (events.length > 0) {
        console.log('Sample event:', JSON.stringify(events[0], null, 2).substring(0, 200) + '...');
      }
      res.json(events);
    } catch (error) {
      console.error('Error fetching public events:', error);
      res.status(500).json({ error: 'Failed to fetch public events' });
    }
  });


app.get('/api/public/events/:id', async (req, res) => {
    try {
      console.log(`Fetching public event ${req.params.id} (no auth)`);
      const event = await db.collection('events').findOne({ 
        $or: [
          { _id: req.params.id },
          { id: req.params.id }
        ]
      });
      
      if (!event) {
        console.log(`Public event ${req.params.id} not found`);
        return res.status(404).json({ error: 'Event not found' });
      }
      
      console.log(`Found public event: ${event.name}`);
      res.json(event);
    } catch (error) {
      console.error(`Error fetching public event ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to fetch public event' });
    }
  });

// Task routes
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    const { assignedTo } = req.query;
    const query = assignedTo ? { assignedTo } : {};
    
    const tasks = await db.collection('tasks').find(query).toArray();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.get('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const task = await db.collection('tasks').findOne({ 
      $or: [
        { _id: new ObjectId(req.params.id) },
        { taskId: req.params.id }
      ]
    });
    
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
    
    // Get the task to find its current status
    const task = await db.collection('tasks').findOne({ 
      $or: [
        { _id: new ObjectId(req.params.id) },
        { taskId: req.params.id }
      ]
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Update the task
    await db.collection('tasks').updateOne(
      { 
        $or: [
          { _id: new ObjectId(req.params.id) },
          { taskId: req.params.id }
        ]
      },
      { 
        $set: { 
          status,
          updatedAt: new Date(),
          updatedBy
        } 
      }
    );
    
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
    const query = taskId ? { taskId } : {};
    
    const logs = await db.collection('taskLogs').find(query).toArray();
    res.json(logs);
  } catch (error) {
    console.error('Error fetching task logs:', error);
    res.status(500).json({ error: 'Failed to fetch task logs' });
  }
});

app.post('/api/taskLogs', authenticate, async (req, res) => {
  try {
    const { taskId, action, updatedBy, oldStatus, newStatus, comment, timestamp } = req.body;
    
    // If oldStatus wasn't provided, get the current task status
    let actualOldStatus = oldStatus;
    if (!actualOldStatus && (action === 'updated' || action === 'completed')) {
      const task = await db.collection('tasks').findOne({ 
        $or: [
          { _id: new ObjectId(taskId) },
          { taskId }
        ]
      });
      
      if (task) {
        actualOldStatus = task.status;
      }
    }
    
    // Create the log entry
    const logEntry = {
      taskId,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      action,
      updatedBy,
      newStatus,
      ...(actualOldStatus && { oldStatus: actualOldStatus }),
      ...(comment && { comment })
    };
    
    const result = await db.collection('taskLogs').insertOne(logEntry);
    
    res.status(201).json({
      id: result.insertedId,
      ...logEntry
    });
  } catch (error) {
    console.error('Error creating task log:', error);
    res.status(500).json({ error: 'Failed to create task log' });
  }
});

// Enhanced logging for events routes
app.get('/api/events', authenticate, async (req, res) => {
    try {
      console.log('Fetching events, user:', req.user?.uid);
      const events = await db.collection('events').find().toArray();
      console.log(`Found ${events.length} events`);
      console.log('Event sample:', events.length > 0 ? JSON.stringify(events[0]).substring(0, 200) + '...' : 'No events');
      res.json(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

app.get('/api/events/:id', authenticate, async (req, res) => {
  try {
    const event = await db.collection('events').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
connectToMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});