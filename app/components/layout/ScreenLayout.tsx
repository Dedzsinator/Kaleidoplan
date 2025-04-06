import React from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { styled } from 'nativewind';

interface ScreenLayoutProps {
    children: React.ReactNode;
    scrollable?: boolean;
    className?: string;
}

const StyledSafeArea = styled(SafeAreaView, 'flex-1 bg-white');
const StyledContent = styled(View, 'flex-1');
const StyledScrollView = styled(ScrollView, 'flex-1');

export const ScreenLayout = ({
    children,
    scrollable = true,
    className = ''
}: ScreenLayoutProps) => {
    return (
        <StyledSafeArea>
            {scrollable ? (
                <StyledScrollView contentContainerClassName={className}>
                    {children}
                </StyledScrollView>
            ) : (
                <StyledContent className={className}>
                    {children}
                </StyledContent>
            )}
        </StyledSafeArea>
    );
};