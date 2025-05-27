import fs from 'fs';

import admin from 'firebase-admin';

import serviceAccount from '../serviceAccountKey.json';

const { ObjectId } = require('mongodb');

const { connectToDatabase } = require('./mongoConnection');
require('dotenv').config();

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Function to properly parse CSV with quoted fields
function parseCSVLine(line) {
  const result = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line.charAt(i);

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Add the last value
  result.push(currentValue.trim());

  return result;
}

// Safe object property assignment helper
function setProperty(obj, key, value) {
  if (typeof key === 'string' && key.length > 0) {
    obj[key] = value;
  }
}

// Safe object property access helper
function getProperty(obj, key) {
  if (typeof key === 'string' && key.length > 0 && Object.prototype.hasOwnProperty.call(obj, key)) {
    return obj[key];
  }
  return undefined;
}

// Safe collection access helper
function getCollection(collections, collectionName) {
  const validCollections = ['performers', 'tasks', 'logs', 'eventSponsors', 'sponsors', 'events'];
  if (validCollections.includes(collectionName)) {
    return collections[collectionName];
  }
  return [];
}

// Function to read and parse the data.csv file
function parseDataCsv() {
  try {
    // Use a fixed, safe file path
    const dataFilePath = './data.csv';

    // Read the CSV file
    const fileContent = fs.readFileSync(dataFilePath, 'utf8');

    // Split the content by lines
    const lines = fileContent.split('\n');

    // Collections to store parsed data
    const collections = {
      performers: [],
      tasks: [],
      logs: [],
      eventSponsors: [],
      sponsors: [],
      events: [],
    };

    // Current collection being parsed
    let currentCollection = null;
    let headers = null;

    // Parse each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Skip comments
      if (line.startsWith('//')) continue;

      // Check if this line is a header row (_id,name,...)
      if (line.startsWith('_id,')) {
        // Get the headers
        headers = parseCSVLine(line);

        // Determine which collection this is based on the headers
        if (headers.includes('bio') && headers.includes('image')) {
          currentCollection = 'performers';
        } else if (headers.includes('eventId') && headers.includes('deadline')) {
          currentCollection = 'tasks';
        } else if (headers.includes('taskId') && headers.includes('status') && headers.includes('changedBy')) {
          currentCollection = 'logs';
        } else if (headers.includes('eventId') && headers.includes('sponsorId') && headers.length <= 4) {
          currentCollection = 'eventSponsors';
        } else if (headers.includes('website') && headers.includes('description')) {
          currentCollection = 'sponsors';
        } else if (headers.includes('startDate') && headers.includes('endDate')) {
          currentCollection = 'events';
        } else {
          console.warn('Could not identify collection for headers:', headers);
          currentCollection = null;
        }

        continue;
      }

      // If we have headers and a current collection, parse the data row
      if (headers && currentCollection) {
        // Use the special CSV parser for this line
        const values = parseCSVLine(line);

        // Create an object from the headers and values
        if (values.length === headers.length) {
          const item = {};
          for (let j = 0; j < headers.length; j++) {
            setProperty(item, headers[j], values[j]);
          }
          const targetCollection = getCollection(collections, currentCollection);
          targetCollection.push(item);
        } else {
          console.warn(
            `Skipping line with mismatched values count (expected ${headers.length}, got ${values.length}):`,
            line,
          );
          console.warn('Parsed values:', values);
        }
      }
    }

    return collections;
  } catch (error) {
    console.error('Error parsing data.csv:', error);
    throw error;
  }
}

