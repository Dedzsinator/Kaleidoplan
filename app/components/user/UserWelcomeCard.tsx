import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import {
    Card,
    Title,
    BodyText,
} from '../ui/theme';

interface User {
    displayName?: string;
    email?: string;
    role?: string;
}

interface UserWelcomeCardProps {
    user: User | null;
}

const WelcomeCard = styled(Card, 'mb-4');
const IconContainer = styled(View, 'mb-4 self-center bg-primary-100 p-5 rounded-full');

export const UserWelcomeCard = ({ user }: UserWelcomeCardProps) => {
    return (
        <WelcomeCard>
            <IconContainer>
                <Ionicons name="person-circle-outline" size={60} color="#0a7ea4" />
            </IconContainer>

            <Title className="text-center mb-2">
                Welcome, {user?.displayName || user?.email}!
            </Title>

            <BodyText className="text-center mb-2">
                {user?.role === 'admin'
                    ? 'You are logged in as an administrator.'
                    : 'You are logged in as an event organizer.'}
            </BodyText>
        </WelcomeCard>
    );
};