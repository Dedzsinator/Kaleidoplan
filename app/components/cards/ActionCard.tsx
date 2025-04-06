import React from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { Card, Subtitle } from '../ui/theme';

interface ActionCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

const ActionsContainer = styled(View, 'mt-4 gap-3');

export const ActionCard = ({ title, children, className = '' }: ActionCardProps) => {
    return (
        <Card className={className}>
            <Subtitle className="mb-4">{title}</Subtitle>
            <ActionsContainer>{children}</ActionsContainer>
        </Card>
    );
};