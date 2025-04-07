import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, Animated, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ImageSlideshowProps {
    images: string[];
    interval?: number; // in milliseconds
    height?: number;
    showGradient?: boolean;
}

const ImageSlideshow = ({
    images,
    interval = 5000,
    height = 200,
    showGradient = true
}: ImageSlideshowProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
    const opacity = useRef(new Animated.Value(1)).current;

    // Filter out invalid URLs or already failed images
    const validImages = images
        .filter(url => url && url.trim().length > 0 && !imageErrors[url]);

    // Don't render if there are no images
    if (!validImages || validImages.length === 0) {
        return (
            <View style={[styles.container, { height, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.placeholderText}>No gallery images available</Text>
            </View>
        );
    }

    // Handle image load errors
    const handleImageError = (url: string) => {
        console.log(`Failed to load image: ${url}`);
        setImageErrors(prev => ({ ...prev, [url]: true }));
    };

    // If only one image, render it without animation
    if (validImages.length === 1) {
        return (
            <View style={[styles.container, { height }]}>
                <Image
                    source={{ uri: validImages[0] }}
                    style={styles.image}
                    resizeMode="cover"
                    onError={() => handleImageError(validImages[0])}
                />
                {showGradient && (
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
                        style={StyleSheet.absoluteFill}
                    />
                )}
            </View>
        );
    }

    useEffect(() => {
        const slideTimer = setInterval(() => {
            // Fade out
            Animated.timing(opacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true
            }).start(() => {
                // Change image and fade back in
                setCurrentIndex((prevIndex) =>
                    prevIndex === validImages.length - 1 ? 0 : prevIndex + 1
                );

                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true
                }).start();
            });
        }, interval);

        return () => clearInterval(slideTimer);
    }, [validImages.length]);

    return (
        <View style={[styles.container, { height }]}>
            <Animated.View style={[styles.slideContainer, { opacity }]}>
                <Image
                    source={{ uri: validImages[currentIndex] }}
                    style={styles.image}
                    resizeMode="cover"
                    onError={() => handleImageError(validImages[currentIndex])}
                />
                {showGradient && (
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
                        style={StyleSheet.absoluteFill}
                    />
                )}
            </Animated.View>

            <View style={styles.dotsContainer}>
                {validImages.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            { backgroundColor: index === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)' }
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        marginVertical: 16,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    slideContainer: {
        flex: 1,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    placeholderText: {
        color: '#fff',
        opacity: 0.7,
        fontSize: 14,
    }
});

export default ImageSlideshow;