import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import useTheme from '@/hooks/useTheme';
import { useTranslation } from '@/utils/i18n';
import AnimatedWavyHeader from '@/components/AnimatedWavyHeader';
import LivePress from '@/components/LivePress';
import { AIGoalGeneratorModal } from '@/components/AIGoalGeneratorModal';
import { GoalFormModal, GoalFormData } from '@/components/GoalFormModal';
import { GoalLinkedTasks } from '@/components/GoalLinkedTasks';
import TaskDetailModal from '@/components/TaskDetailModal';
import { SEED_TEMPLATES } from '@/convex/aiGoals';

const months_en = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const months_ar = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

interface SectionGroup {
  category: string;
  color?: string;
  icon?: string;
  goals: any[];
  achievements: any[];
}

export default function GoalsDetailScreen() {
  const { year: y, month: m, day: d, title: tParam } = useLocalSearchParams<{
    year: string;
    month?: string;
    day?: string;
    title?: string;
  }>();

  const year = parseInt(y || new Date().getFullYear().toString());
  const month = m !== undefined ? parseInt(m) : undefined;
  const day = d !== undefined ? parseInt(d) : undefined;

  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const router = useRouter();

  const isMonth = month !== undefined;
  const isDay = day !== undefined;
  const months = isArabic ? months_ar : months_en;

  const defaultTitle = isMonth
    ? isArabic
      ? `أهداف ${months[month]} ${year}`
      : `${months[month]} ${year} Goals`
    : isDay
    ? isArabic
      ? `أهداف يوم ${day}`
      : `Day ${day} Goals`
    : isArabic
    ? `أهداف عام ${year}`
    : `${year} Goals`;

  const pageTitle = tParam || defaultTitle;

  // ─── Convex Queries ──────────────────────────────────────────────────────────
  const yearGoals =
    useOfflineQuery<any[]>('yearlyGoals_detail', api.yearlyGoals.getGoals,
      userId && !isMonth ? { userId, year } : 'skip') || [];
  const monthGoals =
    useOfflineQuery<any[]>('monthlyGoals_detail', api.yearlyGoals.getMonthGoals,
      userId && isMonth && !isDay ? { userId, year, month: month! } : 'skip') || [];
  const dayGoals =
    useOfflineQuery<any[]>('dailyGoals_detail', api.yearlyGoals.getDayGoals,
      userId && isDay ? { userId, year, month: month!, day: day! } : 'skip') || [];

  const goals = isDay ? dayGoals : isMonth ? monthGoals : yearGoals;

  const yearAchievements =
    useOfflineQuery<any[]>('yearlyAchievements_detail', api.yearlyGoals.getAchievements,
      userId && !isMonth ? { userId, year } : 'skip') || [];
  const monthAchievements =
    useOfflineQuery<any[]>('monthlyAchievements_detail', api.yearlyGoals.getMonthAchievements,
      userId && isMonth && !isDay ? { userId, year, month: month! } : 'skip') || [];
  const dayAchievements =
    useOfflineQuery<any[]>('dailyAchievements_detail', api.yearlyGoals.getDayAchievements,
      userId && isDay ? { userId, year, month: month!, day: day! } : 'skip') || [];

  const achievements = isDay ? dayAchievements : isMonth ? monthAchievements : yearAchievements;

  // Blueprint query (Monthly or Yearly)
  const currentBlueprint = useQuery(
    api.aiGoals.getMonthlyBlueprint,
    userId ? (isMonth ? { userId, year, month: month! } : { userId, year }) : 'skip'
  );

  // ─── Mutations ───────────────────────────────────────────────────────────────
  // IMPORTANT: the mutationPath must match the exact function chosen, or the
  // offline queue replay and optimistic cache both hit the wrong Convex fn.
  const addGoalMut = useOfflineMutation(
    isDay ? api.yearlyGoals.addDayGoal : isMonth ? api.yearlyGoals.addMonthGoal : api.yearlyGoals.addGoal,
    isDay ? 'yearlyGoals:addDayGoal' : isMonth ? 'yearlyGoals:addMonthGoal' : 'yearlyGoals:addGoal'
  );
  const addAchievementMut = useOfflineMutation(
    isDay ? api.yearlyGoals.addDayAchievement : isMonth ? api.yearlyGoals.addMonthAchievement : api.yearlyGoals.addAchievement,
    isDay ? 'yearlyGoals:addDayAchievement' : isMonth ? 'yearlyGoals:addMonthAchievement' : 'yearlyGoals:addAchievement'
  );
  const updateGoal = useOfflineMutation(api.yearlyGoals.updateGoal, 'yearlyGoals:updateGoal');
  const deleteGoal = useOfflineMutation(api.yearlyGoals.deleteGoal, 'yearlyGoals:deleteGoal');
  const updateAchievementMut = useOfflineMutation(api.yearlyGoals.updateAchievement, 'yearlyGoals:updateAchievement');
  const deleteAchievementMut = useOfflineMutation(api.yearlyGoals.deleteAchievement, 'yearlyGoals:deleteAchievement');

  // ─── Local State ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'all' | 'goals' | 'achievements'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit'>('create');
  const [formInitialCategory, setFormInitialCategory] = useState('');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [selectedTaskDetailId, setSelectedTaskDetailId] = useState<any | null>(null);

  // Handle hardware back press on Android to dismiss open modals first
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (formModalVisible) {
          setFormModalVisible(false);
          setEditingItem(null);
          return true;
        }
        if (aiModalVisible) {
          setAiModalVisible(false);
          return true;
        }
        return false; // Allow stack navigator to pop the screen immediately
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [formModalVisible, aiModalVisible])
  );

  // Toggle expansion states
  const [expandedSectionIds, setExpandedSectionIds] = useState<Record<string, boolean>>({});
  const [expandedGoalIds, setExpandedGoalIds] = useState<Record<string, boolean>>({});
  const [newMilestoneText, setNewMilestoneText] = useState<Record<string, string>>({});

  // ─── Data Grouping & Derivations ─────────────────────────────────────────────
  const allItems = useMemo(() => {
    return [
      ...goals.map((g: any) => ({ ...g, _type: 'goal' as const })),
      ...achievements.map((a: any) => ({ ...a, _type: 'achievement' as const })),
    ].sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [goals, achievements]);

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((i: any) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [allItems]);

  // Group items hierarchically by Section / Category
  const groupedSections = useMemo((): SectionGroup[] => {
    const groups: Record<string, SectionGroup> = {};

    allItems.forEach((item: any) => {
      const catKey = item.category || (isArabic ? 'أهداف عامة' : 'General Goals');
      if (!groups[catKey]) {
        groups[catKey] = {
          category: catKey,
          color: item.color || '#EA580C',
          icon: item.icon || 'layers-outline',
          goals: [],
          achievements: [],
        };
      }
      if (item._type === 'goal') {
        groups[catKey].goals.push(item);
      } else {
        groups[catKey].achievements.push(item);
      }
    });

    return Object.values(groups);
  }, [allItems, isArabic]);

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g: any) => g.isCompleted).length;
  const totalAchievements = achievements.length;
  const totalWinsCount = totalAchievements + completedGoals;
  const totalCount = allItems.length;
  const overallProgress = totalGoals > 0 ? completedGoals / totalGoals : 0;

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleToggleGoal = (item: any) => {
    updateGoal({ id: item._id, isCompleted: !item.isCompleted });
  };

  const handleToggleAchievement = (item: any) => {
    updateAchievementMut({ id: item._id, isCompleted: !item.isCompleted });
  };

  const handleDeleteItem = async (id: any, type: 'goal' | 'achievement') => {
    if (type === 'goal') {
      await deleteGoal({ id });
    } else {
      await deleteAchievementMut({ id });
    }
  };

  const handleOpenCreate = (targetCategory?: string) => {
    setFormModalMode('create');
    setEditingItem(null);
    setFormInitialCategory(targetCategory || selectedCategoryFilter || '');
    setFormModalVisible(true);
  };

  const handleOpenEdit = (item: any) => {
    setFormModalMode('edit');
    setEditingItem(item);
    setFormModalVisible(true);
  };

  const handleSaveGoalForm = async (formData: GoalFormData) => {
    if (formData.id) {
      // Edit existing
      if (formData._type === 'goal') {
        await updateGoal({
          id: formData.id as any,
          text: formData.text,
          description: formData.description,
          category: formData.category,
          color: formData.color,
          icon: formData.icon,
          milestones: formData.milestones,
          categoryId: formData.categoryId,
          subCategoryId: formData.subCategoryId,
          projectId: formData.projectId,
        });
      } else {
        await updateAchievementMut({
          id: formData.id as any,
          text: formData.text,
          description: formData.description,
          category: formData.category,
          color: formData.color,
          icon: formData.icon,
        });
      }
    } else {
      // Create new
      const args: any = {
        userId,
        year,
        text: formData.text,
        description: formData.description,
        category: formData.category,
        color: formData.color,
        icon: formData.icon,
        milestones: formData.milestones,
        categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId,
        projectId: formData.projectId,
      };
      if (isMonth) args.month = month;
      if (isDay) {
        args.month = month;
        args.day = day;
      }

      if (formData._type === 'goal') {
        await addGoalMut(args);
      } else {
        await addAchievementMut(args);
      }
    }
  };

  const handleToggleMilestone = (goalItem: any, milestoneId: string) => {
    const currentMilestones = goalItem.milestones || [];
    const updated = currentMilestones.map((ms: any) =>
      ms.id === milestoneId ? { ...ms, isCompleted: !ms.isCompleted } : ms
    );
    updateGoal({ id: goalItem._id, milestones: updated });
  };

  const handleAddSubMilestone = (goalItem: any) => {
    const text = (newMilestoneText[goalItem._id] || '').trim();
    if (!text) return;

    const currentMilestones = goalItem.milestones || [];
    const updated = [
      ...currentMilestones,
      { id: `ms_${Date.now()}`, text, isCompleted: false },
    ];

    updateGoal({ id: goalItem._id, milestones: updated });
    setNewMilestoneText((prev) => ({ ...prev, [goalItem._id]: '' }));
    setExpandedGoalIds((prev) => ({ ...prev, [goalItem._id]: true }));
  };

  const toggleSectionExpansion = (catName: string) => {
    setExpandedSectionIds((prev) => ({
      ...prev,
      [catName]: prev[catName] === undefined ? false : !prev[catName],
    }));
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoalIds((prev) => ({
      ...prev,
      [goalId]: prev[goalId] === undefined ? true : !prev[goalId],
    }));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* ─── Animated Header ────────────────────────────────────────────── */}
        <AnimatedWavyHeader
          backgroundColor={colors.bg}
          waveHeight={10}
          contentStyle={{ paddingBottom: 2 }}
        >
          <View style={[styles.headerRow, isArabic && styles.rowReverse]}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.headerIconBtn}
            >
              <Ionicons
                name={isArabic ? 'arrow-forward' : 'arrow-back'}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.headerTitleText, { color: colors.text }]}>{pageTitle}</Text>
              {isMonth && (
                <Text style={[styles.headerSubtitleText, { color: colors.textMuted }]}>
                  {year}
                </Text>
              )}
            </View>

            {/* Top Right Action Buttons: AI Sparkle + New Manual Goal */}
            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <LivePress
                style={[styles.aiSparkleBtn, { backgroundColor: '#EA580C16', borderColor: '#EA580C30' }]}
                onPress={() => setAiModalVisible(true)}
                pressScale={0.94}
              >
                <Ionicons name="sparkles" size={16} color="#EA580C" />
                <Text style={[styles.aiSparkleBtnText, { color: '#EA580C' }]}>AI</Text>
              </LivePress>

              <TouchableOpacity
                style={[styles.topAddBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleOpenCreate()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={20} color={colors.primaryText} />
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedWavyHeader>

        {/* ─── Main Scrollable Content ────────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Blueprint Hero Card (Yearly or Monthly) ──────────────────── */}
          {!isDay && (
            <View style={{ marginBottom: 16 }}>
              {currentBlueprint ? (
                (() => {
                  const tpl =
                    SEED_TEMPLATES.find((t) => t.templateId === currentBlueprint.templateId) ||
                    SEED_TEMPLATES[0];
                  const cardBg = isDarkMode ? '#1E1E28' : tpl.bg || '#FFF7ED';
                  const cardInk = isDarkMode ? '#F3F4F6' : tpl.ink || '#1E1B18';
                  const cardAccent = tpl.accent || '#EA580C';

                  return (
                    <View
                      style={[
                        styles.blueprintHeroCard,
                        {
                          backgroundColor: cardBg,
                          borderColor: isDarkMode ? cardAccent + '40' : cardInk + '15',
                        },
                      ]}
                    >
                      <View style={[styles.blueprintHeroTop, isArabic && styles.rowReverse]}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Ionicons name="sparkles" size={14} color={cardAccent} />
                            <Text style={[styles.blueprintHeroTag, { color: cardAccent }]}>
                              {isArabic ? tpl.nameAr || tpl.name : tpl.name}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.blueprintThemeTitle,
                              { color: cardInk, textAlign: isArabic ? 'right' : 'left' },
                            ]}
                          >
                            {currentBlueprint.themeTitle}
                          </Text>
                          {currentBlueprint.motivationalQuote ? (
                            <Text
                              style={[
                                styles.blueprintQuoteText,
                                { color: cardInk, opacity: 0.8, textAlign: isArabic ? 'right' : 'left' },
                              ]}
                            >
                              "{currentBlueprint.motivationalQuote}"
                            </Text>
                          ) : null}
                        </View>

                        <TouchableOpacity
                          style={[styles.editBlueprintBtn, { backgroundColor: cardInk + '15' }]}
                          onPress={() => setAiModalVisible(true)}
                        >
                          <Ionicons name="create-outline" size={18} color={cardInk} />
                        </TouchableOpacity>
                      </View>

                      {/* Progress Meter Bar */}
                      <View style={{ marginTop: 12 }}>
                        <View style={[styles.progressLabelsRow, isArabic && styles.rowReverse]}>
                          <Text style={[styles.progressStatusText, { color: cardInk, opacity: 0.75 }]}>
                            {isArabic ? 'نسبة الإنجاز' : 'Completion Rate'}
                          </Text>
                          <Text style={[styles.progressPercentText, { color: cardAccent }]}>
                            {completedGoals}/{totalGoals} ({Math.round(overallProgress * 100)}%)
                          </Text>
                        </View>
                        <View style={[styles.progressBarTrack, { backgroundColor: cardInk + '18' }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.max(overallProgress * 100, 4)}%`,
                                backgroundColor: cardAccent,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })()
              ) : (
                /* Empty state AI Prompt Invitation Banner */
                <LivePress
                  style={[
                    styles.aiInviteCard,
                    {
                      backgroundColor: isDarkMode ? '#1E1E28' : '#FFF7ED',
                      borderColor: '#EA580C35',
                    },
                  ]}
                  onPress={() => setAiModalVisible(true)}
                  pressScale={0.98}
                >
                  <View style={[styles.aiInviteRow, isArabic && styles.rowReverse]}>
                    <View style={styles.aiInviteIconCircle}>
                      <Ionicons name="sparkles" size={22} color="#EA580C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.aiInviteTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                        {isArabic
                          ? isMonth
                            ? 'ابنِ خطة الشهر بالذكاء الاصطناعي'
                            : `ابنِ خطة عام ${year} بالذكاء الاصطناعي`
                          : isMonth
                          ? 'Build Monthly Blueprint with AI'
                          : `Build ${year} Annual Blueprint with AI`}
                      </Text>
                      <Text style={[styles.aiInviteDesc, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                        {isArabic
                          ? isMonth
                            ? 'تحدث أو اكتب أهدافك وسيقوم الذكاء الاصطناعي بتنظيمها في قوالب هندسية راقية.'
                            : 'تحدث أو اكتب رؤيتك وأهدافك الكبرى وسيقوم الذكاء الاصطناعي بتنظيمها في إطار استراتيجي راقٍ.'
                          : isMonth
                          ? 'Speak or type your goals. AI crafts custom milestones & categories.'
                          : 'Speak or type your annual vision. AI crafts strategic milestones & categories.'}
                      </Text>
                    </View>
                    <Ionicons
                      name={isArabic ? 'chevron-back' : 'chevron-forward'}
                      size={20}
                      color="#EA580C"
                    />
                  </View>
                </LivePress>
              )}
            </View>
          )}

          {/* ─── Filter Tabs & Category Pills ──────────────────────────────── */}
          <View style={styles.filterSection}>
            {/* Primary Type Tabs */}
            <View
              style={[
                styles.tabsContainer,
                { backgroundColor: isDarkMode ? '#20202C' : '#F3F4F6' },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'all' && [styles.activeTabBtn, { backgroundColor: colors.surface }],
                ]}
                onPress={() => setActiveTab('all')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: activeTab === 'all' ? colors.text : colors.textMuted },
                  ]}
                >
                  {isArabic ? 'الكل' : 'All'} ({totalCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'goals' && [styles.activeTabBtn, { backgroundColor: colors.surface }],
                ]}
                onPress={() => setActiveTab('goals')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons
                    name="flag"
                    size={14}
                    color={activeTab === 'goals' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: activeTab === 'goals' ? colors.text : colors.textMuted },
                    ]}
                  >
                    {isArabic ? 'الأهداف' : 'Goals'} ({totalGoals})
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'achievements' && [styles.activeTabBtn, { backgroundColor: colors.surface }],
                ]}
                onPress={() => setActiveTab('achievements')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons
                    name="trophy"
                    size={14}
                    color={activeTab === 'achievements' ? colors.success : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: activeTab === 'achievements' ? colors.text : colors.textMuted },
                    ]}
                  >
                    {isArabic ? 'الإنجازات' : 'Wins'} ({totalWinsCount})
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Category Filter Chips */}
            {categoriesList.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.categoriesRow, isArabic && styles.rowReverse]}
              >
                <TouchableOpacity
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: selectedCategoryFilter === null ? '#EA580C18' : isDarkMode ? '#20202C' : '#F3F4F6',
                      borderColor: selectedCategoryFilter === null ? '#EA580C50' : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedCategoryFilter(null)}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      { color: selectedCategoryFilter === null ? '#EA580C' : colors.textMuted },
                    ]}
                  >
                    {isArabic ? 'جميع الأقسام' : 'All Categories'}
                  </Text>
                </TouchableOpacity>

                {categoriesList.map((cat) => {
                  const isSelected = selectedCategoryFilter === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: isSelected ? '#EA580C18' : isDarkMode ? '#20202C' : '#F3F4F6',
                          borderColor: isSelected ? '#EA580C50' : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedCategoryFilter(isSelected ? null : cat)}
                    >
                      <Text
                        style={[
                          styles.catPillText,
                          { color: isSelected ? '#EA580C' : colors.text },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* ─── Hierarchical Nested Sections & Goals List ─────────────────── */}
          {(() => {
            if (groupedSections.length === 0) {
              return (
                <View style={styles.emptyContainer}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: isDarkMode ? '#1E1E28' : '#F3F4F6' }]}>
                    <Ionicons name="flag-outline" size={32} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {isArabic ? 'لا توجد أهداف أو إنجازات بعد' : 'No goals yet'}
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                    {isArabic
                      ? 'اضغط على زر (+) لإضافة هدف مع خيارات كاملة، أو استخدم الذكاء الاصطناعي لتوليد خطة متكاملة.'
                      : 'Tap (+) to add a detailed goal with checklists, or use AI to craft a monthly plan.'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenCreate()}
                  >
                    <Ionicons name="add" size={18} color={colors.primaryText} />
                    <Text style={[styles.emptyAddBtnText, { color: colors.primaryText }]}>
                      {isArabic ? 'إضافة هدف جديد' : 'Add New Goal'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }

            const filteredSections = groupedSections.filter((group) => {
              if (selectedCategoryFilter && group.category !== selectedCategoryFilter) return false;
              if (activeTab === 'goals' && group.goals.length === 0) return false;
              if (
                activeTab === 'achievements' &&
                group.achievements.length === 0 &&
                !group.goals.some((g) => g.isCompleted)
              ) {
                return false;
              }
              return true;
            });

            if (filteredSections.length === 0) {
              if (activeTab === 'achievements') {
                return (
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: isDarkMode ? '#1E1E28' : '#F0FDF4' }]}>
                      <Ionicons name="trophy-outline" size={32} color={colors.success} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {isArabic ? 'لا توجد إنجازات محققة بعد' : 'No Completed Wins Yet'}
                    </Text>
                    <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                      {isArabic
                        ? 'عند إتمام أهدافك وتحديدها كمكتملة بالضغط على علامة الصح، ستظهر هنا في قائمة الإنجازات المحققة للاحتفاء بها!'
                        : 'When you complete goals by checking them off, they will appear here as your achieved wins!'}
                    </Text>
                  </View>
                );
              }

              return (
                <View style={styles.emptyContainer}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: isDarkMode ? '#1E1E28' : '#F3F4F6' }]}>
                    <Ionicons name="filter-outline" size={32} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {isArabic ? 'لا توجد عناصر مطابقة' : 'No matching items'}
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                    {isArabic ? 'جرب تغيير التصفية أو القسم المختار.' : 'Try changing your category filter.'}
                  </Text>
                </View>
              );
            }

            return filteredSections.map((group) => {
              const isSectionExpanded = expandedSectionIds[group.category] ?? true;
              const visibleGoals =
                activeTab === 'achievements'
                  ? group.goals.filter((g) => g.isCompleted)
                  : group.goals;
              const visibleAchievements = activeTab === 'goals' ? [] : group.achievements;
              const secCompletedGoals = group.goals.filter((g) => g.isCompleted).length;
              const secTotalGoals = group.goals.length;

                return (
                  <View
                    key={group.category}
                    style={[
                      styles.sectionContainerCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isDarkMode ? '#282836' : '#E5E7EB',
                      },
                    ]}
                  >
                    {/* ─── Level 1: Parent Section Header (Collapsible & Has Add Goal) ─── */}
                    <View style={[styles.sectionHeaderBar, isArabic && styles.rowReverse]}>
                      {/* Left: Category Icon & Title */}
                      <TouchableOpacity
                        style={[styles.sectionHeaderLeft, isArabic && styles.rowReverse]}
                        onPress={() => toggleSectionExpansion(group.category)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.secDot, { backgroundColor: group.color || '#EA580C' }]} />
                        <Text
                          style={[
                            styles.sectionHeadingText,
                            { color: colors.text, textAlign: isArabic ? 'right' : 'left' },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {group.category}
                        </Text>
                      </TouchableOpacity>

                      {/* Right: Counter Badge + Inline Add + Toggle Arrow */}
                      <View style={[styles.sectionHeaderRight, isArabic && styles.rowReverse]}>
                        {secTotalGoals > 0 && (
                          <View style={[styles.secCounterPill, { backgroundColor: (group.color || '#EA580C') + '18' }]}>
                            <Text style={[styles.secCounterText, { color: group.color || '#EA580C' }]}>
                              {secCompletedGoals}/{secTotalGoals}
                            </Text>
                          </View>
                        )}

                        {/* Inline + Add Goal to this Category Button */}
                        <TouchableOpacity
                          style={[styles.sectionAddBtn, { backgroundColor: (group.color || colors.primary) + '18' }]}
                          onPress={() => handleOpenCreate(group.category)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="add" size={16} color={group.color || colors.primary} />
                        </TouchableOpacity>

                        {/* Chevron Collapse Toggle */}
                        <TouchableOpacity
                          onPress={() => toggleSectionExpansion(group.category)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={isSectionExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* ─── Section Goals & Achievements (Nested Items) ─── */}
                    {isSectionExpanded && (
                      <View style={styles.sectionBody}>
                        {/* Render Section Goals */}
                        {visibleGoals.map((goal) => {
                          const milestones: any[] = goal.milestones || [];
                          const completedMilestones = milestones.filter((m) => m.isCompleted).length;
                          const isGoalExpanded = expandedGoalIds[goal._id] ?? (milestones.length > 0);

                          return (
                            <View
                              key={goal._id}
                              style={[
                                styles.nestedGoalCard,
                                {
                                  backgroundColor: isDarkMode ? '#1E1E28' : '#F9FAFB',
                                  borderColor: goal.isCompleted
                                    ? colors.success + '40'
                                    : isDarkMode ? '#2D2D3E' : '#EEF2F6',
                                },
                              ]}
                            >
                              {/* Main Goal Row */}
                              <View style={[styles.goalMainRow, isArabic && styles.rowReverse]}>
                                <TouchableOpacity
                                  onPress={() => handleToggleGoal(goal)}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                  style={styles.goalCheckboxTouch}
                                >
                                  <Ionicons
                                    name={goal.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={22}
                                    color={goal.isCompleted ? colors.success : colors.border}
                                  />
                                </TouchableOpacity>

                                {/* Center: Goal Title, Description, & Sub-Milestones Toggle Pill */}
                                <View style={styles.goalContentCol}>
                                  <Text
                                    style={[
                                      styles.goalTitleText,
                                      {
                                        color: goal.isCompleted ? colors.textMuted : colors.text,
                                        textDecorationLine: goal.isCompleted ? 'line-through' : 'none',
                                        opacity: goal.isCompleted ? 0.6 : 1,
                                        textAlign: isArabic ? 'right' : 'left',
                                      },
                                    ]}
                                  >
                                    {goal.text}
                                  </Text>

                                  {goal.description ? (
                                    <Text
                                      style={[
                                        styles.goalDescText,
                                        {
                                          color: colors.textMuted,
                                          textAlign: isArabic ? 'right' : 'left',
                                        },
                                      ]}
                                      numberOfLines={2}
                                    >
                                      {goal.description}
                                    </Text>
                                  ) : null}

                                  {/* Sub-Milestones Toggle Pill or Completed Trophy Badge */}
                                  <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 7 }}>
                                    {goal.isCompleted && (
                                      <View style={[styles.achievedBadge, isArabic && styles.rowReverse]}>
                                        <Ionicons name="trophy" size={11} color="#059669" />
                                        <Text style={styles.achievedBadgeText}>
                                          {isArabic ? 'إنجاز محقق' : 'Completed Win'}
                                        </Text>
                                      </View>
                                    )}

                                    {milestones.length > 0 && (
                                      <TouchableOpacity
                                        style={[
                                          styles.milestonesTogglePill,
                                          { backgroundColor: (goal.color || '#EA580C') + '14', marginTop: 0 },
                                          isArabic && styles.rowReverse,
                                        ]}
                                        onPress={() => toggleGoalExpansion(goal._id)}
                                        activeOpacity={0.7}
                                      >
                                        <Ionicons name="checkbox-outline" size={13} color={goal.color || '#EA580C'} />
                                        <Text style={[styles.milestonesToggleText, { color: goal.color || '#EA580C' }]}>
                                          {completedMilestones}/{milestones.length} {isArabic ? 'مهام فرعية' : 'sub-tasks'}
                                        </Text>
                                        <Ionicons
                                          name={isGoalExpanded ? 'chevron-up' : 'chevron-down'}
                                          size={13}
                                          color={goal.color || '#EA580C'}
                                        />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                </View>

                                {/* Action Buttons: Edit (Pencil) & Delete */}
                                <View style={[styles.goalActionsCol, isArabic && styles.rowReverse]}>
                                  <TouchableOpacity
                                    onPress={() => handleOpenEdit(goal)}
                                    style={styles.cardActionIconBtn}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Ionicons name="pencil" size={16} color={colors.textMuted} />
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={() => handleDeleteItem(goal._id, 'goal')}
                                    style={styles.cardActionIconBtn}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {/* ─── Level 3: Nested Sub-Milestones Checklist (Collapsible) ─── */}
                              {isGoalExpanded && (
                                <View
                                  style={[
                                    styles.milestonesListContainer,
                                    { borderTopColor: isDarkMode ? '#2D2D3E' : '#E5E7EB' },
                                  ]}
                                >
                                  {milestones.map((ms) => (
                                    <TouchableOpacity
                                      key={ms.id}
                                      style={[styles.milestoneCheckRow, isArabic && styles.rowReverse]}
                                      onPress={() => handleToggleMilestone(goal, ms.id)}
                                      activeOpacity={0.7}
                                    >
                                      <Ionicons
                                        name={ms.isCompleted ? 'checkbox' : 'square-outline'}
                                        size={17}
                                        color={ms.isCompleted ? colors.success : colors.textMuted}
                                      />
                                      <Text
                                        style={[
                                          styles.milestoneCheckText,
                                          {
                                            color: ms.isCompleted ? colors.textMuted : colors.text,
                                            textDecorationLine: ms.isCompleted ? 'line-through' : 'none',
                                            opacity: ms.isCompleted ? 0.6 : 1,
                                            textAlign: isArabic ? 'right' : 'left',
                                          },
                                        ]}
                                      >
                                        {ms.text}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}

                                  {/* Quick Add Sub-Milestone Inline */}
                                  <View style={[styles.inlineAddMsRow, isArabic && styles.rowReverse]}>
                                    <TextInput
                                      style={[
                                        styles.inlineAddMsInput,
                                        { color: colors.text, textAlign: isArabic ? 'right' : 'left' },
                                      ]}
                                      placeholder={isArabic ? '+ مهمة فرعية جديدة...' : '+ Add sub-milestone...'}
                                      placeholderTextColor={colors.textMuted}
                                      value={newMilestoneText[goal._id] || ''}
                                      onChangeText={(txt) =>
                                        setNewMilestoneText((prev) => ({ ...prev, [goal._id]: txt }))
                                      }
                                      onSubmitEditing={() => handleAddSubMilestone(goal)}
                                    />
                                    {(newMilestoneText[goal._id] || '').trim().length > 0 && (
                                      <TouchableOpacity
                                        onPress={() => handleAddSubMilestone(goal)}
                                        style={[styles.inlineAddMsBtn, { backgroundColor: goal.color || colors.primary }]}
                                      >
                                        <Ionicons name="add" size={16} color={goal.color ? '#FFFFFF' : colors.primaryText} />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                </View>
                              )}

                              {/* ─── Level 4: Linked Tasks (Cross-connected from Todos) ─── */}
                              <GoalLinkedTasks
                                goalId={goal._id}
                                goalTitle={goal.text}
                                goalColor={goal.color || '#8B5CF6'}
                                onOpenTaskDetail={(tId) => setSelectedTaskDetailId(tId)}
                              />
                            </View>
                          );
                        })}

                        {/* Render Section Achievements */}
                        {visibleAchievements.map((ach) => (
                          <View
                            key={ach._id}
                            style={[
                              styles.nestedAchievementCard,
                              {
                                backgroundColor: isDarkMode ? '#1E1E28' : '#F0FDF4',
                                borderColor: isDarkMode ? '#2D2D3E' : '#DCFCE7',
                              },
                            ]}
                          >
                            <View style={[styles.goalMainRow, isArabic && styles.rowReverse]}>
                              <TouchableOpacity
                                onPress={() => handleToggleAchievement(ach)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Ionicons
                                  name={ach.isCompleted ? 'checkmark-circle' : 'trophy-outline'}
                                  size={22}
                                  color={ach.isCompleted ? colors.success : '#059669'}
                                />
                              </TouchableOpacity>

                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.goalTitleText,
                                    {
                                      color: ach.isCompleted ? colors.textMuted : colors.text,
                                      textDecorationLine: ach.isCompleted ? 'line-through' : 'none',
                                      textAlign: isArabic ? 'right' : 'left',
                                    },
                                  ]}
                                >
                                  {ach.text}
                                </Text>
                              </View>

                              {/* Edit & Delete */}
                              <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                                <TouchableOpacity
                                  onPress={() => handleOpenEdit(ach)}
                                  style={styles.cardActionIconBtn}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Ionicons name="pencil" size={16} color={colors.textMuted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => handleDeleteItem(ach._id, 'achievement')}
                                  style={styles.cardActionIconBtn}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              });
          })()}

          {/* Bottom spacing for FAB */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ─── Floating Action Button (FAB) for Manual Creation ─────────── */}
        <View
          style={[
            styles.fabContainer,
            isArabic ? { left: 20 } : { right: 20 },
          ]}
        >
          <LivePress
            style={[styles.fabButton, { backgroundColor: colors.primary }]}
            onPress={() => handleOpenCreate()}
            pressScale={0.92}
          >
            <Ionicons name="add" size={28} color={colors.primaryText} />
          </LivePress>
        </View>

        {/* ─── AI Goal Generator Modal ────────────────────────────────────── */}
        <AIGoalGeneratorModal
          visible={aiModalVisible}
          onClose={() => setAiModalVisible(false)}
          year={year}
          month={month}
          userId={userId || ''}
          isArabic={isArabic}
          onPlanApplied={() => {
            // Refreshes when blueprint is applied
          }}
        />

        {/* ─── Goal / Achievement Full Form Modal (Create & Edit) ─────────── */}
        <GoalFormModal
          visible={formModalVisible}
          onClose={() => {
            setFormModalVisible(false);
            setEditingItem(null);
          }}
          mode={formModalMode}
          item={editingItem}
          initialCategory={formInitialCategory}
          categories={categoriesList}
          isArabic={isArabic}
          onSave={handleSaveGoalForm}
          onDelete={handleDeleteItem}
        />

        {/* ─── Task Detail Modal for Linked Tasks ─── */}
        <TaskDetailModal
          visible={!!selectedTaskDetailId}
          onClose={() => setSelectedTaskDetailId(null)}
          todoId={selectedTaskDetailId}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiSparkleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiSparkleBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  topAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  blueprintHeroCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  blueprintHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  blueprintHeroTag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  blueprintThemeTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 4,
  },
  blueprintQuoteText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  editBlueprintBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  aiInviteCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  aiInviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiInviteIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EA580C20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiInviteTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  aiInviteDesc: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoriesRow: {
    gap: 8,
    paddingVertical: 2,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionContainerCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  sectionHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
    gap: 10,
  },
  sectionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  secDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    flexShrink: 0,
  },
  sectionHeadingText: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  secCounterPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    flexShrink: 0,
  },
  secCounterText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionBody: {
    padding: 12,
    gap: 8,
  },
  nestedGoalCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  nestedAchievementCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  goalMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  goalCheckboxTouch: {
    marginTop: 1,
    flexShrink: 0,
  },
  goalContentCol: {
    flex: 1,
    minWidth: 0,
  },
  goalActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  goalTitleText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  goalDescText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 2,
  },
  achievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#05966918',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#05966930',
  },
  achievedBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  milestonesTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 7,
    flexShrink: 0,
  },
  milestonesToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardActionIconBtn: {
    padding: 4,
  },
  milestonesListContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    paddingLeft: 6,
  },
  milestoneCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4.5,
  },
  milestoneCheckText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
  },
  inlineAddMsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  inlineAddMsInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: 3,
  },
  inlineAddMsBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    zIndex: 99,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
});
