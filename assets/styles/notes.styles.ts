import { StyleSheet, Dimensions, Platform } from 'react-native';
import { ColorScheme } from "@/hooks/useTheme";

const { width } = Dimensions.get('window');
const cardWidth = width * 0.45;
const gridCardWidth = (width - 48 - 12) / 2; // (Screen - horizontal padding*2 - gap) / 2


export const createNotesStyles = (colors: ColorScheme, isArabic: boolean = false) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.bg,
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
      fontSize: isArabic ? 28 : 26,
      fontWeight: '800',
      color: colors.text,
    },
    sectionContainer: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: isArabic ? 22 : 20,
      fontWeight: '700',
      color: colors.text,
    },
    listContent: {
      paddingHorizontal: 20,
    },
    card: {
      width: cardWidth,
      height: 125,
      borderRadius: 20,
      padding: 16,
      marginHorizontal: 8,
      justifyContent: 'space-between',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#000000',
      marginBottom: 8,
      fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif-medium',
      writingDirection: 'auto',
    },
    loneColumnCentered: {
      justifyContent: 'center',
      height: 290, // Match horizontalGridContainer height
    },
    cardDesc: {
      fontSize: 14,
      fontWeight: '500',
      color: 'rgba(0,0,0,0.6)',
      flex: 1,
    },
    cardDate: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(0,0,0,0.8)',
    },
    emptyText: {
      paddingHorizontal: 24,
      color: colors.textMuted,
      fontSize: 14,
      fontStyle: 'italic',
    },
    fab: {
      position: 'absolute',
      bottom: 100,
      right: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
      zIndex: 100,
    },
    detailSafeArea: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    detailHeaderBtn: {
      width: 44,
      height: 44,
      borderRadius: 22, // perfect circle
      backgroundColor: colors.surface, // subtle background for icon containers
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    detailHeaderBtnIcon: {
      color: colors.text, // icon matches the text color
    },
    detailHeaderRight: {
      flexDirection: 'row',
      gap: 12,
    },
    detailContent: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    titleInput: {
      fontSize: 34,
      fontWeight: '800',
      fontFamily: Platform.OS === 'ios' ? 'Baskerville' : 'serif',
      color: colors.text,
      marginBottom: 8,
    },
    dateSubtitle: {
      fontSize: 16,
      color: colors.textMuted,
      marginBottom: 24,
      fontWeight: '500',
    },
    bodyInput: {
      fontSize: 18,
      color: colors.text,
      flex: 1,
      textAlignVertical: 'top',
      lineHeight: 28,
      paddingBottom: 100, // space for toolbar
    },
    
    // Rich Toolbar
    toolbarWrapper: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      backgroundColor: '#1C1C1E', // Charcoal dark
      borderRadius: 24,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    toolbarHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 12,
    },
    toolbarDismiss: {
       padding: 4,
    },
    toolbarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    toolbarFontSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#2C2C2E',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      gap: 8,
    },
    toolbarFontText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    toolbarIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      gap: 12,
    },
    toolbarIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: '#2C2C2E',
      justifyContent: 'center',
      alignItems: 'center',
    },
    toolbarIconBtnActive: {
      backgroundColor: '#3A3A3C',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    
    // Reminder Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingTop: 24,
      paddingHorizontal: 24,
      paddingBottom: 40,
      height: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalCloseBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginRight: 40, // offset close btn
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
      marginTop: 20,
    },
    reminderTitleInput: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 16,
      color: colors.text,
    },
    calendarCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 16,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    calendarTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    weekDaysRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 12,
    },
    weekDayText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      width: 30,
      textAlign: 'center',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    dayCellActive: {
      backgroundColor: colors.warning,
      borderRadius: 20,
      width: 40,
    },
    dayText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    dayTextActive: {
      color: '#000000',
      fontWeight: '800',
    },
    timePresetsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    timePresetBtn: {
      flex: 1,
      height: 80,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timePresetMain: {
      fontSize: 20,
      fontWeight: '800',
    },
    timePresetMeridian: {
      fontSize: 12,
      fontWeight: '700',
      opacity: 0.6,
      marginTop: 4,
    },
    createReminderBtn: {
      backgroundColor: colors.primary, // or white based on theme
      borderRadius: 30,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: 30,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    createReminderText: {
      fontSize: 18,
      fontWeight: '800',
      color: '#000000', 
    },
    // Checklist Styles
    checklistContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 4,
      gap: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checklistText: {
      fontSize: 18,
      color: colors.text,
      flex: 1,
    },
    checklistTextDone: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 24,
      gap: 12,
    },
    gridCard: {
      width: gridCardWidth,
      height: 145,
      borderRadius: 32,
      padding: 16,
      justifyContent: 'space-between',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    horizontalGridContainer: {
      flexDirection: 'column',
      flexWrap: 'wrap',
      paddingHorizontal: 24,
      height: 310, // 145 * 2 + 20 gap
      gap: 12,
    },
    inlineReminderHeader: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inlineReminderTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    }
  });
};
