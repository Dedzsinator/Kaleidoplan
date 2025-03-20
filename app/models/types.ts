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

// Event model
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
  createdBy: string; // Firebase UID
  organizers: string[]; // Array of Firebase UIDs
}