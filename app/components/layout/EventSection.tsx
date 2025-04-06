import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Animated } from 'react-native';
import AnimatedSection from '../ui/AnimatedSection';
import EventPrimaryContent from '../ui/EventPrimaryContent';
import EventSecondaryContent from '../ui/EventSecondaryContent';
import { useSectionVisibility } from '../../hooks/useSectionVisibility';

interface EventSectionProps {
  event: any;
  navigation: any;
  onImageError: (eventId: string) => void;
  index: number;
  scrollY: Animated.Value;
  sectionY: number;
  onVisibilityChange?: (isVisible: boolean, event: any) => void;
}

const EventSection = ({
  event,
  navigation,
  onImageError,
  index,
  scrollY,
  sectionY,
  onVisibilityChange
}: EventSectionProps) => {
  const delay = index * 150;
  const containerRef = useRef<View>(null);
  const [sectionHeight, setSectionHeight] = useState(0);

  // Measure the section height for visibility calculations
  const onLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setSectionHeight(height);
  };

  // Use our visibility hook
  useSectionVisibility(
    scrollY,
    sectionY,
    sectionHeight,
    (isVisible) => {
      if (onVisibilityChange) {
        onVisibilityChange(isVisible, event);
      }
    }
  );

  // If event is missing, render a placeholder
  if (!event || !event.id) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid event data at position {index}</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      ref={containerRef}
      onLayout={onLayout}
    >
      <View style={styles.innerContainer}>
        <View style={styles.contentRow}>
          <View style={styles.primaryContent}>
            <AnimatedSection
              scrollY={scrollY}
              sectionY={sectionY}
              delay={delay}
            >
              <EventPrimaryContent
                event={event}
                navigation={navigation}
                onImageError={onImageError}
              />
            </AnimatedSection>
          </View>

          <View style={styles.secondaryContent}>
            <AnimatedSection
              scrollY={scrollY}
              sectionY={sectionY}
              delay={delay + 200}
            >
              <EventSecondaryContent event={event} />
            </AnimatedSection>
          </View>
        </View>
      </View>

      {/* Section divider */}
      <View style={styles.divider} />
    </View>
  );
};

// Keep your existing styles
const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
  },
  innerContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  contentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  primaryContent: {
    flex: 3,
    minWidth: 300,
    paddingRight: 16,
  },
  secondaryContent: {
    flex: 2,
    minWidth: 300,
    paddingLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '80%',
    alignSelf: 'center',
    marginTop: 48,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: 'rgba(255,100,100,0.1)',
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
  }
});

export default EventSection;