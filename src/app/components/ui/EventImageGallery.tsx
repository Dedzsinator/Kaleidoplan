import React, { useState } from 'react';
import '../../styles/EventImageUploader.css';

interface EventImageGalleryProps {
  images: string[];
  onRemoveImage?: (index: number) => void;
  allowRemove?: boolean;
}

const EventImageGallery: React.FC<EventImageGalleryProps> = ({ images, onRemoveImage, allowRemove = false }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Handle clicking on an image to view it larger
  const handleImageClick = (image: string): void => {
    setSelectedImage(image);
  };

  // Handle removing an image from the gallery
  const handleRemoveImage = (index: number, e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onRemoveImage) {
      onRemoveImage(index);
    }
  };

  // Close the enlarged image view
  const closeEnlargedView = (): void => {
    setSelectedImage(null);
  };

  return (
    <div className="image-gallery">
      <div className="image-gallery-grid">
        {images.map((image, index) => (
          <div key={`${image}-${index}`} className="gallery-image-container">
            <img
              src={image}
              alt={`Gallery image ${index + 1}`}
              className="gallery-image"
              onClick={() => handleImageClick(image)}
            />
            {allowRemove && (
              <button className="remove-image-button" onClick={(e) => handleRemoveImage(index, e)} title="Remove image">
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Enlarged image view */}
      {selectedImage && (
        <div className="enlarged-image-overlay" onClick={closeEnlargedView}>
          <div className="enlarged-image-container">
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="enlarged-image"
              onClick={(e) => e.stopPropagation()}
            />
            <button className="close-enlarged-button" onClick={closeEnlargedView}>
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventImageGallery;
