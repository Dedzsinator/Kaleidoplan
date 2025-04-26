import React, { useState, useRef } from 'react';
import { uploadEventImage, uploadEventSlideshowImages } from '../../../services/imageUpload';
import '../../styles/EventImageUploader.css';

interface EventImageUploaderProps {
  eventId: string;
  onImageUploaded: (imageUrl: string, type: 'cover' | 'slideshow') => void;
  onMultipleImagesUploaded?: (imageUrls: string[]) => void;
  allowMultiple?: boolean;
  imageType: 'cover' | 'slideshow';
  buttonLabel?: string;
}

const EventImageUploader: React.FC<EventImageUploaderProps> = ({
  eventId,
  onImageUploaded,
  onMultipleImagesUploaded,
  allowMultiple = false,
  imageType = 'slideshow',
  buttonLabel = 'Upload Images',
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to trigger file input click
  const handleUploadClick = (): void => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      if (allowMultiple && files.length > 1 && onMultipleImagesUploaded) {
        // Convert FileList to array
        const fileArray = Array.from(files);

        // Upload multiple files for slideshow
        const responses = await uploadEventSlideshowImages(eventId, fileArray);

        // Extract image URLs from responses
        const imageUrls = responses.map((response) => response.imageUrl);

        // Call the callback with all image URLs
        onMultipleImagesUploaded(imageUrls);

        // For each image, also call the single image callback if provided
        imageUrls.forEach((url) => {
          onImageUploaded(url, imageType);
        });
      } else {
        // Upload single file (cover image or single slideshow image)
        const response = await uploadEventImage(eventId, files[0], imageType);
        onImageUploaded(response.imageUrl, imageType);
      }

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
      // Reset progress after a delay
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  return (
    <div className="event-image-uploader">
      <button className="upload-button" onClick={handleUploadClick} disabled={isUploading}>
        {isUploading ? 'Uploading...' : buttonLabel}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple={allowMultiple}
        style={{ display: 'none' }}
      />

      {isUploading && (
        <div className="upload-progress-container">
          <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }}></div>
        </div>
      )}

      {error && <p className="upload-error">{error}</p>}
    </div>
  );
};

export default EventImageUploader;
