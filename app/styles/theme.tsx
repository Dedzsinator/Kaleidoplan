import { StyleSheet } from 'react-native';

// Color palette from the original theme
export const COLORS = {
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
    // Tailwind color equivalents
    blue100: '#dbeafe',
    blue500: '#3b82f6',
    blue600: '#2563eb',
    blue700: '#1d4ed8',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    green100: '#dcfce7',
    green700: '#15803d',
    purple100: '#f3e8ff',
    purple700: '#7e22ce',
    red400: '#f87171',
    red500: '#ef4444',
};

export const styles = StyleSheet.create({
    // Container styles
    container: {
        flex: 1,
        backgroundColor: COLORS.grayLight,
    },
    gradientContainer: {
        flex: 1,
    },

    // Card styles
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 20,
        margin: 12,
        borderWidth: 1,
        borderColor: COLORS.gray100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    eventCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        overflow: 'hidden',
        margin: 8,
        borderWidth: 1,
        borderColor: COLORS.gray100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },

    // Header styles
    header: {
        padding: 20,
        paddingTop: 56,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },

    // Typography styles
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.gray800,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.gray700,
        letterSpacing: -0.3,
    },
    bodyText: {
        fontSize: 16,
        color: COLORS.gray600,
        lineHeight: 24,
    },
    captionText: {
        fontSize: 14,
        color: COLORS.gray500,
    },
    linkText: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.primary,
    },

    // Form elements
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.gray700,
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.gray200,
        borderRadius: 8,
        padding: 16,
        backgroundColor: COLORS.white,
        marginBottom: 16,
        color: COLORS.gray800,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
    },
    textArea: {
        borderWidth: 1,
        borderColor: COLORS.gray200,
        borderRadius: 8,
        padding: 16,
        height: 96,
        backgroundColor: COLORS.white,
        marginBottom: 16,
        color: COLORS.gray800,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
    },

    // Button styles
    primaryButton: {
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: COLORS.primary,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    secondaryButton: {
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.gray800,
    },
    dangerButton: {
        backgroundColor: COLORS.danger,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    dangerButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: COLORS.gray300,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    outlineButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.gray700,
    },

    // Badge styles
    badge: {
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Specific badge variants
    successBadge: {
        backgroundColor: COLORS.successLight,
    },
    successBadgeText: {
        color: COLORS.success,
    },
    infoBadge: {
        backgroundColor: COLORS.infoLight,
    },
    infoBadgeText: {
        color: COLORS.info,
    },
    warningBadge: {
        backgroundColor: COLORS.warningLight,
    },
    warningBadgeText: {
        color: COLORS.warning,
    },
    dangerBadge: {
        backgroundColor: COLORS.dangerLight,
    },
    dangerBadgeText: {
        color: COLORS.danger,
    },

    // Layout helpers
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    spinner: {
        marginBottom: 8,
    },
    loadingText: {
        color: COLORS.primary,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spacer: {
        flex: 1,
    },

    // List items
    listItem: {
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
        padding: 16,
    },
    listItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.gray800,
    },
    listItemSubtitle: {
        fontSize: 14,
        color: COLORS.gray500,
    },

    // Event image handling
    eventImage: {
        height: 192,
        width: '100%',
        backgroundColor: COLORS.gray200,
    },
    placeholderImage: {
        height: 192,
        width: '100%',
        backgroundColor: COLORS.gray200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    eventContent: {
        padding: 16,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: COLORS.gray800,
    },
    eventDate: {
        fontSize: 14,
        color: COLORS.gray600,
        marginBottom: 4,
    },
    eventLocation: {
        fontSize: 14,
        color: COLORS.gray500,
        marginBottom: 12,
    },

    // Status badges
    upcomingBadge: {
        backgroundColor: COLORS.blue100,
    },
    upcomingBadgeText: {
        color: COLORS.blue700,
    },
    ongoingBadge: {
        backgroundColor: COLORS.green100,
    },
    ongoingBadgeText: {
        color: COLORS.green700,
    },
    completedBadge: {
        backgroundColor: COLORS.gray100,
    },
    completedBadgeText: {
        color: COLORS.gray700,
    },

    // Filter styles
    filterContainer: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 999,
        marginRight: 8,
        borderWidth: 1,
        borderColor: COLORS.gray300,
        backgroundColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    filterButtonActive: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 999,
        marginRight: 8,
        backgroundColor: COLORS.primary,
        borderWidth: 1,
        borderColor: COLORS.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.gray600,
    },
    filterTextActive: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.white,
    },

    // Event detail components
    coverImage: {
        width: '100%',
        height: 288,
        backgroundColor: COLORS.gray100,
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        height: 288,
    },
    placeholderCover: {
        width: '100%',
        height: 288,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eventDetailPlaceholderText: {
        fontSize: 72,
        fontWeight: '900',
        color: 'rgba(255, 255, 255, 0.3)',
    },

    // More styles from theme.tsx...
    // These would continue with all the components from theme.tsx
});