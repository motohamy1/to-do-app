import { ColorScheme } from "@/hooks/useTheme";
import { Platform, StyleSheet } from "react-native";

export const createHomeStyles = (colors: ColorScheme, isArabic: boolean = false) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerLeft: {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 4,
    },
    headerDate: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    headerGreeting: {
      fontSize: isArabic ? 24 : 24,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerRight: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface + "20", // transparent
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    scrollContent: {
      paddingVertical: 12,
      paddingBottom: 110,
    },

    // --- Today's Plan Banner ---
    todaysPlanCard: {
      backgroundColor: colors.primary,
      borderRadius: 24,
      padding: 20,
      marginHorizontal: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    todaysPlanTitle: {
      fontSize: isArabic ? 22 : 20,
      fontWeight: '800',
      color: '#000000',
      marginBottom: 4,
    },
    todaysPlanSubtitle: {
      fontSize: isArabic ? 14 : 14,
      color: 'rgba(0,0,0,0.6)',
      fontWeight: '700',
    },

    // --- Filter Pills ---
    pillsContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      backgroundColor: colors.surface + '80', // semi-transparent surface
      borderRadius: 16,
      padding: 4,
      gap: 4,
      marginBottom: 32,
    },
    pill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    pillActive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    pillInactive: {
      backgroundColor: 'transparent',
    },
    pillText: {
      fontSize: 13,
      fontWeight: '700',
    },
    pillSubText: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 1,
    },

    // --- Timeline List ---
    sectionTitleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    sectionTitleText: {
      fontSize: isArabic ? 20 : 18,
      fontWeight: '800',
      color: colors.text,
    },

    // --- Old Card styles repurposed for timeline/category cards ---
    cardContainer: {
      marginStart: 16,
      marginEnd: 16,
      marginBottom: 16,
      flexDirection: 'row',
    },
    timelineColumn: {
      width: 52,
      alignItems: 'center',
      paddingEnd: 4,
    },
    timelineTimeTop: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      textAlign: 'center',
      flexWrap: 'wrap',
    },
    timelineTimeBottom: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      textAlign: 'center',
      flexWrap: 'wrap',
    },
    timelineTime: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardNotDone: {
      borderColor: colors.danger,
      borderWidth: 2,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: isArabic ? 20 : 18,
      fontWeight: "800",
      color: colors.surfaceText,
      flex: 1,
      writingDirection: 'auto',
      fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif-medium',
    },

    // Utilities
    statusAndActionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "600",
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '600',
    },
    iconBtn: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 16,
    },
    dividerDashed: {
      height: 1,
      borderStyle: "dashed",
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: 8,
    },
    projectRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    projectText: {
      fontSize: 13,
      fontStyle: "italic",
      color: colors.textMuted,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    footerStats: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 12,
      color: colors.surfaceText + '99',
      fontWeight: '500',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      paddingVertical: 60,
      alignItems: "center",
    },
    emptyText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textMuted,
      fontWeight: "500",
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    addButtonText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '700',
    },

    addInputContainer: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
      marginBottom: 0,
    },
    addInput: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },
    fab: {
      height: 38,
      paddingHorizontal: 20,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
  });

  return styles;
};