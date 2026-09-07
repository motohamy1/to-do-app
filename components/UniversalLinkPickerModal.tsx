import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import useTheme from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';

export interface UniversalLinkSelection {
  type: 'category' | 'subCategory' | 'project' | 'goal' | 'none';
  categoryId?: Id<'projectCategories'>;
  subCategoryId?: Id<'projectSubCategories'>;
  projectId?: string;
  goalId?: Id<'yearlyGoals'>;
  entityName?: string;
  color?: string;
}

interface UniversalLinkPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: UniversalLinkSelection) => void;
  currentCategoryId?: string;
  currentProjectId?: string;
  currentGoalId?: string;
  title?: string;
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const UniversalLinkPickerModal: React.FC<UniversalLinkPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  currentCategoryId,
  currentProjectId,
  currentGoalId,
  title,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { isArabic } = useTranslation(language);

  const [activeTab, setActiveTab] = useState<'spaces' | 'goals'>('spaces');
  const [searchQuery, setSearchQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState<'all' | 'yearly' | 'monthly' | 'daily'>('all');

  // Navigation inside spaces tab
  const [currentLevel, setCurrentLevel] = useState<'categories' | 'categoryDetail' | 'subCategoryProjects'>('categories');
  const [selectedCatId, setSelectedCatId] = useState<Id<'projectCategories'> | null>(null);
  const [selectedCatName, setSelectedCatName] = useState('');
  const [selectedSubId, setSelectedSubId] = useState<Id<'projectSubCategories'> | null>(null);

  // Queries
  const categories = useOfflineQuery<any[]>('projects.getCategories', api.projects.getCategories, userId ? { userId } : 'skip') || [];
  const subCategories = useOfflineQuery<any[]>('projects.getSubCategories', api.projects.getSubCategories, selectedCatId ? { categoryId: selectedCatId } : 'skip') || [];
  const directProjects = useOfflineQuery<any[]>('projects.getProjectsByCategory', api.projects.getProjectsByCategory, selectedCatId ? { categoryId: selectedCatId } : 'skip') || [];
  const subProjects = useOfflineQuery<any[]>('projects.getProjectsBySubCategory', api.projects.getProjectsBySubCategory, selectedSubId ? { subCategoryId: selectedSubId } : 'skip') || [];
  
  // All goals query
  const allGoals = useOfflineQuery<any[]>('yearlyGoals.getAllGoals', api.yearlyGoals.getAllGoals, userId ? { userId } : 'skip') || [];

  const handleClose = () => {
    setCurrentLevel('categories');
    setSelectedCatId(null);
    setSelectedSubId(null);
    setSearchQuery('');
    onClose();
  };

  const handleBack = () => {
    if (currentLevel === 'subCategoryProjects') {
      setCurrentLevel('categoryDetail');
      setSelectedSubId(null);
    } else if (currentLevel === 'categoryDetail') {
      setCurrentLevel('categories');
      setSelectedCatId(null);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter((c: any) =>
      c.name.toLowerCase().includes(q) || (c.tag && c.tag.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  const filteredGoals = useMemo(() => {
    let list = allGoals;
    if (goalFilter === 'yearly') {
      list = list.filter((g: any) => g.month === undefined && g.day === undefined);
    } else if (goalFilter === 'monthly') {
      list = list.filter((g: any) => g.month !== undefined && g.day === undefined);
    } else if (goalFilter === 'daily') {
      list = list.filter((g: any) => g.day !== undefined);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((g: any) =>
        g.text.toLowerCase().includes(q) || (g.category && g.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allGoals, goalFilter, searchQuery]);

  const getGoalSubtitle = (goal: any) => {
    const months = isArabic ? MONTH_NAMES_AR : MONTH_NAMES_EN;
    if (goal.day !== undefined && goal.month !== undefined) {
      return `${goal.year} • ${months[goal.month]} ${goal.day} (${isArabic ? 'هدف يومي' : 'Daily Goal'})`;
    }
    if (goal.month !== undefined) {
      return `${goal.year} • ${months[goal.month]} (${isArabic ? 'هدف شهري' : 'Monthly Goal'})`;
    }
    return `${goal.year} (${isArabic ? 'هدف سنوي' : 'Yearly Goal'})`;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} statusBarTranslucent={true}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border + '30' }]}>
            {currentLevel !== 'categories' && activeTab === 'spaces' ? (
              <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
                <Ionicons name={isArabic ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}

            <Text style={[styles.title, { color: colors.text }]}>
              {title || (isArabic ? 'ربط عنصر' : 'Cross-Link Item')}
            </Text>

            <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Unlink Button if something is already linked */}
          {(currentCategoryId || currentProjectId || currentGoalId) && (
            <TouchableOpacity
              style={[styles.unlinkBanner, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '30' }]}
              onPress={() => {
                onSelect({ type: 'none' });
                handleClose();
              }}
            >
              <Ionicons name="link-outline" size={16} color={colors.danger} />
              <Text style={[styles.unlinkText, { color: colors.danger }]}>
                {isArabic ? 'إزالة الارتباط الحالي' : 'Unlink Current Item'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Main Segment Tabs */}
          <View style={[styles.tabBar, { backgroundColor: isDarkMode ? '#1E1E28' : '#F1F5F9' }]}>
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'spaces' && [styles.tabItemActive, { backgroundColor: colors.surface }]
              ]}
              onPress={() => {
                setActiveTab('spaces');
                setCurrentLevel('categories');
              }}
            >
              <Ionicons
                name="albums-outline"
                size={16}
                color={activeTab === 'spaces' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'spaces' ? colors.text : colors.textMuted }
                ]}
              >
                {isArabic ? 'المساحات والمشاريع' : 'Spaces & Projects'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === 'goals' && [styles.tabItemActive, { backgroundColor: colors.surface }]
              ]}
              onPress={() => setActiveTab('goals')}
            >
              <Ionicons
                name="flag-outline"
                size={16}
                color={activeTab === 'goals' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'goals' ? colors.text : colors.textMuted }
                ]}
              >
                {isArabic ? 'الأهداف' : 'Goals'} ({allGoals.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: isDarkMode ? '#232332' : '#F8FAFC', borderColor: colors.border + '50' }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
              placeholder={
                activeTab === 'spaces'
                  ? (isArabic ? 'ابحث في المساحات والمشاريع...' : 'Search spaces & projects...')
                  : (isArabic ? 'ابحث في الأهداف...' : 'Search goals...')
              }
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Goals Sub-Filter Chips */}
          {activeTab === 'goals' && (
            <View style={styles.filterChipsRow}>
              {(['all', 'yearly', 'monthly', 'daily'] as const).map((filter) => {
                const isSelected = goalFilter === filter;
                const label =
                  filter === 'all'
                    ? (isArabic ? 'الكل' : 'All')
                    : filter === 'yearly'
                    ? (isArabic ? 'سنوي' : 'Yearly')
                    : filter === 'monthly'
                    ? (isArabic ? 'شهري' : 'Monthly')
                    : (isArabic ? 'يومي' : 'Daily');
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? colors.primary + '20' : isDarkMode ? '#232332' : '#F1F5F9',
                        borderColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => setGoalFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isSelected ? colors.primary : colors.textMuted },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Content Body */}
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            {activeTab === 'spaces' ? (
              // ─── Spaces & Projects Content ───
              currentLevel === 'categories' ? (
                <FlatList
                  data={filteredCategories}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = currentCategoryId === item._id;
                    return (
                      <View
                        style={[
                          styles.listItem,
                          {
                            borderBottomColor: colors.border + '20',
                            backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                          onPress={() => {
                            setSelectedCatId(item._id);
                            setSelectedCatName(item.name);
                            setCurrentLevel('categoryDetail');
                          }}
                        >
                          <View style={[styles.itemIcon, { backgroundColor: item.color + '20' }]}>
                            <Ionicons name={(item.icon || 'folder-outline') as any} size={20} color={item.color} />
                          </View>
                          <View style={{ flex: 1, marginHorizontal: 12 }}>
                            <Text style={[styles.itemTitle, { color: colors.text }]}>{item.name}</Text>
                            {item.tag ? (
                              <Text style={[styles.itemSub, { color: colors.primary }]}>{item.tag}</Text>
                            ) : null}
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        {/* Quick Link Button to link directly to this space */}
                        <TouchableOpacity
                          style={[styles.quickLinkBtn, { backgroundColor: item.color + '20' }]}
                          onPress={() => {
                            onSelect({
                              type: 'category',
                              categoryId: item._id,
                              entityName: item.name,
                              color: item.color,
                            });
                            handleClose();
                          }}
                        >
                          <Ionicons name="link" size={16} color={item.color} />
                          <Text style={[styles.quickLinkText, { color: item.color }]}>
                            {isArabic ? 'ربط' : 'Link'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Ionicons name="albums-outline" size={36} color={colors.textMuted} />
                      <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                        {isArabic ? 'لا توجد مساحات مطابقة' : 'No spaces found'}
                      </Text>
                    </View>
                  }
                />
              ) : (
                // Category Detail (Subcategories & Direct Projects)
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Category Link Row */}
                  <TouchableOpacity
                    style={[styles.selectedHeaderRow, { backgroundColor: colors.primary + '15' }]}
                    onPress={() => {
                      onSelect({
                        type: 'category',
                        categoryId: selectedCatId!,
                        entityName: selectedCatName,
                      });
                      handleClose();
                    }}
                  >
                    <Ionicons name="link" size={18} color={colors.primary} />
                    <Text style={[styles.selectedHeaderText, { color: colors.primary }]}>
                      {isArabic ? `ربط بمساحة كاملة: ${selectedCatName}` : `Link entire Space: ${selectedCatName}`}
                    </Text>
                  </TouchableOpacity>

                  {/* Subcategories */}
                  {subCategories.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                        {isArabic ? 'الأقسام الفرعية' : 'Sub-Categories'}
                      </Text>
                      {subCategories.map((sub: any) => (
                        <View
                          key={sub._id}
                          style={[styles.listItem, { borderBottomColor: colors.border + '20' }]}
                        >
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => {
                              setSelectedSubId(sub._id);
                              setCurrentLevel('subCategoryProjects');
                            }}
                          >
                            <View style={[styles.itemIcon, { backgroundColor: sub.color + '20' }]}>
                              <Ionicons name={(sub.icon || 'layers-outline') as any} size={18} color={sub.color} />
                            </View>
                            <Text style={[styles.itemTitle, { color: colors.text, marginHorizontal: 12, flex: 1 }]}>
                              {sub.name}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.quickLinkBtn, { backgroundColor: sub.color + '20' }]}
                            onPress={() => {
                              onSelect({
                                type: 'subCategory',
                                categoryId: selectedCatId!,
                                subCategoryId: sub._id,
                                entityName: sub.name,
                                color: sub.color,
                              });
                              handleClose();
                            }}
                          >
                            <Ionicons name="link" size={14} color={sub.color} />
                            <Text style={[styles.quickLinkText, { color: sub.color }]}>
                              {isArabic ? 'ربط' : 'Link'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Direct Projects */}
                  {directProjects.length > 0 && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                        {isArabic ? 'المشاريع' : 'Projects'}
                      </Text>
                      {directProjects.map((proj: any) => (
                        <TouchableOpacity
                          key={proj._id}
                          style={[styles.listItem, { borderBottomColor: colors.border + '20' }]}
                          onPress={() => {
                            onSelect({
                              type: 'project',
                              categoryId: selectedCatId!,
                              projectId: proj._id,
                              entityName: proj.name,
                              color: proj.color,
                            });
                            handleClose();
                          }}
                        >
                          <View style={[styles.itemIcon, { backgroundColor: proj.color + '20' }]}>
                            <Ionicons name={(proj.icon || 'rocket-outline') as any} size={18} color={proj.color} />
                          </View>
                          <Text style={[styles.itemTitle, { color: colors.text, marginHorizontal: 12, flex: 1 }]}>
                            {proj.name}
                          </Text>
                          <Ionicons name="link-outline" size={20} color={proj.color} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>
              )
            ) : (
              // ─── Goals Content ───
              <FlatList
                data={filteredGoals}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = currentGoalId === item._id;
                  const itemColor = item.color || colors.primary;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.goalCard,
                        {
                          backgroundColor: isDarkMode ? '#1E1E28' : '#F9FAFB',
                          borderColor: isSelected ? itemColor : colors.border + '30',
                          borderWidth: isSelected ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => {
                        onSelect({
                          type: 'goal',
                          goalId: item._id,
                          entityName: item.text,
                          color: itemColor,
                        });
                        handleClose();
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={[styles.goalIconCircle, { backgroundColor: itemColor + '20' }]}>
                          <Ionicons name={(item.icon || 'flag-outline') as any} size={20} color={itemColor} />
                        </View>
                        <View style={{ flex: 1, marginHorizontal: 12 }}>
                          <Text
                            style={[
                              styles.goalTitle,
                              {
                                color: colors.text,
                                textDecorationLine: item.isCompleted ? 'line-through' : 'none',
                                opacity: item.isCompleted ? 0.6 : 1,
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {item.text}
                          </Text>
                          <Text style={[styles.goalSubtitle, { color: colors.textMuted }]}>
                            {getGoalSubtitle(item)}
                          </Text>
                          {item.category && (
                            <View style={[styles.goalCategoryBadge, { backgroundColor: itemColor + '15' }]}>
                              <Text style={[styles.goalCategoryText, { color: itemColor }]}>
                                {item.category}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'link-outline'}
                          size={22}
                          color={isSelected ? colors.success : itemColor}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="flag-outline" size={36} color={colors.textMuted} />
                    <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                      {isArabic ? 'لا توجد أهداف مطابقة' : 'No goals found'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlinkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  unlinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabItemActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  quickLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  selectedHeaderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  goalCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  goalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  goalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  goalCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  goalCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UniversalLinkPickerModal;
