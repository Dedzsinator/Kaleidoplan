import React from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';

interface IconWrapperProps {
    children: React.ReactNode;
    className?: string;
}

const StyledIconContainer = styled(View, 'mr-2');

export const IconWrapper = ({ children, className = '' }: IconWrapperProps) => {
    return <StyledIconContainer className={className}>{children}</StyledIconContainer>;
};