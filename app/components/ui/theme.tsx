import React from 'react';
import { Text, View, TouchableOpacity, TextInput, ActivityIndicator, Image, Dimensions } from 'react-native';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Color palette - modern and cohesive
const COLORS = {
  primary: '#0a7ea4',
  primaryLight: '#e1f5fe',
  primaryDark: '#00617f',
  secondary: '#ff9500',
  secondaryLight: '#fff0d9',
  danger: '#ff3b30',
  dangerLight: '#ffeeee',
  success: '#34c759',
  successLight: '#e5f9ed',
  warning: '#ff9500',
  warningLight: '#fff5e6',
  info: '#007aff',
  infoLight: '#e5f1ff',
  dark: '#1a1a1a',
  gray: '#8e8e93',
  grayLight: '#f2f2f7',
  grayMedium: '#e0e0e5',
  white: '#ffffff',
};

// Main container with subtle gradient background
export const GradientContainer = styled(LinearGradient, 'flex-1');
export const Container = styled(View, 'flex-1 bg-gray-50');

// Cards with subtle shadow and rounded corners
export const Card = styled(View, 'bg-white rounded-xl shadow-sm p-5 m-3 border border-gray-100');
export const EventCard = styled(TouchableOpacity, 'bg-white rounded-xl overflow-hidden shadow m-2 border border-gray-100');

// Headers with gradient backgrounds
export const Header = styled(LinearGradient, 'p-5 pt-14 rounded-b-xl');
export const HeaderTitle = styled(Text, 'text-2xl font-bold text-white');
export const HeaderSubtitle = styled(Text, 'text-base text-white/80');

// Typography with improved hierarchy
export const Title = styled(Text, 'text-2xl font-bold text-gray-800 tracking-tight');
export const Subtitle = styled(Text, 'text-xl font-semibold text-gray-700 tracking-tight');
export const BodyText = styled(Text, 'text-base text-gray-600 leading-relaxed');
export const CaptionText = styled(Text, 'text-sm text-gray-500');
export const LinkText = styled(Text, 'text-primary font-medium');

// Form elements with better visual feedback
export const Label = styled(Text, 'text-base font-medium text-gray-700 mb-1');
export const Input = styled(TextInput, 'border border-gray-200 rounded-lg p-4 text-gray-800 bg-white mb-4 shadow-sm');
export const TextArea = styled(TextInput, 'border border-gray-200 rounded-lg p-4 text-gray-800 bg-white mb-4 h-24 shadow-sm');

export const DangerButton = styled(TouchableOpacity, 'bg-danger rounded-xl py-3.5 px-4 flex-row justify-center items-center shadow-sm');
export const DangerButtonText = styled(Text, 'text-white font-semibold text-base');

export const OutlineButton = styled(TouchableOpacity, 'border border-gray-300 rounded-xl py-3.5 px-4 flex-row justify-center items-center shadow-sm');
export const OutlineButtonText = styled(Text, 'text-gray-700 font-semibold text-base');

export const Badge = styled(View, 'rounded-full py-1 px-3');
export const BadgeText = styled(Text, 'text-xs font-medium');

export const SuccessBadge = styled(Badge, 'bg-success-light');
export const SuccessBadgeText = styled(BadgeText, 'text-success');

export const InfoBadge = styled(Badge, 'bg-info-light');
export const InfoBadgeText = styled(BadgeText, 'text-info');

export const WarningBadge = styled(Badge, 'bg-warning-light');
export const WarningBadgeText = styled(BadgeText, 'text-warning');

export const DangerBadge = styled(Badge, 'bg-danger-light');
export const DangerBadgeText = styled(BadgeText, 'text-danger');

// Enhanced loaders
export const LoadingContainer = styled(View, 'flex-1 justify-center items-center bg-white');
export const Spinner = styled(ActivityIndicator, 'mb-2');
export const LoadingText = styled(Text, 'text-primary text-base');

// List items with better spacing
export const ListItem = styled(View, 'bg-white border-b border-gray-200 p-4');
export const ListItemTitle = styled(Text, 'text-base font-semibold text-gray-800');
export const ListItemSubtitle = styled(Text, 'text-sm text-gray-500');

