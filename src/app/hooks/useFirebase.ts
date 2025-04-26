import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  DocumentData,
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export interface Performer {
  id?: string;
  name: string;
  role?: string;
  spotifyId?: string;
  imageUrl?: string;
}

// Types
export interface Event {
  id: string;
  name: string;
  description: string;
  location: string;
  startDate: Timestamp | Date;
  endDate: Timestamp | Date;
  status: 'upcoming' | 'ongoing' | 'completed';
  coverImage?: string;
  organizers: string[];
  createdBy: string;
  createdAt: Timestamp | Date;
}

export interface EventInput {
  name: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'ongoing' | 'completed';
  coverImage?: File | null;
  organizers: string[];
}

// Functions
export const getEvents = async (): Promise<Event[]> => {
  try {
    const eventsQuery = query(collection(db, 'events'), orderBy('startDate', 'asc'));
    const snapshot = await getDocs(eventsQuery);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

export const getEvent = async (eventId: string): Promise<Event | null> => {
  try {
    const eventDoc = await getDoc(doc(db, 'events', eventId));

    if (!eventDoc.exists()) {
      return null;
    }

    return {
      id: eventDoc.id,
      ...eventDoc.data(),
    } as Event;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
};

export const createEvent = async (eventData: EventInput, userId: string): Promise<string> => {
  try {
    let coverImageUrl = undefined;

    // Upload cover image if provided
    if (eventData.coverImage) {
      const storageRef = ref(storage, `events/covers/${Date.now()}_${eventData.coverImage.name}`);
      const uploadResult = await uploadBytes(storageRef, eventData.coverImage);
      coverImageUrl = await getDownloadURL(uploadResult.ref);
    }

    const eventRef = await addDoc(collection(db, 'events'), {
      name: eventData.name,
      description: eventData.description,
      location: eventData.location,
      startDate: Timestamp.fromDate(eventData.startDate),
      endDate: Timestamp.fromDate(eventData.endDate),
      status: eventData.status,
      coverImage: coverImageUrl,
      organizers: eventData.organizers,
      createdBy: userId,
      createdAt: serverTimestamp(),
    });

    return eventRef.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

export const updateEvent = async (eventId: string, eventData: Partial<EventInput>): Promise<void> => {
  try {
    // Replace 'any' with a more specific type
    let updateData: Record<string, unknown> = { ...eventData };

    // Handle dates if they exist
    if (eventData.startDate) {
      updateData.startDate = Timestamp.fromDate(eventData.startDate);
    }

    if (eventData.endDate) {
      updateData.endDate = Timestamp.fromDate(eventData.endDate);
    }

    // Handle cover image if provided
    if (eventData.coverImage) {
      const storageRef = ref(storage, `events/covers/${Date.now()}_${eventData.coverImage.name}`);
      const uploadResult = await uploadBytes(storageRef, eventData.coverImage);
      updateData.coverImage = await getDownloadURL(uploadResult.ref);
    }

    // Remove the coverImage File object from the update data
    delete updateData.coverImage;
    await updateDoc(doc(db, 'events', eventId), updateData as DocumentData);
  } catch (error: unknown) {
    console.error('Error updating event:', error instanceof Error ? error.message : error);
    throw error;
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

export const getEventsByOrganizer = async (organizerId: string): Promise<Event[]> => {
  try {
    const eventsQuery = query(
      collection(db, 'events'),
      where('organizers', 'array-contains', organizerId),
      orderBy('startDate', 'asc'),
    );

    const snapshot = await getDocs(eventsQuery);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];
  } catch (error) {
    console.error('Error fetching events by organizer:', error);
    throw error;
  }
};
