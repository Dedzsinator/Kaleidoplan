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

export interface ManagedEvent {
  _id: string;
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: string;
  attendeeCount: number;
  location?: string;
}

// Task model
export interface Task {
  _id: string;
  name: string;
  description: string;
  deadline: Date | string;
  status: TaskStatus;
  assignedTo: string; // Firebase UID
  eventName: string;
  createdBy: string; // Firebase UID
  createdAt: Date | string;
  updatedAt?: Date | string;
  updatedBy?: string; // Firebase UID
  priority: 'low' | 'medium' | 'high';
  eventId: string | { _id: string; id?: string } | Record<string, unknown>;
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
  tracks: Record<string, Track> | string[] | string | Record<string, unknown>;
}

export interface error {
  code: string;
  message: string;
  details?: string;
}

export interface Event {
  id?: string;
  _id?: string;
  normalizedId?: string;
  name: string;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
  date?: string | Date;
  color: string;
  location?: string;
  coverImageUrl?: string;
  slideshowImages?: string[];
  playlistId?: string;
  createdBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  status: string;
  themeColor?: string;
  performers?: Performer[];
  latitude?: number;
  longitude?: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
  sponsorIds?: string[];
  ticketUrl?: string;
  type?: string;
  website?: string;
  spotifyPlaylistId?: string;
  coverImage?: string;

  [key: string]:
    | string
    | number
    | boolean
    | Date
    | string[]
    | Performer[]
    | undefined
    | null
    | {
        _id?: string;
        id?: string;
      }
    | Record<string, unknown>;
}

export interface UserEvent extends Event {
  interestLevel: 'interested' | 'attending';
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

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: string[];
  code?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | null | undefined>;
  timeout?: number;
  withCredentials?: boolean;
}

export interface RequestConfig<T> extends RequestOptions {
  data?: T;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}
