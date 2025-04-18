const Event = require('../models/event.model');

// Get public events - RETURNS ALL FIELDS
// Get all public events
exports.getPublicEvents = async (req, res, next) => {
  try {
    console.log('Fetching public events');

    // First, check total events count
    const totalEvents = await Event.countDocuments({});
    console.log(`Total events in database: ${totalEvents}`);

    // Just get all events without filtering
    const events = await Event.find({})
      .sort({ startDate: 1 })
      .limit(15);

    console.log(`Found ${events.length} events`);

    // If no events found, create demo events
    if (events.length === 0) {
      console.log('No events found, creating demo events');
      const demoEvents = createDemoEvents();
      return res.json({ events: demoEvents });
    }

    // Process events to match our expected structure
    const processedEvents = events.map(event => {
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
        eventObj.coverImageUrl = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1080&auto=format&fit=crop';
      }
      
      return eventObj;
    });

    res.json({ events: processedEvents });
  } catch (error) {
    console.error('Error fetching public events:', error);
    next(error);
  }
};

// Helper to create demo events when none exist
function createDemoEvents() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  return [
    {
      _id: 'demo-1',
      id: 'demo-1',
      name: 'Music Festival 2025',
      description: 'A weekend of amazing music performances',
      location: 'City Park',
      startDate: tomorrow,
      endDate: nextWeek,
      coverImageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1080&auto=format&fit=crop',
      slideshowImages: ['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1080&auto=format&fit=crop'],
      status: 'upcoming',
      playlistId: 'pl-demo-1',
      color: '#3357FF',
    },
    {
      _id: 'demo-2',
      id: 'demo-2',
      name: 'Tech Conference 2025',
      description: 'Learn about the latest technology trends',
      location: 'Convention Center',
      startDate: tomorrow,
      endDate: nextWeek,
      coverImageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1080&auto=format&fit=crop',
      slideshowImages: ['https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1080&auto=format&fit=crop'],
      status: 'upcoming',
      playlistId: 'pl-demo-2',
      color: '#FF5733',
    },
    {
      _id: 'demo-3',
      id: 'demo-3',
      name: 'Food Festival',
      description: 'Taste cuisine from around the world',
      location: 'Downtown Square',
      startDate: tomorrow,
      endDate: nextWeek,
      coverImageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1080&auto=format&fit=crop',
      slideshowImages: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1080&auto=format&fit=crop'],
      status: 'upcoming',
      playlistId: 'pl-demo-3',
      color: '#33FF57',
    }
  ];
}

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