// Function to convert string fields to appropriate types
function convertFieldTypes(data, collectionName) {
  if (!data || !Array.isArray(data)) {
    console.warn(`No data to convert for collection ${collectionName}`);
    return [];
  }

  return data.map((item) => {
    const convertedItem = {};

    for (const [key, value] of Object.entries(item)) {
      // Skip undefined or null values
      if (value === undefined || value === null || value === '') {
        setProperty(convertedItem, key, value);
        continue;
      }

      if (key === '_id' || key.endsWith('Id')) {
        // Convert ID fields to ObjectId
        try {
          setProperty(convertedItem, key, new ObjectId(value));
        } catch (e) {
          console.warn('Invalid ObjectId for: ', e, key, value);
          setProperty(convertedItem, key, value);
        }
      } else if (key.includes('Date') || key === 'createdAt' || key === 'updatedAt' || key === 'changedAt') {
        // Convert date fields to Date objects
        try {
          setProperty(convertedItem, key, new Date(value));
        } catch (e) {
          console.warn('Invalid Date for: ', e, key, value);
          setProperty(convertedItem, key, value);
        }
      } else if (value === 'true' || value === 'false') {
        // Convert boolean fields
        setProperty(convertedItem, key, value === 'true');
      } else if (!isNaN(value) && value !== '') {
        // Convert numeric fields
        setProperty(convertedItem, key, Number(value));
      } else if ((key === 'performers' || key === 'slideshowImages') && value && value.includes(',')) {
        // Convert array fields - split by comma
        const arrayValue = value.split(',').map((item) => {
          const trimmed = item.trim();
          // Try to convert to ObjectId if it's in performers field
          if (key === 'performers') {
            try {
              return new ObjectId(trimmed);
            } catch (e) {
              console.warn('Invalid ObjectId in performers array:', e);
              return trimmed;
            }
          }
          return trimmed;
        });
        setProperty(convertedItem, key, arrayValue);
      } else {
        // Keep other fields as is
        setProperty(convertedItem, key, value);
      }
    }

    // Specific handling for event collection
    if (collectionName === 'events') {
      // Rename coverImage to coverImageUrl to match schema if needed
      const coverImage = getProperty(convertedItem, 'coverImage');
      if (coverImage !== undefined) {
        setProperty(convertedItem, 'coverImageUrl', coverImage);
        delete convertedItem.coverImage;
      }

      // Ensure performers is always an array
      const performers = getProperty(convertedItem, 'performers');
      if (performers && !Array.isArray(performers)) {
        if (typeof performers === 'string') {
          try {
            setProperty(convertedItem, 'performers', [new ObjectId(performers)]);
          } catch (e) {
            console.warn('Invalid ObjectId in performers field:', e);
            setProperty(convertedItem, 'performers', [performers]);
          }
        }
      }

      // Ensure slideshowImages is always an array
      const slideshowImages = getProperty(convertedItem, 'slideshowImages');
      if (slideshowImages && !Array.isArray(slideshowImages)) {
        setProperty(convertedItem, 'slideshowImages', [slideshowImages]);
      }
    }

    return convertedItem;
  });
}

async function seedDatabase() {
  try {
    const { db } = await connectToDatabase();

    // Clear existing data in MongoDB
    await db.collection('events').deleteMany({});
    await db.collection('performers').deleteMany({});
    await db.collection('tasks').deleteMany({});
    await db.collection('sponsors').deleteMany({});
    await db.collection('eventSponsors').deleteMany({});
    await db.collection('logs').deleteMany({});
    await db.collection('eventInterest').deleteMany({});

    // Check if data file exists
    const dataFilePath = './data.csv';
    if (!fs.existsSync(dataFilePath)) {
      console.error(`Data file not found at ${dataFilePath}`);
      return;
    }

    // Parse the data.csv file
    const parsedData = parseDataCsv();

    // Convert field types for each collection
    const events = convertFieldTypes(getCollection(parsedData, 'events'), 'events');
    const performers = convertFieldTypes(getCollection(parsedData, 'performers'), 'performers');
    const tasks = convertFieldTypes(getCollection(parsedData, 'tasks'), 'tasks');
    const logs = convertFieldTypes(getCollection(parsedData, 'logs'), 'logs');
    const eventSponsors = convertFieldTypes(getCollection(parsedData, 'eventSponsors'), 'eventSponsors');
    const sponsors = convertFieldTypes(getCollection(parsedData, 'sponsors'), 'sponsors');

    // Insert data into MongoDB with logging
    if (events.length > 0) {
      await db.collection('events').insertMany(events);
      console.log(`Inserted ${events.length} events`);
    } else {
      console.log('No events to insert');
    }

    if (performers.length > 0) {
      await db.collection('performers').insertMany(performers);
      console.log(`Inserted ${performers.length} performers`);
    } else {
      console.log('No performers to insert');
    }

    if (sponsors.length > 0) {
      await db.collection('sponsors').insertMany(sponsors);
      console.log(`Inserted ${sponsors.length} sponsors`);
    } else {
      console.log('No sponsors to insert');
    }

    if (tasks.length > 0) {
      await db.collection('tasks').insertMany(tasks);
      console.log(`Inserted ${tasks.length} tasks`);
    } else {
      console.log('No tasks to insert');
    }

    if (eventSponsors.length > 0) {
      await db.collection('eventSponsors').insertMany(eventSponsors);
      console.log(`Inserted ${eventSponsors.length} event sponsors`);
    } else {
      console.log('No event sponsors to insert');
    }

    if (logs.length > 0) {
      await db.collection('logs').insertMany(logs);
      console.log(`Inserted ${logs.length} logs`);
    } else {
      console.log('No logs to insert');
    }

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the database connection before exiting
    process.exit();
  }
}

// Run the seed function
seedDatabase().catch((error) => {
  console.error('Unhandled error in seed function:', error);
  process.exit(1);
});
