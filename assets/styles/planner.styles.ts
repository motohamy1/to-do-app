import { ColorScheme } from "@/hooks/useTheme";
import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get('window');
const gapSize = 12;
const paddingHorizontal = 20;
const totalPadding = paddingHorizontal * 2;
// Subtracting border width (approx 3-4px total) and a small buffer to ensure 3 columns
const cardWidth = (width - totalPadding - (gapSize * 2) - 6) / 3;

export const createPlannerStyles = (colors: ColorScheme, isArabic: boolean = false) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: isArabic ? 28 : 24,
      fontWeight: '800',
      color: colors.text,
    },
    monthGrid: {
      paddingHorizontal: paddingHorizontal,
      paddingVertical: 20,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: gapSize,
    },
    monthCard: {
      width: cardWidth,
      height: cardWidth * 1.1,
      borderRadius: 20,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    selectedMonthCard: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    monthName: {
      fontSize: isArabic ? 20 : 18,
      fontWeight: '800',
      color: '#000000',
      marginBottom: 2,
    },
    selectedMonthName: {
      color: '#FFF',
    },
    monthStats: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    selectedMonthStats: {
      color: 'rgba(255,255,255,0.7)',
    },
    monthIndicator: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    dayGrid: {
      paddingHorizontal: paddingHorizontal,
      paddingVertical: 20,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: gapSize,
    },
    dayCard: {
      width: cardWidth,
      height: cardWidth * 1.1,
      borderRadius: 20,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    hasTaskCard: {
      borderColor: colors.primary + '40',
      backgroundColor: colors.primary + '08',
    },
    todayCard: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      elevation: 4,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    dayText: {
      fontSize: isArabic ? 22 : 20,
      fontWeight: '800',
      color: colors.surfaceText,
      marginBottom: 2,
    },
    todayText: {
      color: '#FFF',
    },
    dayStats: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
    },
    todayStats: {
        color: 'rgba(255,255,255,0.7)',
    },
    taskDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
      position: 'absolute',
      bottom: 8,
    },
    dayListContainer: {
      flex: 1,
      marginTop: 10,
    },
    specificDayHeader: {
      paddingHorizontal: 24,
      marginBottom: 20,
    },
    specificDayTitle: {
      fontSize: isArabic ? 32 : 28,
      fontWeight: '800',
      color: colors.text,
    },
    specificDaySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    dayItem: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    dayTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    taskCount: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      paddingHorizontal: 24,
    },
    backText: {
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    taskItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "0C", // Subtle primary purple
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.primary + "20",
      gap: 12,
      width: '92%',
      alignSelf: 'center',
      marginBottom: 8,
    },
    taskItemText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    emptyMonthText: {
      textAlign: 'center',
      marginTop: 40,
      color: colors.textMuted,
      fontSize: 16,
    },
    addDayTaskContainer: {
        paddingHorizontal: 24,
        marginTop: 20,
    }
  });
};
