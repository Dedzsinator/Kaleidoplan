const { connectToDatabase } = require('./mongoConnection');
const { ObjectId } = require('mongodb');

async function seedDatabase() {
  try {
    const { db } = await connectToDatabase();
    
    // Clear existing data
    await db.collection('events').deleteMany({});
    await db.collection('tasks').deleteMany({});
    await db.collection('users').deleteMany({});
    await db.collection('taskLogs').deleteMany({});
    
    // Create users
    const users = [
      {
        _id: new ObjectId(),
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'hashed_password_here', // In production, use proper hashing
        role: 'admin'
      },
      {
        _id: new ObjectId(),
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed_password_here',
        role: 'organizer'
      },
      {
        _id: new ObjectId(),
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'hashed_password_here',
        role: 'organizer'
      }
    ];
    
    await db.collection('users').insertMany(users);
    console.log('Users created');
    
    // Create events
    const events = [
      {
        _id: new ObjectId(),
        name: 'Summer Music Festival',
        description: 'A weekend of amazing live music performances',
        location: 'City Park',
        startDate: new Date(2025, 5, 15),
        endDate: new Date(2025, 5, 17),
        status: 'upcoming',
        coverImageUrl: 'https://picsum.photos/800/400?random=1',
        creatorName: 'Event Organizers Inc.',
        organizers: [users[1]._id.toString(), users[2]._id.toString()]
      },
      {
        _id: new ObjectId(),
        name: 'Tech Conference 2025',
        description: 'Learn about the latest technologies and network with professionals',
        location: 'Convention Center',
        startDate: new Date(2025, 3, 10),
        endDate: new Date(2025, 3, 12),
        status: 'upcoming',
        coverImageUrl: 'https://picsum.photos/800/400?random=2',
        creatorName: 'Tech Community',
        organizers: [users[1]._id.toString()]
      }
    ];
    
    await db.collection('events').insertMany(events);
    console.log('Events created');
    
    // Create tasks
    const tasks = [
      {
        _id: new ObjectId(),
        name: 'Set up main stage',
        description: 'Coordinate with the stage setup team to ensure all equipment is properly installed and tested',
        deadline: new Date(2025, 5, 14),
        status: 'pending',
        assignedTo: users[1]._id.toString(),
        eventId: events[0]._id.toString(),
        createdAt: new Date(2024, 2, 15),
        updatedAt: new Date(2024, 2, 15)
      },
      {
        _id: new ObjectId(),
        name: 'Coordinate food vendors',
        description: 'Contact all food vendors to confirm their participation and requirements',
        deadline: new Date(2025, 5, 10),
        status: 'in-progress',
        assignedTo: users[1]._id.toString(),
        eventId: events[0]._id.toString(),
        createdAt: new Date(2024, 2, 15),
        updatedAt: new Date(2024, 2, 18)
      },
      {
        _id: new ObjectId(),
        name: 'Speaker registration',
        description: 'Manage the registration process for all speakers',
        deadline: new Date(2025, 3, 5),
        status: 'completed',
        assignedTo: users[1]._id.toString(),
        eventId: events[1]._id.toString(),
        createdAt: new Date(2024, 2, 15),
        updatedAt: new Date(2024, 2, 20)
      },
      {
        _id: new ObjectId(),
        name: 'Prepare conference rooms',
        description: 'Ensure all conference rooms are properly set up with necessary equipment',
        deadline: new Date(2025, 3, 9),
        status: 'pending',
        assignedTo: users[1]._id.toString(),
        eventId: events[1]._id.toString(),
        createdAt: new Date(2024, 2, 15),
        updatedAt: new Date(2024, 2, 15)
      }
    ];
    
    await db.collection('tasks').insertMany(tasks);
    console.log('Tasks created');
    
    // Create initial task logs
    const taskLogs = [
      {
        taskId: tasks[0]._id.toString(),
        timestamp: new Date(2024, 2, 15, 9, 30),
        action: 'created',
        updatedBy: users[0]._id.toString(),
        newStatus: 'pending'
      },
      {
        taskId: tasks[1]._id.toString(),
        timestamp: new Date(2024, 2, 15, 9, 45),
        action: 'created',
        updatedBy: users[0]._id.toString(),
        newStatus: 'pending'
      },
      {
        taskId: tasks[1]._id.toString(),
        timestamp: new Date(2024, 2, 18, 14, 15),
        action: 'updated',
        comment: 'Started working on vendor coordination',
        updatedBy: users[1]._id.toString(),
        oldStatus: 'pending',
        newStatus: 'in-progress'
      },
      {
        taskId: tasks[2]._id.toString(),
        timestamp: new Date(2024, 2, 15, 10, 0),
        action: 'created',
        updatedBy: users[0]._id.toString(),
        newStatus: 'pending'
      },
      {
        taskId: tasks[2]._id.toString(),
        timestamp: new Date(2024, 2, 16, 11, 30),
        action: 'updated',
        comment: 'Started registration process',
        updatedBy: users[1]._id.toString(),
        oldStatus: 'pending',
        newStatus: 'in-progress'
      },
      {
        taskId: tasks[2]._id.toString(),
        timestamp: new Date(2024, 2, 20, 15, 45),
        action: 'completed',
        comment: 'All speakers registered and confirmed',
        updatedBy: users[1]._id.toString(),
        oldStatus: 'in-progress',
        newStatus: 'completed'
      },
      {
        taskId: tasks[3]._id.toString(),
        timestamp: new Date(2024, 2, 15, 10, 15),
        action: 'created',
        updatedBy: users[0]._id.toString(),
        newStatus: 'pending'
      }
    ];
    
    await db.collection('taskLogs').insertMany(taskLogs);
    console.log('Task logs created');
    
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run the seed function
seedDatabase().catch(console.error);