// Improved layout utilities
export const Row = styled(View, 'flex-row items-center');
export const Spacer = styled(View, 'flex-1');

// Enhanced event image handling
export const EventImage = styled(Image, 'h-48 w-full bg-gray-200');
export const PlaceholderImage = styled(View, 'h-48 w-full bg-gradient-to-r from-gray-200 to-gray-300 justify-center items-center');
export const PlaceholderText = styled(Text, 'text-4xl font-bold text-white/50');
export const EventContent = styled(View, 'p-4');
export const EventTitle = styled(Text, 'text-lg font-bold mb-2 text-gray-800');
export const EventDate = styled(Text, 'text-sm text-gray-600 mb-1');
export const EventLocation = styled(Text, 'text-sm text-gray-500 mb-3');

// Status badges
export const UpcomingBadge = styled(Badge, 'bg-blue-100');
export const UpcomingBadgeText = styled(BadgeText, 'text-blue-700');
export const OngoingBadge = styled(Badge, 'bg-green-100');
export const OngoingBadgeText = styled(BadgeText, 'text-green-700');
export const CompletedBadge = styled(Badge, 'bg-gray-100');
export const CompletedBadgeText = styled(BadgeText, 'text-gray-700');

// Filter controls with more polish
export const FilterContainer = styled(View, 'flex-row py-4 px-4 bg-white border-b border-gray-200 shadow-sm');
export const FilterButton = styled(TouchableOpacity, 'py-2 px-4 rounded-full mr-2 border border-gray-300 bg-white shadow-sm');
export const FilterButtonActive = styled(TouchableOpacity, 'py-2 px-4 rounded-full mr-2 bg-primary border border-primary shadow-sm');
export const FilterText = styled(Text, 'text-sm text-gray-600 font-medium');
export const FilterTextActive = styled(Text, 'text-sm text-white font-medium');

// Enhanced floating button
export const FloatingButton = styled(TouchableOpacity, 'absolute right-5 bottom-5 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg elevation-5');

// Event detail components
export const CoverImage = styled(Image, 'w-full h-72 bg-gray-100');
export const GradientOverlay = styled(LinearGradient, 'absolute inset-0 h-72');
export const PlaceholderCover = styled(View, 'w-full h-72 bg-gradient-to-r from-blue-500 to-cyan-500 justify-center items-center');
export const EventDetailPlaceholderText = styled(Text, 'text-8xl font-black text-white opacity-30');
export const HeaderOverlay = styled(View, 'absolute top-0 left-0 right-0 h-24 flex-row items-center px-4 pt-6');
export const BackButton = styled(TouchableOpacity, 'w-10 h-10 rounded-full bg-black/20 backdrop-blur-lg justify-center items-center');
export const ContentContainer = styled(View, 'px-5 pt-6 pb-12 -mt-10 bg-white rounded-t-3xl');
export const EventHeaderRow = styled(View, 'flex-row justify-between items-start mb-5');
export const EventDetailEventTitle = styled(Text, 'text-2xl font-bold text-gray-800 flex-1 mr-4');
export const DetailsContainer = styled(View, 'mb-6 p-4 bg-gray-50 rounded-xl');
export const DetailRow = styled(View, 'flex-row items-center mb-3 last:mb-0');
export const DetailText = styled(Text, 'text-base text-gray-700 ml-3');
export const DescriptionContainer = styled(View, 'mb-8');
export const SectionTitle = styled(Text, 'text-lg font-bold text-gray-800 mb-3');
export const DescriptionText = styled(Text, 'text-base text-gray-700 leading-6');
export const LoginPrompt = styled(TouchableOpacity, 'flex-row items-center p-4 bg-blue-50 rounded-xl mb-6');
export const LoginPromptText = styled(Text, 'text-base text-blue-600 ml-3 flex-1');
export const ErrorContainer = styled(View, 'flex-1 justify-center items-center p-6');
export const ErrorText = styled(Text, 'text-lg text-gray-700 mb-6');
export const BackText = styled(Text, 'text-base text-blue-500');

