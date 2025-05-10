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

export const uploadEventImage = async (
  eventId: string,
  file: File,
  imageType: 'cover' | 'slideshow',
): Promise<ImageUploadResponse> => {
  try {
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('image', file);
    formData.append('eventId', eventId);
    formData.append('imageType', imageType);

    const response = await api.post('/events/images/upload', formData);

    // Extract image URL from response
    let imageUrl = '';

    if (response && typeof response === 'object') {
      const responseObj = response as Record<string, unknown>;

      if (typeof responseObj.imageUrl === 'string') {
        imageUrl = responseObj.imageUrl;
      } else if (responseObj.data && typeof responseObj.data === 'object') {
        const dataObj = responseObj.data as Record<string, unknown>;
        if (typeof dataObj.imageUrl === 'string') {
          imageUrl = dataObj.imageUrl;
        }
      }
    }

    if (!imageUrl) {
      console.error('Image URL not found in response:', response);
      throw new Error('Image URL not found in response');
    }

    return {
      success: true,
      message: 'Image uploaded successfully',
      imageUrl,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const uploadEventSlideshowImages = async (eventId: string, files: File[]): Promise<ImageUploadResponse[]> => {
  try {
    const formData = new FormData();

    // Append each file with a unique key
    files.forEach((file, index) => {
      formData.append('images', file); // Changed key to 'images' to match server expectation
    });

    formData.append('eventId', eventId);
    formData.append('imageType', 'slideshow');

    const response = await api.post('/events/images/upload-multiple', formData);

    // Extract image URLs from response
    let imageUrls: string[] = [];

    if (response && typeof response === 'object') {
      const responseObj = response as Record<string, unknown>;

      if (Array.isArray(responseObj.imageUrls)) {
        imageUrls = responseObj.imageUrls as string[];
      } else if (responseObj.data && typeof responseObj.data === 'object') {
        const dataObj = responseObj.data as Record<string, unknown>;
        if (Array.isArray(dataObj.imageUrls)) {
          imageUrls = dataObj.imageUrls as string[];
        }
      }
    }

    if (imageUrls.length === 0) {
      console.error('No image URLs found in response:', response);
      throw new Error('No image URLs found in response');
    }

    // Return array of ImageUploadResponse objects
    return imageUrls.map((imageUrl) => ({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl,
    }));
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};
