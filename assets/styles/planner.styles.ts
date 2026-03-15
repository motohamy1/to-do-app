import { ColorScheme } from "@/hooks/useTheme";
import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get('window');
const gapSize = 20;
const paddingSize = 48; // 24 each side
const monthCircleSize = (width - paddingSize - (gapSize * 2)) / 3;
const dayCircleSize = (width - 40 - (12 * 3)) / 4;

export const createPlannerStyles = (colors: ColorScheme) => {
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
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    monthGrid: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 32,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignContent: 'space-around',
    },
    monthCircle: {
      width: monthCircleSize,
      height: monthCircleSize,
      borderRadius: monthCircleSize / 2,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    selectedMonthCircle: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    monthText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    selectedMonthText: {
      color: '#FFF',
    },
    dayGrid: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: 12,
    },
    dayCircle: {
      width: dayCircleSize,
      height: dayCircleSize,
      borderRadius: dayCircleSize / 2,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    hasTaskCircle: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    todayCircle: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayCircleText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    hasTaskText: {
      color: colors.primary,
    },
    todayText: {
      color: '#FFF',
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
      fontSize: 28,
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
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    taskText: {
      fontSize: 14,
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
