import { ColorScheme } from "@/hooks/useTheme";
import { StyleSheet, Platform } from "react-native";

export const createHomeStyles = (colors: ColorScheme) => {
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
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.primary,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    headerCount: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.textMuted,
    },
    headerRight: {
      padding: 4,
    },
    scrollContent: {
      paddingVertical: 12,
      paddingBottom: 100,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      marginBottom: 8,
      letterSpacing: 1,
      textTransform: "uppercase",
      paddingHorizontal: 24, // As ScrollView content no longer has padding
    },
    horizontalScrollCardContainer: {
      paddingHorizontal: 24,
      gap: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      width: 280, // Fixed width for horizontal scrolling
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.04,
      shadowRadius: 16,
      elevation: 4,
      ...Platform.select({
        android: {
          borderWidth: 1,
          borderColor: colors.border,
        }
      })
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      flex: 1,
    },
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
    timerRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 16,
    },
    timerIcon: {
      marginRight: 8,
    },
    timerText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
      flex: 1,
    },
    timerLabel: {
      fontSize: 12,
      color: colors.textMuted,
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    footerStats: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statText: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "500",
    },
    priorityArrow: {
      marginLeft: "auto",
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 24,
      gap: 12,
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.primary,
    },
    addInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 8,
      marginHorizontal: 24, // Added to keep it padded since list is no longer fully padded
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    addInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
      fontWeight: "500",
      padding: 0,
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
    }
  });

  return styles;
};