// Event detail additional components
export const EventImageOverlay = styled(View, 'absolute bottom-0 left-0 right-0 p-4 bg-black/30 backdrop-blur-sm');
export const EventDateBadge = styled(View, 'absolute top-4 right-4 bg-white/90 backdrop-blur-lg rounded-lg py-2 px-3 shadow-sm');
export const EventDateText = styled(Text, 'text-xs font-bold text-blue-600');
export const EventCardFooter = styled(View, 'flex-row justify-between items-center mt-4 pt-4 border-t border-gray-100');
export const OrganizerAvatar = styled(Image, 'w-8 h-8 rounded-full bg-gray-200');
export const OrganizerName = styled(Text, 'text-xs text-gray-600 ml-2');
export const ExpandableDescription = styled(TouchableOpacity, 'mt-2');
export const ReadMoreText = styled(Text, 'text-sm text-blue-500 mt-1');
export const EventStats = styled(View, 'flex-row justify-between bg-gray-50 rounded-lg p-3 mb-6');
export const StatItem = styled(View, 'items-center');
export const StatValue = styled(Text, 'text-lg font-bold text-gray-800');
export const StatLabel = styled(Text, 'text-xs text-gray-500 mt-1');
export const EventTabs = styled(View, 'flex-row border-b border-gray-200 mb-4');
export const EventTab = styled(TouchableOpacity, 'flex-1 py-3 items-center');
export const EventTabText = styled(Text, 'text-gray-500 font-medium');
export const EventTabActive = styled(View, 'absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500');
export const ShareButton = styled(TouchableOpacity, 'absolute right-4 top-20 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md justify-center items-center');

// Task-specific components
export const TaskCard = styled(Card, 'p-4 mb-3 border-l-4 border-l-primary');
export const TaskHeader = styled(View, 'flex-row justify-between items-center mb-2');
export const TaskName = styled(Text, 'text-base font-semibold text-gray-800 flex-1');
export const TaskEventName = styled(Text, 'text-sm text-gray-600 mb-1');
export const TaskDeadline = styled(Text, 'text-sm text-gray-600 mb-3');
export const OverdueText = styled(Text, 'text-danger font-medium');
export const ActionButtons = styled(View, 'flex-row justify-between mt-2');
//export const SectionTitle = styled(Text, 'text-lg font-bold mt-5 mb-3 text-gray-800');
// Empty state components  
export const EmptyContainer = styled(View, 'flex-1 justify-center items-center p-5');
export const EmptyText = styled(Text, 'text-xl font-bold text-gray-700 mt-4');
export const EmptyTitle = styled(Text, 'text-lg font-bold text-gray-800 mt-4 mb-2');
export const EmptyDescription = styled(Text, 'text-sm text-gray-600 text-center max-w-80');

// Gradient creator helper
export const createGradient = (colors = ['#0a7ea4', '#00617f']) => {
  return ({ children, ...props }) => (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      {...props}
    >
      {children}
    </LinearGradient>
  );
};

// Button components
export const PrimaryButton = styled(TouchableOpacity, 'h-12 rounded-full justify-center items-center overflow-hidden');
export const PrimaryButtonText = styled(Text, 'text-base font-bold text-white');
export const SecondaryButton = styled(TouchableOpacity, 'h-12 rounded-full justify-center items-center bg-white');
export const SecondaryButtonText = styled(Text, 'text-base font-medium');

// Task log screen components
export const LogEntryCard = styled(Card, 'mb-3 p-4 border-l-4 border-l-info');
export const LogHeader = styled(View, 'flex-row justify-between items-center mb-2');
export const LogTimestamp = styled(Text, 'text-sm text-gray-500');
export const LogAction = styled(View, 'flex-row items-center');
export const LogActionText = styled(Text, 'text-base font-medium ml-2');
export const LogComment = styled(Text, 'text-gray-700 mt-2 italic');
export const StatusChange = styled(View, 'flex-row items-center mt-3 pt-3 border-t border-gray-100');
export const OldStatus = styled(Text, 'text-sm text-gray-500');
export const NewStatus = styled(Text, 'text-sm font-medium text-gray-800 ml-2');
export const ArrowIcon = styled(View, 'mx-2');

// Export helper components
export const PrimaryGradient = createGradient(['#0a7ea4', '#00617f']);
export const HeaderGradient = createGradient(['#0a7ea4', '#00617f']);
export const PlaceholderGradient = createGradient(['#848f99', '#a5b3bf']);