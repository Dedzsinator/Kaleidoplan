import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HERO_HEIGHT = 650;

interface HeroProps {
    navigation: any;
    heroImageUrl: string;
    scrollY: Animated.Value;
}

const Hero = ({ navigation, heroImageUrl, scrollY }: HeroProps): JSX.Element => {
    // Animation refs
    const heroScale = useRef(new Animated.Value(1)).current;
    const heroTitleTranslateY = useRef(new Animated.Value(20)).current;
    const heroTitleOpacity = useRef(new Animated.Value(0)).current;

    // Hero animation
    const heroTranslateY = scrollY.interpolate({
        inputRange: [0, HERO_HEIGHT],
        outputRange: [0, HERO_HEIGHT * 0.3],
        extrapolate: 'clamp'
    });

    const heroOpacity = scrollY.interpolate({
        inputRange: [0, HERO_HEIGHT * 0.8],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    useEffect(() => {
        // Animate hero image
        Animated.sequence([
            Animated.timing(heroScale, {
                toValue: 1.05,
                duration: 8000,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease)
            }),
            Animated.timing(heroScale, {
                toValue: 1,
                duration: 4000,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.ease)
            })
        ]).start();

        // Animate hero title
        Animated.timing(heroTitleTranslateY, {
            toValue: 0,
            duration: 1200,
            delay: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic)
        }).start();

        Animated.timing(heroTitleOpacity, {
            toValue: 1,
            duration: 1200,
            delay: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic)
        }).start();
    }, []);

    return (
        <View
            style={{ height: HERO_HEIGHT, width: '100%' }}
            pointerEvents="box-none" // Critical fix: allow touch events to pass through
        >
            {/* Background color */}
            <View
                style={{ position: 'absolute', inset: 0, backgroundColor: 'black' }}
                pointerEvents="none" // Don't intercept any touches
            />

            {/* Hero image with animations */}
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: HERO_HEIGHT,
                    transform: [
                        { translateY: heroTranslateY },
                        { scale: heroScale }
                    ],
                    opacity: heroOpacity
                }}
                pointerEvents="none" // Don't intercept any touches
            >
                <Animated.Image
                    source={{ uri: heroImageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    onError={() => console.log("Hero image failed to load")}
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ position: 'absolute', inset: 0 }}
                    pointerEvents="none" // Don't intercept any touches
                />
            </Animated.View>

            {/* Content container */}
            <View
                style={{
                    position: 'absolute',
                    inset: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 24,
                    paddingTop: STATUS_BAR_HEIGHT + 60
                }}
                pointerEvents="box-none" // Only respond to touches on children
            >
                <Animated.Text
                    style={{
                        color: 'white',
                        fontSize: 64,
                        fontWeight: '800',
                        marginBottom: 16,
                        textAlign: 'center',
                        fontFamily: 'System',
                        letterSpacing: -1.5,
                        opacity: heroTitleOpacity,
                        transform: [{ translateY: heroTitleTranslateY }],
                        textShadowColor: 'rgba(0,0,0,0.5)',
                        textShadowOffset: { width: 0, height: 2 },
                        textShadowRadius: 5,
                    }}
                >
                    Transform Your Events
                </Animated.Text>

                <Text
                    style={{
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: 24,
                        marginBottom: 32,
                        textAlign: 'center',
                        letterSpacing: 0.5,
                        textShadowColor: 'rgba(0,0,0,0.5)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                    }}
                >
                    Plan, organize, and execute flawlessly with Kaleidoplan
                </Text>

                {/* Button - only this should intercept touches */}
                <TouchableOpacity
                    style={{
                        backgroundColor: 'white',
                        paddingVertical: 16,
                        paddingHorizontal: 32,
                        borderRadius: 30,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 5
                    }}
                    onPress={() => navigation.navigate('Login')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    delayPressIn={300} // Add significant delay to prevent scroll conflicts
                >
                    <Text style={{
                        color: 'black',
                        fontWeight: 'bold',
                        fontSize: 18,
                        letterSpacing: 0.5,
                        textAlign: 'center'
                    }}>
                        Explore Events
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Hero;