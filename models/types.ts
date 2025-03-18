export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'organizer';
  }
  
  export interface TaskLog {
    id: string;
    taskId: string;
    timestamp: Date | string;
    action: 'created' | 'updated' | 'completed';
    comment?: string;
    updatedBy: string;
    oldStatus?: 'pending' | 'in-progress' | 'completed';
    newStatus?: 'pending' | 'in-progress' | 'completed';
  }
  
  export interface Task {
    taskId: string;
    name: string;
    description?: string;
    deadline: Date | string;
    status: 'pending' | 'in-progress' | 'completed';
    assignedTo: string;
    eventId: string;
    eventName?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    logs?: TaskLog[];
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
    organizers: string[];
    tasks?: Task[];
  }