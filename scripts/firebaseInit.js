import admin from 'firebase-admin';

import serviceAccount from '../serviceAccountKey.json';

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

    const adminUser = {
      email: 'admin@kaleidoplan.com',
      password: 'Admin123!',
      displayName: 'Admin User',
      role: 'admin',
    };

    try {
      const adminRecord = await createOrGetUser(auth, adminUser);
      createdUsers.push({ ...adminUser, uid: adminRecord.uid });
    } catch (error) {
      console.error('Error creating admin user:', error);
    }

    const organizerUser = {
      email: 'organizer@kaleidoplan.com',
      password: 'Organizer123!',
      displayName: 'Event Organizer',
      role: 'organizer',
    };

    try {
      const organizerRecord = await createOrGetUser(auth, organizerUser);
      createdUsers.push({ ...organizerUser, uid: organizerRecord.uid });
    } catch (error) {
      console.error('Error creating organizer user:', error);
    }

    const randomUserCount = 5;
    for (let i = 0; i < randomUserCount; i++) {
      try {
        const { email, displayName } = generateRandomData();
        const randomUser = {
          email: email,
          password: `Password${i + 1}!`,
          displayName: displayName,
          role: Math.random() > 0.5 ? 'user' : 'organizer',
        };

        const userRecord = await createOrGetUser(auth, randomUser);
        createdUsers.push({ ...randomUser, uid: userRecord.uid });
      } catch (error) {
        console.error(`Error creating random user ${i + 1}:`, error);
      }
    }

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
  }
}

async function createOrGetUser(auth, userData) {
  try {
    // Check if user exists
    const existingUser = await auth.getUserByEmail(userData.email).catch(() => null);

    if (existingUser) {
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

    return userRecord;
  } catch (error) {
    console.error(`Error with user ${userData.email}:`, error);
    throw error;
  }
}

// Run the script
createUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
