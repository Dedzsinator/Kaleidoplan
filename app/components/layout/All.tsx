import React from 'react';
import { Text, View, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, styles } from '../../styles/theme';

// Container components
export const Container = ({ style, children, ...props }) => (
    <View style={[styles.container, style]} {...props}>
        {children}
    </View>
);

export const GradientContainer = ({ colors = [COLORS.primary, COLORS.primaryDark], style, children, ...props }) => (
    <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientContainer, style]}
        {...props}
    >
        {children}
    </LinearGradient>
);

// Card components
export const Card = ({ style, children, ...props }) => (
    <View style={[styles.card, style]} {...props}>
        {children}
    </View>
);

export const EventCard = ({ style, children, ...props }) => (
    <TouchableOpacity style={[styles.eventCard, style]} {...props}>
        {children}
    </TouchableOpacity>
);

// Header components
export const Header = ({ colors = [COLORS.primary, COLORS.primaryDark], style, children, ...props }) => (
    <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, style]}
        {...props}
    >
        {children}
    </LinearGradient>
);

export const HeaderTitle = ({ style, children, ...props }) => (
    <Text style={[styles.headerTitle, style]} {...props}>
        {children}
    </Text>
);

export const HeaderSubtitle = ({ style, children, ...props }) => (
    <Text style={[styles.headerSubtitle, style]} {...props}>
        {children}
    </Text>
);

// Typography components
export const Title = ({ style, children, ...props }) => (
    <Text style={[styles.title, style]} {...props}>
        {children}
    </Text>
);

export const Subtitle = ({ style, children, ...props }) => (
    <Text style={[styles.subtitle, style]} {...props}>
        {children}
    </Text>
);

export const BodyText = ({ style, children, ...props }) => (
    <Text style={[styles.bodyText, style]} {...props}>
        {children}
    </Text>
);

export const CaptionText = ({ style, children, ...props }) => (
    <Text style={[styles.captionText, style]} {...props}>
        {children}
    </Text>
);

export const LinkText = ({ style, children, ...props }) => (
    <Text style={[styles.linkText, style]} {...props}>
        {children}
    </Text>
);

// Form components
export const Label = ({ style, children, ...props }) => (
    <Text style={[styles.label, style]} {...props}>
        {children}
    </Text>
);

export const Input = ({ style, ...props }) => (
    <TextInput
        style={[styles.input, style]}
        placeholderTextColor={COLORS.gray400}
        {...props}
    />
);

export const TextArea = ({ style, ...props }) => (
    <TextInput
        multiline
        style={[styles.textArea, style]}
        placeholderTextColor={COLORS.gray400}
        {...props}
    />
);

// Button components
export const PrimaryButton = ({ style, children, ...props }) => (
    <TouchableOpacity style={[styles.primaryButton, style]} {...props}>
        {children}
    </TouchableOpacity>
);

export const PrimaryButtonText = ({ style, children, ...props }) => (
    <Text style={[styles.primaryButtonText, style]} {...props}>
        {children}
    </Text>
);

export const SecondaryButton = ({ style, children, ...props }) => (
    <TouchableOpacity style={[styles.secondaryButton, style]} {...props}>
        {children}
    </TouchableOpacity>
);

export const SecondaryButtonText = ({ style, children, ...props }) => (
    <Text style={[styles.secondaryButtonText, style]} {...props}>
        {children}
    </Text>
);

// Continue defining all the components from theme.tsx...
// This would include all the badges, event components, etc.

// Helper function for gradient components
export const createGradient = (defaultColors = [COLORS.primary, COLORS.primaryDark]) => {
    return ({ colors = defaultColors, style, children, ...props }) => (
        <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={style}
            {...props}
        >
            {children}
        </LinearGradient>
    );
};

// Export helper components
export const PrimaryGradient = createGradient([COLORS.primary, COLORS.primaryDark]);
export const HeaderGradient = createGradient([COLORS.primary, COLORS.primaryDark]);
export const PlaceholderGradient = createGradient([COLORS.gray400, COLORS.gray300]);