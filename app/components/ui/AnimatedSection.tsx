import React, { useRef, useEffect, useMemo } from 'react';
import { Animated, Easing } from 'react-native';

interface AnimatedSectionProps {
    children: React.ReactNode;
    delay?: number;
    triggerPoint?: number;
    scrollY: Animated.Value;
    sectionY: number;
}

const AnimatedSection = ({
    children,
    delay = 0,
    triggerPoint = 300,
    scrollY,
    sectionY = 0
}: AnimatedSectionProps) => {
    // Use refs for animated values
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const animated = useRef(false);
    const listenerRef = useRef(null);

    // Memoize animation config to avoid recreating on rerenders
    const animationConfig = useMemo(() => ({
        timing: {
            duration: 800,
            delay,
            useNativeDriver: true,
            easing: Easing.out(Easing.bezier(0.16, 1, 0.3, 1)),
        }
    }), [delay]);

    // Start animations function
    const startAnimations = () => {
        if (animated.current) return;
        animated.current = true;

        // Run animations in parallel for better performance
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                ...animationConfig.timing
            }),
            Animated.timing(opacity, {
                toValue: 1,
                ...animationConfig.timing
            }),
        ]).start();
    };

    useEffect(() => {
        // Clean up and reset on component unmount or sectionY change
        return () => {
            if (listenerRef.current !== null) {
                scrollY.removeListener(listenerRef.current);
                listenerRef.current = null;
            }
        };
    }, []);

    // Handle scroll position changes efficiently
    useEffect(() => {
        // Don't set initial opacity - start fully transparent
        // This avoids the flash of content before animation

        // Immediate animation if component is already in view when mounted
        if (scrollY._value > sectionY - triggerPoint || sectionY <= 0) {
            startAnimations();
            return; // No need to add listener if we're already animating
        }

        // Add scroll listener only if we're not already in view
        listenerRef.current = scrollY.addListener(({ value }) => {
            if (value > sectionY - triggerPoint) {
                startAnimations();

                // Remove listener after animation starts for better performance
                if (listenerRef.current !== null) {
                    scrollY.removeListener(listenerRef.current);
                    listenerRef.current = null;
                }
            }
        });

        return () => {
            if (listenerRef.current !== null) {
                scrollY.removeListener(listenerRef.current);
                listenerRef.current = null;
            }
        };
    }, [scrollY, sectionY, triggerPoint]);

    // Memoize style to prevent unnecessary re-renders
    const animatedStyle = useMemo(() => ({
        transform: [{ translateY }],
        opacity,
    }), [translateY, opacity]);

    return (
        <Animated.View
            style={animatedStyle}
            pointerEvents="box-none" // Critical for allowing scroll gestures to pass through
            // Add accessibility props for better screen reader support
            accessible={true}
            accessibilityRole="none"
        >
            {children}
        </Animated.View>
    );
};

export default AnimatedSection;