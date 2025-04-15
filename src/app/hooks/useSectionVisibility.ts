import { useRef, useEffect } from 'react';

// Get window height on the web
let WINDOW_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 768;
const VISIBILITY_THRESHOLD = 0.6; // Section must be 60% visible

export const useSectionVisibility = (
  scrollPosition: number,
  sectionY: number,
  sectionHeight: number,
  onVisibilityChange: (isVisible: boolean) => void
) => {
  const isVisible = useRef(false);

  useEffect(() => {
    // Calculate if section is in the center of the viewport
    const scrollCenter = scrollPosition + WINDOW_HEIGHT / 2;
    const sectionCenter = sectionY + sectionHeight / 2;
    const distance = Math.abs(scrollCenter - sectionCenter);
    const isCurrentlyVisible = distance < (sectionHeight * VISIBILITY_THRESHOLD);

    // Only trigger callback when visibility changes
    if (isCurrentlyVisible !== isVisible.current) {
      isVisible.current = isCurrentlyVisible;
      onVisibilityChange(isCurrentlyVisible);
    }
  }, [scrollPosition, sectionY, sectionHeight, onVisibilityChange]);

  // Setup scroll listener in the component that uses this hook
  useEffect(() => {
    const handleResize = () => {
      // Update window height when window is resized
      WINDOW_HEIGHT = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
};