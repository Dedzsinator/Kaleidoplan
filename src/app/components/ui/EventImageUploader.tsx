import React, { useState, useRef } from 'react';
import { uploadEventImage, uploadEventSlideshowImages } from '@services/imageUpload';
import '../../styles/EventImageUploader.css';

interface EventImageUploaderProps {
  eventId: string;
  onImageUploaded: (imageUrl: string, type: 'cover' | 'slideshow') => void;
  onMultipleImagesUploaded?: (imageUrls: string[]) => void;
  allowMultiple?: boolean;
  imageType: 'cover' | 'slideshow';
  buttonLabel?: string;
  batchUpload?: boolean;
}

const EventImageUploader: React.FC<EventImageUploaderProps> = ({
  eventId,
  onImageUploaded,
  onMultipleImagesUploaded,
  allowMultiple = false,
  imageType = 'slideshow',
  buttonLabel = 'Upload Images',
  batchUpload = false,
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);

  // Function to trigger file input click
  const handleUploadClick = (): void => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // If batch upload is off, upload immediately
    if (!batchUpload) {
      await uploadFiles(files);
    } else {
      // Otherwise, collect files for batch uploading
      const newFiles = Array.from(files);
      setSelectedFiles((prevFiles) => [...prevFiles, ...newFiles]);

      // Generate preview URLs
      const newPreviews = await Promise.all(
        newFiles.map((file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(file);
          });
        }),
      );

      setFilePreviewUrls((prevUrls) => [...prevUrls, ...newPreviews]);
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async (filesToUpload: FileList | File[]): Promise<void> => {
    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const fileArray = Array.from(filesToUpload);

      if (allowMultiple && fileArray.length > 1 && onMultipleImagesUploaded) {
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
        // Upload single file or one at a time
        for (const file of fileArray) {
          const response = await uploadEventImage(eventId, file, imageType);
          onImageUploaded(response.imageUrl, imageType);
        }
      }

      // Clear selected files after successful upload
      if (batchUpload) {
        setSelectedFiles([]);
        setFilePreviewUrls([]);
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

  const handleBatchUpload = async (): Promise<void> => {
    if (selectedFiles.length === 0) {
      setError('No files selected for upload');
      return;
    }

    await uploadFiles(selectedFiles);
  };

  const removeSelectedFile = (index: number): void => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setFilePreviewUrls((prevUrls) => prevUrls.filter((_, i) => i !== index));
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

      {/* Display previews when batch upload is enabled */}
      {batchUpload && filePreviewUrls.length > 0 && (
        <div className="file-previews-container">
          <h4>Selected Images ({filePreviewUrls.length})</h4>
          <div className="file-previews">
            {filePreviewUrls.map((url, index) => (
              <div key={index} className="file-preview-item">
                <img src={url} alt={`Preview ${index + 1}`} className="file-preview-image" />
                <button className="remove-preview-button" onClick={() => removeSelectedFile(index)} title="Remove">
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            className="submit-upload-button"
            onClick={handleBatchUpload}
            disabled={isUploading || filePreviewUrls.length === 0}
          >
            {isUploading
              ? 'Uploading...'
              : `Upload ${filePreviewUrls.length} Image${filePreviewUrls.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {error && <p className="upload-error">{error}</p>}
    </div>
  );
};

export default EventImageUploader;
