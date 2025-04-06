import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface AnimatedWavesProps {
    height?: number;
    colors?: string[];
}

const AnimatedWaves = ({
    height = 180,
    colors = ['rgba(106, 17, 203, 0.4)', 'rgba(37, 117, 252, 0.35)', 'rgba(60, 16, 83, 0.3)']
}: AnimatedWavesProps) => {
    // Animation values
    const wave1 = useSharedValue(0);
    const wave2 = useSharedValue(0);
    const wave3 = useSharedValue(0);

    React.useEffect(() => {
        // Animate first wave - more dramatic movement
        wave1.value = withRepeat(
            withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );

        // Animate second wave with delay
        wave2.value = withDelay(800,
            withRepeat(
                withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            )
        );

        // Animate third wave with different delay and speed
        wave3.value = withDelay(400,
            withRepeat(
                withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.cubic) }),
                -1,
                true
            )
        );
    }, []);

    // Enhanced animated styles with more dramatic movement
    const firstWaveStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: wave1.value * width * 0.4 - (width * 0.2) }]
    }));

    const secondWaveStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -wave2.value * width * 0.35 + (width * 0.175) }]
    }));

    const thirdWaveStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: wave3.value * width * 0.3 - (width * 0.15) }]
    }));

    return (
        <View style={[styles.container, { height }]}>
            <Animated.View
                style={[
                    styles.wave,
                    styles.wave1,
                    firstWaveStyle,
                    { backgroundColor: colors[0] }
                ]}
            />
            <Animated.View
                style={[
                    styles.wave,
                    styles.wave2,
                    secondWaveStyle,
                    { backgroundColor: colors[1] }
                ]}
            />
            <Animated.View
                style={[
                    styles.wave,
                    styles.wave3,
                    thirdWaveStyle,
                    { backgroundColor: colors[2] }
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    wave: {
        position: 'absolute',
        width: width * 2,
    },
    wave1: {
        height: 80, // Taller waves
        bottom: 0,
        borderTopLeftRadius: 120, // More dramatic curves
        borderTopRightRadius: 120,
    },
    wave2: {
        height: 60,
        bottom: 25,
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
    },
    wave3: {
        height: 50,
        bottom: 55,
        borderTopLeftRadius: 80,
        borderTopRightRadius: 80,
    },
});

export default AnimatedWaves;