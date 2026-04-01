import { ColorScheme } from "@/hooks/useTheme";
import { StyleSheet, Dimensions, Platform } from "react-native";

const { width } = Dimensions.get('window');

export const createSettingsStyles = (colors: ColorScheme, isArabic: boolean = false) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    safeArea: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 24,
    },
    headerTitle: {
      fontSize: isArabic ? 38 : 34,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -1,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: isArabic ? 15 : 13,
      fontWeight: '800',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 16,
      marginLeft: isArabic ? 0 : 4,
      marginRight: isArabic ? 4 : 0,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    profileHero: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
    },
    avatarContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    profileInfo: {
      marginLeft: 20,
      flex: 1,
    },
    profileName: {
      fontSize: isArabic ? 24 : 22,
      fontWeight: '800',
      color: colors.surfaceText,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '500',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 20,
    },
    iconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    settingLabel: {
      flex: 1,
      fontSize: isArabic ? 18 : 16,
      fontWeight: '700',
      color: colors.surfaceText,
    },
    settingValue: {
      fontSize: 14,
      color: colors.textMuted,
      marginRight: 8,
      fontWeight: '500',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 16,
      opacity: 0.5,
    },
    dbInfoCard: {
      padding: 20,
    },
    dbRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    dbLabel: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '600',
    },
    dbValue: {
      fontSize: 14,
      color: colors.surfaceText,
      fontWeight: '700',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.success + '15',
    },
    statusText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.success,
      textTransform: 'uppercase',
    },
    logoutButton: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backgroundColor: colors.danger + '10',
      borderRadius: 20,
      gap: 8,
    },
    logoutText: {
      color: colors.danger,
      fontSize: 16,
      fontWeight: '700',
    },
    versionText: {
      textAlign: 'center',
      marginTop: 32,
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      minHeight: 400,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    modalBody: {
      gap: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      color: colors.text,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    saveButtonText: {
      color: colors.bg === '#0F0F12' ? '#000000' : '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
  });
};