import api from './api';

// Define types locally to avoid circular imports
export interface ImageUploadResponse {
  success: boolean;
  message: string;
  imageUrl: string;
}

export interface MultipleImageUploadResponse {
  success: boolean;
  message: string;
  imageUrls: string[];
}

// Cloudinary configuration with proper fallbacks and logging
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'kaleidoplan_unsigned';
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dhbcnx8r2';
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Log configuration for debugging
console.log('Cloudinary config:', {
  preset: CLOUDINARY_UPLOAD_PRESET,
  cloudName: CLOUDINARY_CLOUD_NAME
});

export const uploadEventImage = async (
  eventId: string | { _id?: string; id?: string },
  file: File,
  imageType: 'cover' | 'slideshow',
): Promise<ImageUploadResponse> => {
  try {
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    // Add metadata as context
    const context = `eventId=${eventId}|imageType=${imageType}`;
    formData.append('context', context);

    // Add folder structure based on event ID and image type
    const folder = `events/${eventId}/${imageType}`;
    formData.append('folder', folder);

    // Set public_id with unique identifier
    const timestamp = new Date().getTime();
    const publicId = `event_${eventId}_${imageType}_${timestamp}`;
    formData.append('public_id', publicId);

    console.log(`Uploading to Cloudinary: ${CLOUDINARY_API_URL} with preset: ${CLOUDINARY_UPLOAD_PRESET}`);

    // Upload image directly to Cloudinary
    const response = await fetch(CLOUDINARY_API_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary error response:', errorData);
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    console.log('Upload successful:', data.secure_url);

    // Extract the MongoDB _id if the eventId is an object
    const actualEventId = typeof eventId === 'object' ? (eventId._id || eventId.id) : eventId;

    console.log('Storing image reference with eventId:', actualEventId);

    // Store the reference in your database through your API
    await api.post('/events/image-reference', {
      eventId: actualEventId,
      imageType: imageType,
      imageUrl: data.secure_url,
      cloudinaryPublicId: data.public_id
    });

    return {
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: data.secure_url
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const uploadEventSlideshowImages = async (
  eventId: string,
  files: File[]
): Promise<ImageUploadResponse[]> => {
  try {
    // Upload each file individually and collect the responses
    const uploadPromises = files.map(async (file, index) => {
      // Create a FormData object for each file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      // Add metadata as context
      const context = `eventId=${eventId}|imageType=slideshow|index=${index}`;
      formData.append('context', context);

      // Add folder structure based on event ID
      const folder = `events/${eventId}/slideshow`;
      formData.append('folder', folder);

      // Set public_id with unique identifier including index
      const timestamp = new Date().getTime();
      const publicId = `event_${eventId}_slideshow_${index}_${timestamp}`;
      formData.append('public_id', publicId);

      // Upload to Cloudinary
      const response = await fetch(CLOUDINARY_API_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      return await response.json();
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);

    // Extract the secure URLs from the results
    const imageUrls = results.map(result => result.secure_url);

    // Store the references in your database
    await api.post('/events/image-references', {
      eventId: eventId,
      imageType: 'slideshow',
      imageUrls: imageUrls,
      cloudinaryPublicIds: results.map(result => result.public_id)
    });

    // Return responses in the expected format
    return results.map(result => ({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url
    }));
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

// Optional: Add a function to delete images from Cloudinary
export const deleteEventImage = async (
  publicId: string
): Promise<boolean> => {
  try {
    // Delete through your backend API which should handle Cloudinary API authentication
    await api.delete(`/events/images/${encodeURIComponent(publicId)}`);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};
