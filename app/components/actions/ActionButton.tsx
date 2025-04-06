import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconWrapper } from '../ui/IconWrapper';

interface ActionButtonProps {
    label: React.ReactNode;
    icon: string;
    onPress: () => void;
    ButtonComponent: React.ComponentType<any>;
    iconColor: string;
    className?: string;
}

export const ActionButton = ({
    label,
    icon,
    onPress,
    ButtonComponent,
    iconColor,
    className = ''
}: ActionButtonProps) => {
    return (
        <ButtonComponent
            onPress={onPress}
            className={`flex-row justify-center ${className}`}
        >
            <IconWrapper>
                <Ionicons name={icon} size={18} color={iconColor} />
            </IconWrapper>
            {label}
        </ButtonComponent>
    );
};