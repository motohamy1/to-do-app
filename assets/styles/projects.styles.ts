import { ColorScheme } from "@/hooks/useTheme";
import { StyleSheet, Dimensions, Platform } from "react-native";

const { width: windowWidth } = Dimensions.get("window");
const width = windowWidth || 375;

export const createProjectsStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    // ── Root ──────────────────────────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    safeArea: {
      flex: 1,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerLeft: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
      fontWeight: "500",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },

    // ── Back button ──────────────────────────────────────────────────────────
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      marginBottom: 8,
      gap: 6,
    },
    backText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.primary,
    },

    // ── Section label ────────────────────────────────────────────────────────
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      paddingHorizontal: 24,
      marginBottom: 14,
      marginTop: 4,
    },

    // ── Empty ─────────────────────────────────────────────────────────────────
    emptyContainer: {
      paddingVertical: 80,
      alignItems: "center",
      gap: 12,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
      fontWeight: "500",
    },
    emptySubText: {
      fontSize: 13,
      color: colors.textMuted,
      opacity: 0.7,
    },

    // ── LAYER 1: Category Cards (FULL WIDTH LIST) ────────────────────────────
    categoriesGrid: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      gap: 16,
    },
    categoryCard: {
      width: '100%',
      borderRadius: 20,
      padding: 20,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    categoryIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    categoryInfo: {
      flex: 1,
      alignItems: 'flex-start',
    },
    categoryCardName: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    categoryCardCount: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "500",
      marginTop: 2,
    },
    categoryDeleteBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.danger + '15',
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 12,
    },
    // ── LAYER 2: Sub-Category Cards (FULL WIDTH) ──────────────────────────────
    subCategoriesList: {
      paddingHorizontal: 20,
      paddingBottom: 24,
      gap: 12,
    },
    subCategoryCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    subCategoryIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    subCategoryName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },

    // ── LAYER 3: Project Cards (MODERN 3-COLUMN GRID) ───────────────────────
    projectsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 12,
    },
    projectGridCard: {
      width: (width - 40 - 24) / 3, // 3 columns minus gaps
      height: (width - 40 - 24) / 3 * 1.3,
      borderRadius: 20,
      padding: 10,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    projectGridIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    projectGridName: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    projectGridDesc: {
      display: 'none', // Hide description in 3-column card
    },
    projectGridFooter: {
      marginTop: 'auto',
    },
    gridProgressBarTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      overflow: "hidden",
      marginBottom: 6,
    },
    gridProgressBarFill: {
      height: 4,
      borderRadius: 2,
    },
    gridProgressText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
    },

    // ── LAYER 4: Project Detail ───────────────────────────────────────────────
    detailScroll: {
      paddingBottom: 100,
    },
    detailHero: {
      marginHorizontal: 20,
      marginTop: 4,
      marginBottom: 20,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailHeroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 16,
    },
    detailIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    detailHeroTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      flex: 1,
    },
    detailHeroStatus: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      alignSelf: "flex-start",
    },
    detailHeroStatusText: {
      fontSize: 12,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    detailProgressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      overflow: "hidden",
      marginTop: 8,
    },
    detailProgressFill: {
      height: 8,
      borderRadius: 4,
    },
    detailProgressRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
    },
    detailProgressLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    detailProgressPct: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
    },
    
    // Description, Tasks, Resources... (Existing detail styles below)
    detailSection: {
      marginHorizontal: 20,
      marginBottom: 20,
    },
    detailSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    detailSectionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: 16, // Increased spacing
    },
    detailSectionAction: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },
    detailSectionActionDanger: {
      color: colors.danger,
    },
    detailSectionActionSuccess: {
      color: colors.success,
    },
    descriptionBox: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 80,
    },
    descriptionText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    descriptionPlaceholder: {
      fontSize: 15,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    descriptionInput: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      minHeight: 80,
      textAlignVertical: "top",
    },
    tasksToggle: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface, // Restored to surface
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 2,
    },
    tasksToggleText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    tasksToggleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: colors.primary + "20",
      borderRadius: 8,
      marginRight: 8,
    },
    tasksToggleBadgeText: {
      fontSize: 12,
      fontWeight: "700",
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
    taskStatusIcon: {
      width: 20,
      height: 20,
    },
    taskItemStatus: {
      fontSize: 11,
      textTransform: "capitalize",
      color: colors.textMuted,
      fontWeight: "500",
    },
    taskLastItem: {
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
    resourceCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
    },
    resourceIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    resourceInfo: {
      flex: 1,
    },
    resourceTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    resourceUrl: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },

    // ── Modal Styles ──────────────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingHorizontal: 24,
      paddingBottom: 40,
      maxHeight: "90%",
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 20,
    },
    modalLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    modalInput: {
      backgroundColor: colors.bg,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    iconPicker: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    iconOption: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    iconOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "15",
    },
    colorPicker: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 24,
    },
    colorSwatch: {
      width: 36,
      height: 36,
      borderRadius: 10,
    },
    colorSwatchSelected: {
      borderWidth: 3,
      borderColor: colors.text,
    },
    modalPrimaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
    },
    modalPrimaryBtnText: {
      fontSize: 16,
      fontWeight: "800",
      color: "#FFF",
    },
    modalSecondaryBtn: {
      alignItems: "center",
      paddingVertical: 14,
    },
    modalSecondaryBtnText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textMuted,
    },
    addResourceTypeRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    resourceTypeBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
      gap: 4,
    },
    resourceTypeBtnSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "15",
    },
    resourceTypeBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
    },
    resourceTypeBtnTextSelected: {
      color: colors.primary,
    },
    // ── Checklists ──────────────────────────────────────────────────────────
    checklistContainer: {
      marginTop: 8,
      gap: 8,
    },
    checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.info + "0C", // Subtle info blue
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.info + "20",
      gap: 12,
      width: '92%',
      alignSelf: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    checklistText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    checklistAddButton: {
       flexDirection: 'row',
       alignItems: 'center',
       paddingVertical: 14,
       paddingHorizontal: 16,
       gap: 12,
       width: '92%',
       alignSelf: 'center',
    },
    checklistAddButtonText: {
       fontSize: 16,
       fontWeight: '500',
       color: colors.primary,
    },
    checklistAddRow: {
       flexDirection: 'row',
       alignItems: 'center',
       backgroundColor: colors.surface,
       borderRadius: 16,
       paddingHorizontal: 16,
       paddingVertical: 12, // Match Task input vertical padding
       borderWidth: 1,
       borderColor: colors.border,
       marginTop: 8,
       width: '92%',
       alignSelf: 'center',
       shadowColor: colors.primary,
       shadowOffset: { width: 0, height: 4 },
       shadowOpacity: 0.1, // Slightly stronger shadow to match
       shadowRadius: 10,
       elevation: 3,
    },
    checklistInput: {
       flex: 1,
       fontSize: 16, // Match TodoInput text size
       color: colors.text,
       marginLeft: 12, // Match TodoInput margin
       fontWeight: "500",
       padding: 0,
    },
  });
