import React, { useState, useEffect, useRef } from 'react';
import '../../styles/SlideShow.css';

interface ImageSlideshowProps {
  images: string[];
  interval?: number; // in milliseconds
  height?: number;
  showGradient?: boolean;
}

const ImageSlideshow = ({ images, interval = 5000, height = 200, showGradient = true }: ImageSlideshowProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [fading, setFading] = useState(false);
  const slideTimerRef = useRef<number | null>(null);

  // Filter out invalid URLs or already failed images
  const validImages = images.filter((url) => url && url.trim().length > 0 && !imageErrors[url]);

  // Handle image load errors
  const handleImageError = (url: string) => {
    console.log(`Failed to load image: ${url}`);
    setImageErrors((prev) => ({ ...prev, [url]: true }));
  };

  // FIXED: Move useEffect before any conditional returns
  useEffect(() => {
    // Only start the slideshow if we have multiple images
    if (validImages.length <= 1) {
      return;
    }

    const nextSlide = () => {
      setFading(true);

      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex === validImages.length - 1 ? 0 : prevIndex + 1));
        setFading(false);
      }, 1000); // Match this with CSS transition time
    };

    // Start the slideshow
    if (slideTimerRef.current !== null) {
      clearInterval(slideTimerRef.current);
    }

    slideTimerRef.current = window.setInterval(nextSlide, interval);

    return () => {
      if (slideTimerRef.current !== null) {
        clearInterval(slideTimerRef.current);
      }
    };
  }, [validImages.length, interval]);

  // Don't render if there are no images
  if (!validImages || validImages.length === 0) {
    return (
      <div className="slideshow-container" style={{ height }}>
        <p className="placeholder-text">No gallery images available</p>
      </div>
    );
  }

  // If only one image, render it without animation
  if (validImages.length === 1) {
    return (
      <div className="slideshow-container" style={{ height }}>
        <div className="slide">
          <img
            src={validImages[0]}
            alt="Slideshow"
            className="slide-image"
            onError={() => handleImageError(validImages[0])}
          />
          {showGradient && <div className="gradient-overlay"></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="slideshow-container" style={{ height }}>
      <div className={`slide ${fading ? 'fade-out' : 'fade-in'}`}>
        <img
          src={validImages[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          className="slide-image"
          onError={() => handleImageError(validImages[currentIndex])}
        />
        {showGradient && <div className="gradient-overlay"></div>}
      </div>

      <div className="dots-container">
        {validImages.map((_, index) => (
          <span
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageSlideshow;
