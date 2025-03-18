import React from 'react';
import { Text, View, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { styled } from 'nativewind';

// Styled components with NativeWind
export const Container = styled(View, 'flex-1 bg-gray-50');
export const Card = styled(View, 'bg-white rounded-lg shadow-sm p-4 m-3');
export const Header = styled(View, 'bg-primary p-5 pt-14');

// Typography
export const Title = styled(Text, 'text-2xl font-bold text-gray-800');
export const HeaderTitle = styled(Text, 'text-2xl font-bold text-white');
export const HeaderSubtitle = styled(Text, 'text-base text-white/80');
export const Subtitle = styled(Text, 'text-xl font-semibold text-gray-700');
export const BodyText = styled(Text, 'text-base text-gray-600');
export const CaptionText = styled(Text, 'text-sm text-gray-500');
export const LinkText = styled(Text, 'text-primary font-medium');

// Form elements
export const Label = styled(Text, 'text-base font-medium text-gray-700 mb-1');
export const Input = styled(TextInput, 'border border-gray-300 rounded-md p-3 text-gray-800 bg-white mb-4');
export const TextArea = styled(TextInput, 'border border-gray-300 rounded-md p-3 text-gray-800 bg-white mb-4 h-24');

// Buttons
export const PrimaryButton = styled(TouchableOpacity, 'bg-primary rounded-lg p-3 flex-row justify-center items-center');
export const PrimaryButtonText = styled(Text, 'text-white font-medium text-base');

export const SecondaryButton = styled(TouchableOpacity, 'bg-white border border-primary rounded-lg p-3 flex-row justify-center items-center');
export const SecondaryButtonText = styled(Text, 'text-primary font-medium text-base');

export const DangerButton = styled(TouchableOpacity, 'bg-danger rounded-lg p-3 flex-row justify-center items-center');
export const DangerButtonText = styled(Text, 'text-white font-medium text-base');

export const OutlineButton = styled(TouchableOpacity, 'border border-gray-300 rounded-lg p-3 flex-row justify-center items-center');
export const OutlineButtonText = styled(Text, 'text-gray-700 font-medium text-base');

// Status badges
export const Badge = styled(View, 'rounded-full py-1 px-3 flex-row items-center justify-center');
export const BadgeText = styled(Text, 'text-xs font-medium');

export const SuccessBadge = styled(Badge, 'bg-success-light');
export const SuccessBadgeText = styled(BadgeText, 'text-success');

export const InfoBadge = styled(Badge, 'bg-info-light');
export const InfoBadgeText = styled(BadgeText, 'text-info');

export const WarningBadge = styled(Badge, 'bg-warning-light');
export const WarningBadgeText = styled(BadgeText, 'text-warning');

export const DangerBadge = styled(Badge, 'bg-danger-light');
export const DangerBadgeText = styled(BadgeText, 'text-danger');

// Loaders
export const LoadingContainer = styled(View, 'flex-1 justify-center items-center');
export const Spinner = styled(ActivityIndicator, 'mb-2');
export const LoadingText = styled(Text, 'text-primary text-base');

// List item
export const ListItem = styled(View, 'bg-white border-b border-gray-200 p-4');
export const ListItemTitle = styled(Text, 'text-base font-semibold text-gray-800');
export const ListItemSubtitle = styled(Text, 'text-sm text-gray-500');

// Simple row
export const Row = styled(View, 'flex-row items-center');
export const Spacer = styled(View, 'flex-1');

// Custom styled components for GuestScreen
export const EventCard = styled(TouchableOpacity, 'bg-white rounded-lg mb-4 overflow-hidden shadow');
export const EventImage = styled(Image, 'h-40 w-full bg-gray-200');
export const PlaceholderImage = styled(View, 'h-40 w-full bg-gray-200 justify-center items-center');
export const PlaceholderText = styled(Text, 'text-4xl font-bold text-gray-400');
export const EventContent = styled(View, 'p-4');
export const EventTitle = styled(Text, 'text-lg font-bold mb-2 text-gray-800');
export const EventDate = styled(Text, 'text-sm text-gray-600 mb-1');
export const EventLocation = styled(Text, 'text-sm text-gray-500 mb-3');
export const UpcomingBadge = styled(Badge, 'bg-blue-100');
export const OngoingBadge = styled(Badge, 'bg-green-100');
export const CompletedBadge = styled(Badge, 'bg-gray-100');
export const ListContainer = styled(View, 'p-4 pb-32');
export const EmptyContainer = styled(View, 'p-5 items-center');
export const EmptyText = styled(Text, 'text-base text-gray-500');
export const FooterContainer = styled(View, 'absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex-row justify-between');

// Custom styled components for EventDetailScreen
export const FilterContainer = styled(View, 'flex-row pb-4 pt-2 px-4 bg-white border-b border-gray-200');
export const FilterButton = styled(TouchableOpacity, 'py-2 px-3 rounded-full mr-2 border border-gray-300');
export const FilterButtonActive = styled(TouchableOpacity, 'py-2 px-3 rounded-full mr-2 bg-primary border border-primary');
export const FilterText = styled(Text, 'text-sm text-gray-600');
export const FilterTextActive = styled(Text, 'text-sm text-white');
export const FloatingButton = styled(TouchableOpacity, 'absolute right-5 bottom-5 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-md');

// Custom styled components for this screen
export const CoverImage = styled(Image, 'w-full h-64 bg-gray-200');
export const PlaceholderCover = styled(View, 'w-full h-64 bg-gray-200 justify-center items-center');
export const EventDetailPlaceholderText = styled(Text, 'text-6xl font-bold text-gray-400');
export const HeaderOverlay = styled(View, 'absolute top-0 left-0 right-0 z-10 flex-row items-center p-4 pt-14');
export const BackButton = styled(TouchableOpacity, 'h-10 w-10 rounded-full bg-black/30 justify-center items-center');
export const ContentContainer = styled(View, 'p-5');
export const EventHeaderRow = styled(View, 'flex-row justify-between items-center mb-4');
export const EventDetailEventTitle = styled(Title, 'flex-1');
export const DetailsContainer = styled(View, 'mb-6');
export const DetailRow = styled(View, 'flex-row items-center mb-3');
export const DetailText = styled(Text, 'text-base text-gray-600 ml-3');
export const DescriptionContainer = styled(View, 'mb-6');
export const SectionTitle = styled(Text, 'text-lg font-bold text-gray-800 mb-3');
export const DescriptionText = styled(BodyText, 'leading-6');
export const LoginPrompt = styled(TouchableOpacity, 'flex-row items-center p-4 bg-gray-100 rounded-xl border border-gray-200 mt-2');
export const LoginPromptText = styled(Text, 'text-base text-gray-600 ml-3 flex-1');
export const ErrorContainer = styled(View, 'flex-1 justify-center items-center p-5');
export const ErrorText = styled(Text, 'text-lg text-danger mb-5');
export const BackText = styled(Text, 'text-primary text-base');

export const UpcomingBadgeText = styled(BadgeText, 'text-blue-700');
export const OngoingBadgeText = styled(BadgeText, 'text-green-700');
export const CompletedBadgeText = styled(BadgeText, 'text-gray-700');