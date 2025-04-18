const { connectToDatabase } = require('./mongoConnection');
const { ObjectId } = require('mongodb');
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const fs = require('fs');
const path = require('path');
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
    const char = line[i];

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

// Function to read and parse the data.csv file
function parseDataCsv(filePath) {
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');

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
        console.log('Found header line:', line);
        console.log('Parsed headers:', headers);

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
          console.log('Identified events collection!');
        } else {
          console.warn('Could not identify collection for headers:', headers);
          currentCollection = null;
        }

        console.log(`Found headers for collection: ${currentCollection}`);
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
            item[headers[j]] = values[j];
          }
          collections[currentCollection].push(item);
        } else {
          console.warn(
            `Skipping line with mismatched values count (expected ${headers.length}, got ${values.length}):`,
            line,
          );
          console.warn('Parsed values:', values);
        }
      }
    }

    console.log(`Parsed ${collections.performers.length} performers`);
    console.log(`Parsed ${collections.tasks.length} tasks`);
    console.log(`Parsed ${collections.logs.length} logs`);
    console.log(`Parsed ${collections.eventSponsors.length} event sponsors`);
    console.log(`Parsed ${collections.sponsors.length} sponsors`);
    console.log(`Parsed ${collections.events.length} events`);

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
        convertedItem[key] = value;
        continue;
      }

      if (key === '_id' || key.endsWith('Id')) {
        // Convert ID fields to ObjectId
        try {
          convertedItem[key] = new ObjectId(value);
        } catch (e) {
          // If it's not a valid ObjectId, use as is
          console.warn(`Invalid ObjectId for ${key}: ${value}`);
          convertedItem[key] = value;
        }
      } else if (key.includes('Date') || key === 'createdAt' || key === 'updatedAt' || key === 'changedAt') {
        // Convert date fields to Date objects
        try {
          convertedItem[key] = new Date(value);
        } catch (e) {
          console.warn(`Invalid date for ${key}: ${value}`);
          convertedItem[key] = value;
        }
      } else if (value === 'true' || value === 'false') {
        // Convert boolean fields
        convertedItem[key] = value === 'true';
      } else if (!isNaN(value) && value !== '') {
        // Convert numeric fields
        convertedItem[key] = Number(value);
      } else if ((key === 'performers' || key === 'slideshowImages') && value && value.includes(',')) {
        // Convert array fields - split by comma
        convertedItem[key] = value.split(',').map((item) => {
          const trimmed = item.trim();
          // Try to convert to ObjectId if it's in performers field
          if (key === 'performers') {
            try {
              return new ObjectId(trimmed);
            } catch (e) {
              console.warn(`Invalid ObjectId in performers array: ${trimmed}`);
              return trimmed;
            }
          }
          return trimmed;
        });
      } else {
        // Keep other fields as is
        convertedItem[key] = value;
      }
    }

    // Specific handling for event collection
    if (collectionName === 'events') {
      // Rename coverImage to coverImageUrl to match schema if needed
      if (convertedItem.hasOwnProperty('coverImage')) {
        convertedItem.coverImageUrl = convertedItem.coverImage;
        delete convertedItem.coverImage;
      }

      // Ensure performers is always an array
      if (convertedItem.performers && !Array.isArray(convertedItem.performers)) {
        if (typeof convertedItem.performers === 'string') {
          try {
            convertedItem.performers = [new ObjectId(convertedItem.performers)];
          } catch (e) {
            convertedItem.performers = [convertedItem.performers];
          }
        }
      }

      // Ensure slideshowImages is always an array
      if (convertedItem.slideshowImages && !Array.isArray(convertedItem.slideshowImages)) {
        convertedItem.slideshowImages = [convertedItem.slideshowImages];
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

    console.log('Cleared existing data from MongoDB collections');

    // Define path to data.csv file
    const dataFilePath = path.join(__dirname, 'data.csv');

    // Check if data file exists
    if (!fs.existsSync(dataFilePath)) {
      console.error(`Data file not found at ${dataFilePath}`);
      return;
    }

    console.log(`Reading data file from: ${dataFilePath}`);

    // Parse the data.csv file
    const parsedData = parseDataCsv(dataFilePath);

    // Convert field types for each collection
    console.log('Converting field types...');

    const events = convertFieldTypes(parsedData.events, 'events');
    console.log(`Converted ${events.length} events data`);

    const performers = convertFieldTypes(parsedData.performers, 'performers');
    const tasks = convertFieldTypes(parsedData.tasks, 'tasks');
    const logs = convertFieldTypes(parsedData.logs, 'logs');
    const eventSponsors = convertFieldTypes(parsedData.eventSponsors, 'eventSponsors');
    const sponsors = convertFieldTypes(parsedData.sponsors, 'sponsors');

    // Insert data into MongoDB
    if (events.length > 0) {
      await db.collection('events').insertMany(events);
      console.log(`Inserted ${events.length} events into MongoDB`);
    } else {
      console.log('No events data to insert');
    }

    if (performers.length > 0) {
      await db.collection('performers').insertMany(performers);
      console.log(`Inserted ${performers.length} performers into MongoDB`);
    } else {
      console.log('No performers data to insert');
    }

    if (sponsors.length > 0) {
      await db.collection('sponsors').insertMany(sponsors);
      console.log(`Inserted ${sponsors.length} sponsors into MongoDB`);
    } else {
      console.log('No sponsors data to insert');
    }

    if (tasks.length > 0) {
      await db.collection('tasks').insertMany(tasks);
      console.log(`Inserted ${tasks.length} tasks into MongoDB`);
    } else {
      console.log('No tasks data to insert');
    }

    if (eventSponsors.length > 0) {
      await db.collection('eventSponsors').insertMany(eventSponsors);
      console.log(`Inserted ${eventSponsors.length} event sponsors into MongoDB`);
    } else {
      console.log('No event sponsors data to insert');
    }

    if (logs.length > 0) {
      await db.collection('logs').insertMany(logs);
      console.log(`Inserted ${logs.length} logs into MongoDB`);
    } else {
      console.log('No logs data to insert');
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the database connection before exiting
    console.log('Closing database connection...');
    process.exit();
  }
}

// Run the seed function
seedDatabase().catch((error) => {
  console.error('Unhandled error in seed function:', error);
  process.exit(1);
});
