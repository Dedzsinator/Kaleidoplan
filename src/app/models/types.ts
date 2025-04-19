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
    role: role,
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

export interface Track {
  name: string;
  artist: string;
  spotifyId?: string;
  previewUrl?: string;
  albumArt?: string;
  // Add these missing properties used in playlistService.tsx
  fallbackPreviewUrl?: string;
  localAudioPath?: string;
}

export interface SpotifyTrack {
  name: string;
  // Change preview_url to possibly be null (to match Spotify API)
  preview_url: string | null;
  album?: {
    images?: Array<{ url: string }>;
  };
  // Add artists array to the interface
  artists?: Array<{ name: string }>;
}

export interface Playlist {
  _id: string;
  name: string;
  description: string;
  eventId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Support different track formats
  tracks: Record<string, Track> | string[] | string | any;
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
  startDate: string | Date; // Remove optional since it's used without checks
  endDate: string | Date; // Remove optional since it's used without checks
  date?: string | Date;
  color: string;
  location?: string; // Remove optional since it's used without checks
  coverImageUrl?: string;
  slideshowImages?: string[];
  playlistId?: string;
  createdBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  status: string; // Remove optional since it's used without checks
  themeColor?: string;
  performers?: Performer[];
  latitude?: number;
  longitude?: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
  sponsorIds? : string[];
  [key: string]: any;
}

export interface Sponsor {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  level?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Performer {
  _id?: string;
  name?: string;
  bio?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}
