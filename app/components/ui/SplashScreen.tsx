import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedWaves from './AnimatedWaves';

interface SplashScreenProps {
    status?: string;
}

export const SplashScreen = ({ status }: SplashScreenProps) => {
    // Animation values
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);
    const logoOpacity = useSharedValue(0);
    const [loadingText, setLoadingText] = useState('Preparing your experience...');

    useEffect(() => {
        // Update loading message based on status
        if (status) {
            setLoadingText(status);
        }

        // Animate background
        opacity.value = withTiming(1, { duration: 800, easing: Easing.ease });

        // Animate logo with slight delay
        logoOpacity.value = withDelay(
            400,
            withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) })
        );

        // Scale up logo
        scale.value = withDelay(
            400,
            withTiming(1, { duration: 1200, easing: Easing.elastic(1) })
        );
    }, [status]);

    // Animated styles
    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const logoStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#6A11CB', '#2575FC', '#3C1053']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <AnimatedWaves
                height={230}
                colors={['rgba(106, 17, 203, 0.4)', 'rgba(37, 117, 252, 0.35)', 'rgba(60, 16, 83, 0.3)']}
            />

            <Animated.View style={[styles.contentContainer, backgroundStyle]}>
                <Animated.View style={[styles.logoContainer, logoStyle]}>
                    <Image
                        source={require('../../../assets/images/favicon.jpg')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.appName}>Kaleidoplan</Text>
                </Animated.View>

                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.loadingText}>{loadingText}</Text>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 16,
        borderRadius: 20,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 8,
        letterSpacing: 1,
    },
    loadingContainer: {
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
        opacity: 0.8,
    },
});