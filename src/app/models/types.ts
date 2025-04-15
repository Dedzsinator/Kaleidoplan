import { User as FirebaseUser } from 'firebase/auth';

// Your application's User type
export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
}

// Helper to convert Firebase User to App User
export function adaptFirebaseUser(firebaseUser: FirebaseUser, role: string = 'user'): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    role: role
  };
}

// Task status type
export type TaskStatus = 'pending' | 'in-progress' | 'completed';

// Task action type
export type TaskAction = 'created' | 'updated' | 'completed';

// Task model
export interface Task {
  taskId: string;
  name: string;
  description: string;
  deadline: Date | string;
  status: TaskStatus;
  assignedTo: string; // Firebase UID
  eventId: string;
  eventName: string;
  createdBy: string; // Firebase UID
  createdAt: Date | string;
  updatedAt?: Date | string;
  updatedBy?: string; // Firebase UID
}

// Task log model
export interface TaskLog {
  id: string;
  taskId: string;
  timestamp: Date | string;
  action: TaskAction;
  updatedBy: string; // Firebase UID
  oldStatus?: TaskStatus;
  newStatus: TaskStatus;
  comment?: string;
}

export interface Playlist {
  _id: string;
  eventId: string;
  name: string;
  description: string;
  tracks: Record<string, Track>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Performer {
  _id: string;
  id?: string;  // For compatibility
  name: string;
  bio: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  name: string;
  artist: string;
  spotifyId: string;
  previewUrl?: string;         // From Spotify API
  fallbackPreviewUrl?: string; // Your own hosted audio file
  localAudioPath?: string;     // For offline playback
  albumArt?: string;         // From Spotify API
}

export interface error {
  code: string;
  message: string;
  details?: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  date?: string | Date;
  color: string;
  location?: string;
  coverImageUrl?: string;
  slideshowImages?: string[]; // Add this line if not already present
  playlistId?: string;
  createdBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  status?: string;
  themeColor?: string;
  performers?: Performer[];
  latitude?: number;
  longitude?: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
  // ...other properties
}