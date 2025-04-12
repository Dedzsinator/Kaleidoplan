import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Animated } from 'react-native';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

interface NavBarProps {
    navigation: any;
    opacity?: Animated.AnimatedInterpolation<string | number>;
}

const NavBar = ({ navigation, opacity = 1 }: NavBarProps): JSX.Element => {
    return (
        <Animated.View 
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 99,
                backgroundColor: 'rgba(0,0,0,0.85)',
                opacity,
                paddingTop: STATUS_BAR_HEIGHT + 10,
                paddingBottom: 15,
                paddingHorizontal: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
            pointerEvents="box-none" // Critical: let touches pass through to ScrollView
        >
            <Text
                style={{
                    color: 'white',
                    fontSize: 32,
                    fontWeight: 'bold',
                    fontFamily: 'System',
                    letterSpacing: -1,
                    textAlign: 'center'
                }}
            >
                KALEIDOPLAN
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                    style={{
                        paddingVertical: 10,
                        paddingHorizontal: 18,
                        marginLeft: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.3)',
                        borderRadius: 24
                    }}
                    onPress={() => navigation.navigate('Login')}
                    delayPressIn={200} // Add delay to distinguish from scrolling
                >
                    <Text style={{
                        color: 'white',
                        fontSize: 16,
                        fontWeight: '600',
                        textAlign: 'center'
                    }}>
                        Sign In
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
                        paddingVertical: 10,
                        paddingHorizontal: 18,
                        marginLeft: 10,
                        backgroundColor: 'white',
                        borderRadius: 24
                    }}
                    onPress={() => navigation.navigate('Register')}
                    delayPressIn={200} // Add delay to distinguish from scrolling
                >
                    <Text style={{
                        color: 'black',
                        fontSize: 16,
                        fontWeight: '600',
                        textAlign: 'center'
                    }}>
                        Register
                    </Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

export default NavBar;