import { Event } from '../app/models/types';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import mongoApi from './mongoService';

// Get Firestore instance
const db = getFirestore(getApp());

// Get all events (for guest view)
export async function getEvents(): Promise<Event[]> {
  try {
    console.log('EventService: getEvents called');
    
    // Try MongoDB first
    try {
      console.log('EventService: Trying MongoDB API');
      // For guest view, try the public endpoint first
      const events = await mongoApi.public.getEvents();
      console.log('EventService: MongoDB returned:', events?.length || 0, 'events');
      if (events && events.length > 0) {
        return events.map(event => ({
          ...event,
          id: event._id || event.id, // Handle _id from MongoDB
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate)
        }));
      }
    } catch (mongoError) {
      console.log('EventService: MongoDB not available, error:', mongoError);
      console.log('EventService: Falling back to Firestore');
    }
    
    // Fallback to Firestore
    console.log('EventService: Fetching from Firestore');
    const eventsCollection = collection(db, 'events');
    const eventSnapshot = await getDocs(eventsCollection);
    
    const events = eventSnapshot.docs.map(doc => {
      const data = doc.data() as Omit<Event, 'id'>;
      
      // Parse dates if needed
      const startDate = data.startDate instanceof Date ? 
        data.startDate : new Date(data.startDate as string);
      const endDate = data.endDate instanceof Date ? 
        data.endDate : new Date(data.endDate as string);
      
      // Calculate status based on dates
      const now = new Date();
      let status: Event['status'] = 'upcoming';
      if (startDate <= now && endDate >= now) {
        status = 'ongoing';
      } else if (endDate < now) {
        status = 'completed';
      }
      
      return {
        id: doc.id,
        ...data,
        startDate,
        endDate,
        status
      };
    });
    
    console.log('EventService: Firestore returned:', events.length, 'events');
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

// Get single event by ID
export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    // Try MongoDB first
    try {
      const event = await mongoApi.getEventById(eventId);
      if (event) {
        return event;
      }
    } catch (mongoError) {
      console.log('MongoDB event not available, falling back to Firestore');
    }
    
    // Fallback to Firestore
    const eventDoc = doc(db, 'events', eventId);
    const eventSnapshot = await getDoc(eventDoc);
    
    if (!eventSnapshot.exists()) {
      return null;
    }
    
    const data = eventSnapshot.data() as Omit<Event, 'id'>;
    
    // Parse dates if needed
    const startDate = data.startDate instanceof Date ? 
      data.startDate : new Date(data.startDate as string);
    const endDate = data.endDate instanceof Date ? 
      data.endDate : new Date(data.endDate as string);
    
    // Calculate status based on dates
    const now = new Date();
    let status: Event['status'] = 'upcoming';
    if (startDate <= now && endDate >= now) {
      status = 'ongoing';
    } else if (endDate < now) {
      status = 'completed';
    }
    
    return {
      id: eventSnapshot.id,
      ...data,
      startDate,
      endDate,
      status
    };
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
}