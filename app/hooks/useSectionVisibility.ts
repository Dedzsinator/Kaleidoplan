import { useRef, useEffect } from 'react';
import { Dimensions } from 'react-native';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const VISIBILITY_THRESHOLD = 0.6; // Section must be 60% visible

export const useSectionVisibility = (
  scrollY: any,
  sectionY: number,
  sectionHeight: number,
  onVisibilityChange: (isVisible: boolean) => void
) => {
  const isVisible = useRef(false);

  useEffect(() => {
    if (!scrollY) return;

    const listenerId = scrollY.addListener(({ value }) => {
      // Calculate if section is in the center of the viewport
      const scrollCenter = value + WINDOW_HEIGHT / 2;
      const sectionCenter = sectionY + sectionHeight / 2;
      const distance = Math.abs(scrollCenter - sectionCenter);
      const isCurrentlyVisible = distance < (sectionHeight * VISIBILITY_THRESHOLD);

      // Only trigger callback when visibility changes
      if (isCurrentlyVisible !== isVisible.current) {
        isVisible.current = isCurrentlyVisible;
        onVisibilityChange(isCurrentlyVisible);
      }
    });

    return () => {
      if (scrollY) {
        scrollY.removeListener(listenerId);
      }
    };
  }, [scrollY, sectionY, sectionHeight]);
};