import React from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import {
    Card,
    Subtitle,
    PrimaryButton,
    PrimaryButtonText,
    SecondaryButton,
    SecondaryButtonText,
    DangerButton,
    DangerButtonText
} from '../ui/theme';
import { ActionButton } from './ActionButton';

interface User {
    role?: string;
}

interface QuickActionsProps {
    user: User | null;
    navigation: any;
    onLogout: () => Promise<void>;
}

const ActionsContainer = styled(View, 'mt-4 gap-3');

export const QuickActions = ({ user, navigation, onLogout }: QuickActionsProps) => {
    return (
        <Card>
            <Subtitle className="mb-4">Quick Actions</Subtitle>

            <ActionsContainer>
                {user?.role === 'admin' && (
                    <ActionButton
                        label={<PrimaryButtonText>Admin Dashboard</PrimaryButtonText>}
                        icon="grid-outline"
                        onPress={() => navigation.navigate('AdminPanel')}
                        ButtonComponent={PrimaryButton}
                        iconColor="#fff"
                    />
                )}

                <ActionButton
                    label={<SecondaryButtonText>
                        {user?.role === 'admin' ? 'Manage Events' : 'My Tasks'}
                    </SecondaryButtonText>}
                    icon={user?.role === 'admin' ? "calendar-outline" : "list-outline"}
                    onPress={() => navigation.navigate(user?.role === 'admin' ? 'EventList' : 'OrganizerTask')}
                    ButtonComponent={SecondaryButton}
                    iconColor="#0a7ea4"
                />

                <ActionButton
                    label={<DangerButtonText>Logout</DangerButtonText>}
                    icon="log-out-outline"
                    onPress={onLogout}
                    ButtonComponent={DangerButton}
                    iconColor="#fff"
                />
            </ActionsContainer>
        </Card>
    );
};