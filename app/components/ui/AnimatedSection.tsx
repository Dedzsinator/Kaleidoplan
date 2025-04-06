import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing } from 'react-native';

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
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const animated = useRef(false);

    useEffect(() => {
        // Start with some minimal visibility to debug issues
        opacity.setValue(0.1);

        const listenerId = scrollY.addListener(({ value }) => {
            // If we've scrolled past the trigger point and haven't animated yet
            if (value > sectionY - triggerPoint && !animated.current) {
                animated.current = true;

                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: 0,
                        duration: 800,
                        delay,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.bezier(0.16, 1, 0.3, 1)),
                    }),
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 800,
                        delay,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        });

        // Always animate if sectionY is 0 (or invalid)
        if (sectionY <= 0) {
            animated.current = true;
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 800,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    delay,
                    useNativeDriver: true,
                }),
            ]).start();
        }

        return () => {
            scrollY.removeListener(listenerId);
        };
    }, [scrollY, sectionY]);

    return (
        <Animated.View
            style={{
                transform: [{ translateY }],
                opacity,
            }}
        >
            {children}
        </Animated.View>
    );
};

export default AnimatedSection;