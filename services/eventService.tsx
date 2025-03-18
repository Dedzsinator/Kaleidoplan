import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';

// Get Firestore instance
const db = getFirestore(getApp());

// Event interfaces
export interface Task {
  id: string;
  name: string;
  deadline: Date | string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: string;
  logs: TaskLog[];
}

export interface TaskLog {
  timestamp: Date | string;
  action: 'created' | 'updated' | 'completed';
  comment?: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  location: string;
  startDate: Date | string;
  endDate: Date | string;
  status: 'upcoming' | 'ongoing' | 'completed';
  coverImageUrl?: string;
  creatorName: string;
  tasks: Task[];
  organizers: string[];
}

// Get all events (for guest view)
export async function getEvents(): Promise<Event[]> {
  try {
    const eventsCollection = collection(db, 'events');
    const eventSnapshot = await getDocs(eventsCollection);
    
    return eventSnapshot.docs.map(doc => {
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
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

// Get single event by ID
export async function getEventById(eventId: string): Promise<Event | null> {
  try {
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