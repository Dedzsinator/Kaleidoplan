const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Function to generate random data without faker
function generateRandomData() {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Olivia', 'William', 'Sophia'];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Miller',
    'Davis',
    'Garcia',
    'Rodriguez',
    'Wilson',
  ];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'example.com'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const randomNum = Math.floor(Math.random() * 1000);

  return {
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomNum}@${domain}`,
    displayName: `${firstName} ${lastName}`,
  };
}

async function createUsers() {
  try {
    const auth = admin.auth();
    const createdUsers = [];

    // 1. Create Admin user
    const adminUser = {
      email: 'admin@kaleidoplan.com',
      password: 'Admin123!',
      displayName: 'Admin User',
      role: 'admin',
    };

    try {
      let adminRecord = await createOrGetUser(auth, adminUser);
      createdUsers.push({ ...adminUser, uid: adminRecord.uid });
    } catch (error) {
      console.error('Error creating admin user:', error);
    }

    // 2. Create Organizer user
    const organizerUser = {
      email: 'organizer@kaleidoplan.com',
      password: 'Organizer123!',
      displayName: 'Event Organizer',
      role: 'organizer',
    };

    try {
      let organizerRecord = await createOrGetUser(auth, organizerUser);
      createdUsers.push({ ...organizerUser, uid: organizerRecord.uid });
    } catch (error) {
      console.error('Error creating organizer user:', error);
    }

    // 3. Create random users (5 by default)
    const randomUserCount = 5;
    for (let i = 0; i < randomUserCount; i++) {
      try {
        const { firstName, lastName, email, displayName } = generateRandomData();
        const randomUser = {
          email: email,
          password: `Password${i + 1}!`,
          displayName: displayName,
          role: Math.random() > 0.5 ? 'user' : 'organizer',
        };

        let userRecord = await createOrGetUser(auth, randomUser);
        createdUsers.push({ ...randomUser, uid: userRecord.uid });
      } catch (error) {
        console.error(`Error creating random user ${i + 1}:`, error);
      }
    }

    // Print created users
    console.log('\n===== CREATED USERS =====');
    createdUsers.forEach((user) => {
      console.log(`\n${user.displayName} (${user.role})`);
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`UID: ${user.uid}`);
    });
    console.log('\n=========================');

    // Return the user ID of the admin and organizer for reference
    return {
      adminUid: createdUsers.find((u) => u.role === 'admin')?.uid,
      organizerUid: createdUsers.find((u) => u.role === 'organizer')?.uid,
      randomUsers: createdUsers.filter((u) => u.role !== 'admin' && u.email !== organizerUser.email),
    };
  } catch (error) {
    console.error('Error in createUsers function:', error);
  } finally {
    // Let the process exit naturally
    console.log('User creation complete');
  }
}

// Helper function to create a user or get existing user
async function createOrGetUser(auth, userData) {
  try {
    // Check if user exists
    const existingUser = await auth.getUserByEmail(userData.email).catch(() => null);

    if (existingUser) {
      console.log(`User ${userData.email} already exists`);

      // Update custom claims if needed
      await auth.setCustomUserClaims(existingUser.uid, { role: userData.role });

      return existingUser;
    }

    // Create new user
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName,
      emailVerified: true,
    });

    // Set role as custom claim
    await auth.setCustomUserClaims(userRecord.uid, { role: userData.role });

    console.log(`Created user: ${userData.email} (${userData.role})`);
    return userRecord;
  } catch (error) {
    console.error(`Error with user ${userData.email}:`, error);
    throw error;
  }
}

// Run the script
createUsers()
  .then(() => {
    console.log('Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
