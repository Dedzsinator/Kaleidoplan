import { executeQuery } from '@/app/msssql';

// User management functions
export async function createUserInDatabase(
  userId: string, 
  email: string, 
  displayName: string, 
  role: 'guest' | 'organizer' | 'admin'
) {
  const query = `
    INSERT INTO Users (userId, email, displayName, role, createdAt)
    VALUES (@userId, @email, @displayName, @role, GETDATE())
  `;

  await executeQuery(query, {
    userId,
    email,
    displayName,
    role
  });
}

export async function getUserById(userId: string) {
  const query = `
    SELECT userId, email, displayName, role, photoURL 
    FROM Users 
    WHERE userId = @userId
  `;

  const result = await executeQuery(query, { userId });
  return result.recordset[0];
}

export async function updateUserRole(userId: string, role: 'guest' | 'organizer' | 'admin') {
  const query = `
    UPDATE Users 
    SET role = @role 
    WHERE userId = @userId
  `;

  await executeQuery(query, { userId, role });
}

// Event management functions
export async function getEvents() {
  const query = `
    SELECT 
      e.eventId, 
      e.name, 
      e.description, 
      e.location, 
      e.startDate, 
      e.endDate, 
      e.status, 
      e.coverImageUrl, 
      u.displayName as creatorName
    FROM Events e
    JOIN Users u ON e.createdBy = u.userId
    ORDER BY e.startDate ASC
  `;

  const result = await executeQuery(query);
  return result.recordset;
}

export async function getEventById(eventId: number) {
  const query = `
    SELECT 
      e.eventId, 
      e.name, 
      e.description, 
      e.location, 
      e.startDate, 
      e.endDate, 
      e.status, 
      e.coverImageUrl, 
      e.createdBy,
      u.displayName as creatorName
    FROM Events e
    JOIN Users u ON e.createdBy = u.userId
    WHERE e.eventId = @eventId
  `;

  const result = await executeQuery(query, { eventId });
  return result.recordset[0];
}

export async function uploadEventImage(imageUri: string): Promise<string> {
  try {
    // For development/testing purposes, return a placeholder image URL
    // In production, implement proper image upload to your server
    return 'https://via.placeholder.com/800x400?text=Event+Image';

    /* Real implementation would be like:
    const formData = new FormData();
    const uriParts = imageUri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    
    // @ts-ignore
    formData.append('image', {
      uri: imageUri,
      name: fileName,
      type: 'image/jpeg'
    });
    
    const response = await fetch('YOUR_SERVER_URL/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    
    const data = await response.json();
    return data.imageUrl;
    */
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function createEvent(
  name: string, 
  description: string, 
  location: string, 
  startDate: Date, 
  endDate: Date, 
  coverImageUrl: string | null, 
  createdBy: string
) {
  const query = `
    INSERT INTO Events (name, description, location, startDate, endDate, status, coverImageUrl, createdBy, createdAt)
    VALUES (@name, @description, @location, @startDate, @endDate, 'upcoming', @coverImageUrl, @createdBy, GETDATE());
    
    SELECT SCOPE_IDENTITY() AS eventId;
  `;

  const result = await executeQuery(query, {
    name,
    description,
    location,
    startDate,
    endDate,
    coverImageUrl,
    createdBy
  });

  return result.recordset[0].eventId;
}

export async function updateEvent(
  eventId: number, 
  name: string, 
  description: string, 
  location: string, 
  startDate: Date, 
  endDate: Date, 
  coverImageUrl: string | null
) {
  const query = `
    UPDATE Events 
    SET name = @name, 
        description = @description, 
        location = @location, 
        startDate = @startDate, 
        endDate = @endDate, 
        coverImageUrl = @coverImageUrl,
        status = CASE 
          WHEN @startDate > GETDATE() THEN 'upcoming'
          WHEN @endDate < GETDATE() THEN 'completed'
          ELSE 'ongoing'
        END
    WHERE eventId = @eventId
  `;

  await executeQuery(query, {
    eventId,
    name,
    description,
    location,
    startDate,
    endDate,
    coverImageUrl
  });
}

export async function deleteEvent(eventId: number) {
  const query = `
    DELETE FROM Events 
    WHERE eventId = @eventId
  `;

  await executeQuery(query, { eventId });
}

// Add organizer to event
export async function addOrganizerToEvent(eventId: number, userId: string) {
  const query = `
    INSERT INTO EventOrganizers (eventId, userId)
    VALUES (@eventId, @userId)
  `;

  await executeQuery(query, { eventId, userId });
}

// Get organizers
export async function getOrganizers() {
  const query = `
    SELECT userId, displayName, email, photoURL
    FROM Users
    WHERE role = 'organizer' OR role = 'admin'
  `;

  const result = await executeQuery(query);
  return result.recordset;
}