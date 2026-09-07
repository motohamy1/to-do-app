import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Animated, StyleSheet, BackHandler, KeyboardAvoidingView, Platform, FlatList, Share, TextInput, Dimensions, LayoutAnimation, PanResponder, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { createPlannerStyles } from '@/assets/styles/planner.styles';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { api } from '@/convex/_generated/api';
import TodoInput from '@/components/TodoInput';
import TodoCard from '@/components/TodoCard';
import TimerModal from '@/components/TimerModal';
import ProjectPickerModal from '@/components/ProjectPickerModal';
import ActionModal from '@/components/ActionModal';
import PlannerListModal from '@/components/PlannerListModal';
import { createHomeStyles } from '@/assets/styles/home.styles';
import { Id } from '@/convex/_generated/dataModel';

import { useTranslation } from '@/utils/i18n';
import { useScreenGuide } from '@/hooks/useScreenGuide';
import ScreenGuide from '@/components/ScreenGuide';
import type { GuideTip } from '@/components/ScreenGuide';
import { LIST_TYPE_COLORS } from '@/utils/magicColors';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import MonthWalletDeck from '@/components/MonthWalletDeck';
import { getMonthPalette } from '@/components/MonthCreditCard';
import LivePress from '@/components/LivePress';
import DayTimelineSchedule from '@/components/DayTimelineSchedule';
import TaskDetailModal from '@/components/TaskDetailModal';
import AnimatedWavyHeader from '@/components/AnimatedWavyHeader';
import { getEffectiveTaskDay } from '@/utils/taskDateUtils';

const months_en = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

const months_ar = [
  'يناير', 'فبراير', 'مارس', 'أبريل',
  'مايو', 'يونيو', 'يوليو', 'أغسطس',
  'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const weekdays_en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekdays_ar = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

const fullWeekdays_en = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fullWeekdays_ar = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const LIST_TYPE_CARDS = [
  { key: 'checklist', label: 'Checklists', icon: 'checkbox-outline', color: LIST_TYPE_COLORS.checklist },
  { key: 'bullet', label: 'Bullet Points', icon: 'ellipse', color: LIST_TYPE_COLORS.bullet },
  { key: 'toggle', label: 'Toggle Lists', icon: 'albums-outline', color: LIST_TYPE_COLORS.toggle },
];

const Planner = () => {
  const params = useLocalSearchParams<{ year?: string; month?: string; day?: string; from?: string }>();
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const styles = createPlannerStyles(colors, isArabic);
  const homeStyles = createHomeStyles(colors, isArabic);
  const cardBg = colors.surface;
  const router = useRouter();
  const months = isArabic ? months_ar : months_en;
  const { showGuide, dismissGuide } = useScreenGuide('planner');

  const plannerTips: GuideTip[] = isArabic ? [
    { icon: 'calendar-outline', title: 'اختر شهراً', description: 'اضغط على أي شهر لعرض أيامه ومهامه.', accentColor: '#f6e5c9' },
    { icon: 'eye-outline', title: 'عرض اليوم', description: 'اضغط على يوم لرؤية المهام والملاحظات والتذكيرات.', accentColor: '#defef9' },
    { icon: 'arrow-back-outline', title: 'الرجوع', description: 'اضغط X للعودة إلى عرض الشهور في أي وقت.', accentColor: '#dbd4fd' },
  ] : [
    { icon: 'calendar-outline', title: 'Pick a Month', description: 'Tap any month to view its days and your scheduled tasks.', accentColor: '#f6e5c9' },
    { icon: 'eye-outline', title: 'Day View', description: 'Tap a day to see tasks, notes, and reminders for that date.', accentColor: '#defef9' },
    { icon: 'arrow-back-outline', title: 'Go Back', description: 'Tap the X button to return to the month grid anytime.', accentColor: '#dbd4fd' },
  ];
  
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Sync navigation params from home or external links
  useEffect(() => {
    if (params.month !== undefined && params.day !== undefined) {
      const m = parseInt(params.month, 10);
      const d = parseInt(params.day, 10);
      if (!isNaN(m) && !isNaN(d)) {
        setSelectedMonth(m);
        setSelectedDay(d);
      }
    } else if (params.month !== undefined) {
      const m = parseInt(params.month, 10);
      if (!isNaN(m)) {
        setSelectedMonth(m);
        setSelectedDay(null);
      }
    }
  }, [params.month, params.day]);
  
  const [expandedTodoId, setExpandedTodoId] = useState<Id<"todos"> | null>(null);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Id<"todos"> | null>(null);
  const [dayHubFilter, setDayHubFilter] = useState<'all' | 'tasks' | 'checklists' | 'notes' | 'completed'>('all');
  const [isTimerModalVisible, setTimerModalVisible] = useState(false);
  const [isProjectModalVisible, setProjectModalVisible] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<Id<"todos"> | null>(null);
  
  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<any>(null);

  const [plannerListModalVisible, setPlannerListModalVisible] = useState(false);
  const [activePlannerListType, setActivePlannerListType] = useState<string>('checklist');

  // Collapsible section state for day view
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    lists: false,
    reminders: false,
    notes: false,
    tasks: false,
    completed: false,
  });

  const toggleSection = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateTodoStatus = useOfflineMutation(api.todos.updateStatus, "todos:updateStatus");
  const addTodoMutation = useOfflineMutation(api.todos.addTodo, "todos:addTodo");
  const deleteTodoMutation = useOfflineMutation(api.todos.deleteTodo, "todos:deleteTodo");
  const addPlannerItemMutation = useOfflineMutation(api.projects.addPlannerItem, "projects:addPlannerItem");
  const updatePlannerItemMutation = useOfflineMutation(api.projects.updatePlannerItem, "projects:updatePlannerItem");
  const deletePlannerItemMutation = useOfflineMutation(api.projects.deletePlannerItem, "projects:deletePlannerItem");
  const setTimerMutation = useOfflineMutation(api.todos.setTimer, "todos:setTimer");
  const linkProjectMutation = useOfflineMutation(api.todos.linkProject, "todos:linkProject");
  const linkTaskMutation = useOfflineMutation(api.todos.linkTask, "todos:linkTask");
  const scrollViewRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);
  const monthStackRef = useRef<ScrollView>(null);
  const autoReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { width: screenWidth } = useWindowDimensions();
  const currentYear = new Date().getFullYear();
  const [activeYear, setActiveYear] = useState(currentYear);
  const years = useMemo(() => [currentYear - 1, currentYear, currentYear + 1, currentYear + 2], [currentYear]);
  const currentMonth = new Date().getMonth();

  // Scroll year carousel to active/current year whenever viewing the month grid
  useEffect(() => {
    if (selectedMonth === null) {
      const targetYear = activeYear || currentYear;
      const targetIdx = years.indexOf(targetYear);
      const idx = targetIdx !== -1 ? targetIdx : years.indexOf(currentYear);
      const timer = setTimeout(() => {
        yearScrollRef.current?.scrollTo({ x: idx * screenWidth, animated: false });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [selectedMonth, activeYear, screenWidth, currentYear, years]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };




  const isFromHome = params.from === 'home';

  const handleGoBack = () => {
    if (isFromHome) {
      router.replace('/(tabs)');
    } else if (selectedDay !== null) {
      setSelectedDay(null);
    } else if (selectedMonth !== null) {
      setSelectedMonth(null);
    }
  };

  const dayViewPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.6;
        const isSignificant = Math.abs(gestureState.dx) > 15;
        if (isArabic) {
          return isHorizontal && isSignificant && gestureState.dx < -15;
        }
        return isHorizontal && isSignificant && gestureState.dx > 15;
      },
      onPanResponderRelease: (_, gestureState) => {
        const isQuickSwipe = Math.abs(gestureState.vx) > 0.35;
        const isLongSwipe = Math.abs(gestureState.dx) > 55;
        const correctDirection = isArabic ? gestureState.dx < -40 : gestureState.dx > 40;

        if ((isQuickSwipe || isLongSwipe) && correctDirection) {
          handleGoBack();
        }
      },
    })
  ).current;

  // Handle system back button ONLY when planner screen is focused
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (selectedDay !== null) {
          handleGoBack();
          return true;
        }
        if (selectedMonth !== null) {
          handleGoBack();
          return true;
        }
        return false; // let default behavior happen
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }, [selectedMonth, selectedDay, isFromHome])
  );

  
  const todos = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : "skip") || [];

  const selectedDateTs = selectedDay !== null && selectedMonth !== null
    ? new Date(currentYear, selectedMonth, selectedDay).getTime()
    : null;

  const plannerChecklistItems = useOfflineQuery<any[]>('plannerItems_checklist', api.projects.getPlannerItems, selectedDateTs && userId ? { userId, date: selectedDateTs, listType: 'checklist' } : "skip");
  const plannerBulletItems = useOfflineQuery<any[]>('plannerItems_bullet', api.projects.getPlannerItems, selectedDateTs && userId ? { userId, date: selectedDateTs, listType: 'bullet' } : "skip");
  const plannerToggleItems = useOfflineQuery<any[]>('plannerItems_toggle', api.projects.getPlannerItems, selectedDateTs && userId ? { userId, date: selectedDateTs, listType: 'toggle' } : "skip");

  const allGoals = useOfflineQuery<any[]>('yearlyGoals', api.yearlyGoals.getAllGoals, userId ? { userId } : "skip") || [];
  const allAchievements = useOfflineQuery<any[]>('yearlyAchievements', api.yearlyGoals.getAllAchievements, userId ? { userId } : "skip") || [];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getTasksForDay = (day: number, month: number, year: number) => {
    return todos.filter(todo => {
      const effectiveDayTs = getEffectiveTaskDay(todo);
      const todoDate = new Date(effectiveDayTs);
      return todoDate.getDate() === day && 
             todoDate.getMonth() === month && 
             todoDate.getFullYear() === year;
    });
  };

  const resetAll = () => {
    setSelectedMonth(null);
    setSelectedDay(null);
  };

  const getTasksForMonth = (monthIndex: number) => {
    return todos.filter(todo => {
      const effectiveDayTs = getEffectiveTaskDay(todo);
      const todoDate = new Date(effectiveDayTs);
      return todoDate.getMonth() === monthIndex && todoDate.getFullYear() === currentYear;
    });
  };

  // Helper: parse checklist stats from description
  const getChecklistStats = (description?: string) => {
    if (!description) return { total: 0, completed: 0 };
    const lines = description.split('\n');
    const todos = lines.filter(l => l.startsWith('☐ ') || l.startsWith('☑ '));
    const completed = lines.filter(l => l.startsWith('☑ ')).length;
    return { total: todos.length, completed };
  };

  const renderMonthGrid = () => {
    const activeYearIndex = years.indexOf(activeYear);
    const initialIndex = activeYearIndex !== -1 ? activeYearIndex : years.indexOf(currentYear);

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
      >
        {/* ─── Deep Shadow Goals of the Year ─── */}
        <View style={styles.yearSectionHeader}>
          <Text style={styles.yearSectionTitle}>{t.goalsOfTheYear}</Text>
          <Text style={styles.yearSectionSubtitle}>{t.year} {activeYear}</Text>
        </View>

        <ScrollView
          ref={yearScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * screenWidth, y: 0 }}
          onMomentumScrollEnd={(e) => {
            const pageIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            if (pageIndex >= 0 && pageIndex < years.length) {
              setActiveYear(years[pageIndex]);
            }
          }}
          contentContainerStyle={styles.yearScrollContainer}
          style={{ height: 129 }}
        >
          {years.map((year) => {
            const yearGoalDocs = allGoals.filter((g: any) => g.year === year);
            const yearAchievementDocs = allAchievements.filter((a: any) => a.year === year);
            const isCurrent = year === currentYear;

            // Aggregate checklist stats across all goal docs for this year
            let totalGoals = 0;
            let completedGoals = 0;
            yearGoalDocs.forEach((doc: any) => {
              const stats = getChecklistStats(doc.description);
              totalGoals += stats.total;
              completedGoals += stats.completed;
            });
            // Fallback: if no checklists parsed but docs exist, count docs as items
            if (totalGoals === 0 && yearGoalDocs.length > 0) {
              totalGoals = yearGoalDocs.length;
              completedGoals = yearGoalDocs.filter((d: any) => d.isCompleted).length;
            }

            const goalProgress = totalGoals > 0 ? completedGoals / totalGoals : 0;
            const achievementCount = yearAchievementDocs.length;

            const currentMonthPalette = getMonthPalette(currentMonth);

            // Dynamic color system for current year card (matches current month palette)
            const cardBg = isCurrent ? currentMonthPalette.bg : colors.surface;
            const cardBorder = isCurrent ? currentMonthPalette.ink + '20' : colors.border;
            const textColor = isCurrent ? currentMonthPalette.ink : colors.text;
            const textMutedColor = isCurrent ? currentMonthPalette.ink + 'A6' : colors.textMuted;
            const badgeBg = isCurrent ? currentMonthPalette.ink + '18' : colors.primary + '18';
            const badgeTextColor = isCurrent ? currentMonthPalette.ink : colors.primary;
            const iconBtnBg = isCurrent ? currentMonthPalette.ink + '14' : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)');
            const iconBtnColor = isCurrent ? currentMonthPalette.ink : colors.primary;
            const capsuleBg = isCurrent ? currentMonthPalette.ink + '0E' : (isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)');
            const capsuleBorder = isCurrent ? currentMonthPalette.ink + '18' : colors.border;
            const flagIconColor = isCurrent ? currentMonthPalette.ink : (isDarkMode ? '#e5f19d' : colors.primary);
            const trophyIconColor = isCurrent ? currentMonthPalette.ink : '#FBBF24';
            const progressTrackBg = isCurrent ? currentMonthPalette.ink + '1A' : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)');
            const progressFillBg = isCurrent ? currentMonthPalette.accent : (isDarkMode ? '#e5f19d' : colors.primary);
            const progressTextColor = isCurrent ? currentMonthPalette.ink : (isDarkMode ? '#e5f19d' : colors.primary);

            return (
              <View key={year} style={{ width: screenWidth, paddingHorizontal: 16 }}>
                <TouchableOpacity
                  style={[
                    styles.yearCard,
                    {
                      backgroundColor: cardBg,
                      borderColor: cardBorder,
                    },
                    isCurrent && {
                      shadowColor: currentMonthPalette.ink,
                      shadowOpacity: 0.15,
                      shadowRadius: 10,
                      elevation: 4,
                    }
                  ]}
                  onPress={() => router.push({
                    pathname: '/goals-detail',
                    params: {
                      year: year.toString(),
                      title: isArabic ? `أهداف وإنجازات عام ${year}` : `${year} Goals & Achievements`,
                    },
                  })}
                  activeOpacity={0.88}
                >
                  {/* Top Row: Year, Badge, Edit Icon */}
                  <View style={styles.yearCardHeader}>
                    <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.yearCardTitle, { color: textColor }]}>{year}</Text>
                      {isCurrent && (
                        <View style={[styles.yearCardBadge, { backgroundColor: badgeBg }]}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: badgeTextColor }}>{t.current}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: iconBtnBg, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="create-outline" size={15} color={iconBtnColor} />
                    </View>
                  </View>

                  {/* Middle Row: Stats Capsules */}
                  <View style={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginVertical: 4,
                  }}>
                    {/* Goals stat capsule (Navigates to Year Goals) */}
                    <TouchableOpacity
                      style={[styles.yearStatCard, { backgroundColor: capsuleBg, borderColor: capsuleBorder }]}
                      onPress={() => router.push({
                        pathname: '/goals-detail',
                        params: {
                          year: year.toString(),
                          title: isArabic ? `أهداف عام ${year}` : `${year} Goals`,
                        }
                      })}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="flag-outline" size={16} color={flagIconColor} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.yearStatValue, { color: textColor, textAlign: isArabic ? 'right' : 'left' }]}>
                          {totalGoals > 0 ? `${completedGoals}/${totalGoals}` : '—'}
                        </Text>
                        <Text style={[styles.yearStatLabel, { color: textMutedColor, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>
                          {t.goalsOfTheYear}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Achievements stat capsule (Navigates to Year Goals & Wins) */}
                    <TouchableOpacity
                      style={[styles.yearStatCard, { backgroundColor: capsuleBg, borderColor: capsuleBorder }]}
                      onPress={() => router.push({
                        pathname: '/goals-detail',
                        params: {
                          year: year.toString(),
                          title: isArabic ? `إنجازات عام ${year}` : `${year} Achievements`,
                        }
                      })}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="trophy-outline" size={16} color={trophyIconColor} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.yearStatValue, { color: textColor, textAlign: isArabic ? 'right' : 'left' }]}>
                          {achievementCount}
                        </Text>
                        <Text style={[styles.yearStatLabel, { color: textMutedColor, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>
                          {t.achievementsOfTheYear}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Bottom Row: Progress bar or Tap to plan */}
                  {totalGoals > 0 ? (
                    <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <View style={{
                        flex: 1,
                        height: 5,
                        backgroundColor: progressTrackBg,
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}>
                        <View style={{
                          height: '100%',
                          width: `${goalProgress * 100}%`,
                          backgroundColor: progressFillBg,
                          borderRadius: 3,
                        }} />
                      </View>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: progressTextColor,
                      }}>
                        {Math.round(goalProgress * 100)}% {t.goalCompleted}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{
                      textAlign: 'center',
                      color: textMutedColor,
                      fontSize: 11,
                      fontWeight: '600',
                      marginTop: 2,
                    }}>
                      {t.tapToPlan}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>

        {/* ─── 3D Vertical Stacked Wallet Deck for Months ─── */}
        <MonthWalletDeck
          months={months}
          currentYear={currentYear}
          currentMonthIndex={currentMonth}
          getTasksForMonth={getTasksForMonth}
          onSelectMonth={(monthIdx) => setSelectedMonth(monthIdx)}
          isArabic={isArabic}
          t={{
            current: t.current,
            task: t.task,
            tasksThisMonth: t.tasksThisMonth,
            empty: t.empty,
          }}
        />
      </ScrollView>
    );
  };

  const renderDayGrid = (monthIndex: number) => {
    const daysInMonth = getDaysInMonth(monthIndex, currentYear);
    const palette = getMonthPalette(monthIndex);
    const monthTasks = getTasksForMonth(monthIndex);
    const completedMonthTasks = monthTasks.filter(t => t.status === 'done');
    const firstDayOfWeek = new Date(currentYear, monthIndex, 1).getDay();

    const weekdays = isArabic ? weekdays_ar : weekdays_en;

    // Build exact 7-column rows so every day column aligns with weekday headers
    const totalSlots = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
    const calendarRows: Array<Array<{ day: number | null; isToday: boolean; isSolidEdge: boolean; tasks: any[] }>> = [];

    let currentRow: Array<{ day: number | null; isToday: boolean; isSolidEdge: boolean; tasks: any[] }> = [];

    for (let slot = 0; slot < totalSlots; slot++) {
      const dayNumber = slot >= firstDayOfWeek && slot < firstDayOfWeek + daysInMonth
        ? slot - firstDayOfWeek + 1
        : null;

      const isToday = dayNumber !== null && 
                      dayNumber === new Date().getDate() && 
                      monthIndex === new Date().getMonth() && 
                      currentYear === new Date().getFullYear();

      const isLastRow = slot >= totalSlots - 7;
      const isSolidEdgeDay = dayNumber !== null && (daysInMonth >= 30 ? (dayNumber >= 30 || isLastRow) : false);
      const dayTasks = dayNumber ? getTasksForDay(dayNumber, monthIndex, currentYear) : [];

      currentRow.push({
        day: dayNumber,
        isToday,
        isSolidEdge: isSolidEdgeDay,
        tasks: dayTasks,
      });

      if (currentRow.length === 7) {
        calendarRows.push(currentRow);
        currentRow = [];
      }
    }

    return (
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100, paddingTop: 4 }} 
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Redesigned Month Goals & Tasks Capsule Card ─── */}
        {(() => {
          const monthGoalDocs = allGoals.filter((g: any) => g.year === currentYear && g.month === monthIndex && g.day === undefined);
          const monthAchievementDocs = allAchievements.filter((a: any) => a.year === currentYear && a.month === monthIndex && a.day === undefined);

          let totalGoals = 0;
          let completedGoals = 0;
          monthGoalDocs.forEach((doc: any) => {
            const stats = getChecklistStats(doc.description);
            totalGoals += stats.total;
            completedGoals += stats.completed;
          });
          if (totalGoals === 0 && monthGoalDocs.length > 0) {
            totalGoals = monthGoalDocs.length;
            completedGoals = monthGoalDocs.filter((d: any) => d.isCompleted).length;
          }

          const goalProgress = totalGoals > 0 ? completedGoals / totalGoals : 0;
          const achievementCount = monthAchievementDocs.length;
          const totalTasksCount = monthTasks.length;
          const completedTasksCount = completedMonthTasks.length;
          const taskProgress = totalTasksCount > 0 ? completedTasksCount / totalTasksCount : 0;

          return (
            <LivePress
              style={[
                styles.monthGoalsCardNew,
                {
                  backgroundColor: palette.bg,
                  borderColor: palette.ink + '20',
                  shadowColor: palette.ink,
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 5,
                }
              ]}
              onPress={() => router.push({
                pathname: '/goals-detail',
                params: {
                  year: currentYear.toString(),
                  month: monthIndex.toString(),
                  title: isArabic ? `أهداف ${months[monthIndex]}` : `${months[monthIndex]} Goals`,
                }
              })}
              pressScale={0.96}
            >
              {/* Header row: Month & Year Pill + Edit icon button */}
              <View style={[styles.monthGoalsHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.monthGoalsTitleText, { color: palette.ink }]}>
                    {months[monthIndex]} {currentYear}
                  </Text>
                  {monthIndex === currentMonth && (
                    <View style={[styles.monthGoalsPill, { backgroundColor: palette.ink + '18' }]}>
                      <Text style={[styles.monthGoalsPillText, { color: palette.ink }]}>{t.current}</Text>
                    </View>
                  )}
                </View>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: palette.ink + '14',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Ionicons name="create-outline" size={16} color={palette.ink} />
                </View>
              </View>

              {/* 3 Stats Capsules: Tasks, Goals, Achievements */}
              <View style={[styles.monthStatsRow, isArabic && { flexDirection: 'row-reverse' }]}>
                {/* Tasks Capsule */}
                <View style={[styles.monthStatCapsule, { backgroundColor: palette.ink + '0E', borderColor: palette.ink + '18' }]}>
                  <Ionicons name="checkbox-outline" size={16} color={palette.ink} />
                  <Text style={[styles.monthStatValueText, { color: palette.ink }]}>
                    {totalTasksCount > 0 ? `${completedTasksCount}/${totalTasksCount}` : '0'}
                  </Text>
                  <Text style={[styles.monthStatLabelText, { color: palette.ink + 'B3' }]} numberOfLines={1}>
                    {isArabic ? 'المهام' : 'Tasks'}
                  </Text>
                </View>

                {/* Goals Capsule */}
                <View style={[styles.monthStatCapsule, { backgroundColor: palette.ink + '0E', borderColor: palette.ink + '18' }]}>
                  <Ionicons name="flag-outline" size={16} color={palette.ink} />
                  <Text style={[styles.monthStatValueText, { color: palette.ink }]}>
                    {totalGoals > 0 ? `${completedGoals}/${totalGoals}` : '—'}
                  </Text>
                  <Text style={[styles.monthStatLabelText, { color: palette.ink + 'B3' }]} numberOfLines={1}>
                    {isArabic ? 'الأهداف' : 'Goals'}
                  </Text>
                </View>

                {/* Achievements Capsule */}
                <View style={[styles.monthStatCapsule, { backgroundColor: palette.ink + '0E', borderColor: palette.ink + '18' }]}>
                  <Ionicons name="trophy-outline" size={16} color={palette.ink} />
                  <Text style={[styles.monthStatValueText, { color: palette.ink }]}>
                    {achievementCount}
                  </Text>
                  <Text style={[styles.monthStatLabelText, { color: palette.ink + 'B3' }]} numberOfLines={1}>
                    {isArabic ? 'إنجازات' : 'Achievements'}
                  </Text>
                </View>
              </View>

              {/* Progress Bar & Completion Stat */}
              {totalGoals > 0 || totalTasksCount > 0 ? (
                <View style={[styles.monthProgressContainer, isArabic && { alignItems: 'flex-end' }]}>
                  <View style={[styles.monthProgressBarTrack, { backgroundColor: palette.ink + '1A', width: '100%' }]}>
                    <View style={[
                      styles.monthProgressBarFill,
                      {
                        width: `${totalGoals > 0 ? goalProgress * 100 : taskProgress * 100}%`,
                        backgroundColor: palette.accent,
                      }
                    ]} />
                  </View>
                  <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 2 }}>
                    <Text style={[styles.monthProgressText, { color: palette.ink }]}>
                      {totalGoals > 0 
                        ? `${Math.round(goalProgress * 100)}% ${t.goalCompleted || 'complete'}` 
                        : `${Math.round(taskProgress * 100)}% ${isArabic ? 'مهام مكتملة' : 'tasks done'}`}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: palette.ink + '99' }}>
                      {isArabic ? 'اضغط للتفاصيل' : 'Tap for details'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={{ textAlign: 'center', color: palette.ink + '99', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                  {isArabic ? 'اضغط لتحديد أهداف الشهر' : 'Tap to set monthly goals'}
                </Text>
              )}
            </LivePress>
          );
        })()}

        {/* ─── Calendar Section (Weekdays + Days Grid) ─── */}
        <View style={styles.calendarContainer}>
          {/* Weekday Header Row */}
          <View style={[styles.weekdayRow, isArabic && { flexDirection: 'row-reverse' }]}>
            {weekdays.map((dayName, idx) => (
              <View key={idx} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{dayName}</Text>
              </View>
            ))}
          </View>

          {/* 7-Column Calendar Rows */}
          {calendarRows.map((row, rowIdx) => (
            <View key={`row-${rowIdx}`} style={[styles.calendarRow, isArabic && { flexDirection: 'row-reverse' }]}>
              {row.map((cell, colIdx) => {
                if (cell.day === null) {
                  return (
                    <View key={`empty-${rowIdx}-${colIdx}`} style={styles.calendarDaySlotEmpty} />
                  );
                }

                return (
                  <Reanimated.View 
                    key={`day-${cell.day}`} 
                    entering={FadeInDown.duration(280).delay(((rowIdx * 7 + colIdx) % 7) * 20)} 
                    style={styles.calendarDayCell}
                  >
                    <LivePress 
                      style={[
                        styles.dayCard, 
                        cell.isSolidEdge && styles.dayCardEdgeSolid,
                        cell.tasks.length > 0 && styles.hasTaskCard,
                        cell.isToday && styles.todayCard,
                        cell.isToday && { backgroundColor: palette.accent, borderColor: palette.accent }
                      ]}
                      onPress={() => setSelectedDay(cell.day!)}
                      pressScale={0.96}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={[
                        styles.dayText, 
                        cell.isToday && styles.todayText
                      ]}>{cell.day}</Text>
                      {cell.tasks.length > 0 ? (
                        <View style={[
                          styles.dayTaskBadge, 
                          cell.isToday && { backgroundColor: 'rgba(255, 255, 255, 0.28)' }
                        ]}>
                          <Text style={[
                            styles.dayTaskBadgeText, 
                            cell.isToday && { color: '#FFFFFF' }
                          ]}>
                            {cell.tasks.length}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[
                          styles.dayStats, 
                          cell.isToday && styles.todayStats
                        ]}>·</Text>
                      )}
                    </LivePress>
                  </Reanimated.View>
                );
              })}
            </View>
          ))}
        </View>

        {/* ─── Redesigned Month Bottom Summary ─── */}
        {(() => {
          const monthGoalDocs = allGoals.filter((g: any) => g.year === currentYear && g.month === monthIndex && g.day === undefined);
          const monthAchievementDocs = allAchievements.filter((a: any) => a.year === currentYear && a.month === monthIndex && a.day === undefined);
          
          const notDoneTasks = monthTasks.filter(t => t.status === 'not_done' || (t.status === 'not_started' && t.dueDate && new Date(t.dueDate).setHours(23,59,59,999) < Date.now()));
          const completedTasks = monthTasks.filter(t => t.status === 'done');
          const incompleteGoals = monthGoalDocs.filter((g: any) => !g.isCompleted);
          const completedGoals = monthGoalDocs.filter((g: any) => g.isCompleted);
          const completedAchievements = monthAchievementDocs.filter((a: any) => a.isCompleted);
          const incompleteAchievements = monthAchievementDocs.filter((a: any) => !a.isCompleted);
          
          return (
            <View style={styles.monthSummaryCardNew}>
              <View style={[styles.monthSummaryHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="analytics-outline" size={18} color={colors.primary} />
                  <Text style={styles.monthSummaryTitle}>
                    {isArabic ? 'ملخص الشهر' : 'Month Summary'}
                  </Text>
                </View>
              </View>
              
              {completedTasks.length > 0 && (
                <View style={[
                  styles.monthSummaryItem, 
                  { backgroundColor: colors.success + '12', borderColor: colors.success + '25' },
                  isArabic && { flexDirection: 'row-reverse' }
                ]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={[styles.monthSummaryItemText, { color: colors.success }, isArabic && { textAlign: 'right' }]}>
                    {isArabic ? 'مهام مكتملة' : 'Tasks Completed'}
                  </Text>
                  <Text style={[styles.monthSummaryItemCount, { color: colors.success }]}>
                    {completedTasks.length}
                  </Text>
                </View>
              )}

              {notDoneTasks.length > 0 && (
                <View style={[
                  styles.monthSummaryItem, 
                  { backgroundColor: colors.danger + '12', borderColor: colors.danger + '25' },
                  isArabic && { flexDirection: 'row-reverse' }
                ]}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={[styles.monthSummaryItemText, { color: colors.danger }, isArabic && { textAlign: 'right' }]}>
                    {isArabic ? 'مهام لم تنجز' : 'Tasks Pending / Overdue'}
                  </Text>
                  <Text style={[styles.monthSummaryItemCount, { color: colors.danger }]}>
                    {notDoneTasks.length}
                  </Text>
                </View>
              )}
              
              {completedGoals.length > 0 && (
                <View style={[
                  styles.monthSummaryItem, 
                  { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' },
                  isArabic && { flexDirection: 'row-reverse' }
                ]}>
                  <Ionicons name="flag" size={16} color={colors.primary} />
                  <Text style={[styles.monthSummaryItemText, { color: colors.primary }, isArabic && { textAlign: 'right' }]}>
                    {isArabic ? 'أهداف محققة' : 'Goals Achieved'}
                  </Text>
                  <Text style={[styles.monthSummaryItemCount, { color: colors.primary }]}>
                    {completedGoals.length}
                  </Text>
                </View>
              )}

              {completedAchievements.length > 0 && (
                <View style={[
                  styles.monthSummaryItem, 
                  { backgroundColor: '#FBBF2415', borderColor: '#FBBF2430' },
                  isArabic && { flexDirection: 'row-reverse' }
                ]}>
                  <Ionicons name="trophy" size={16} color="#FBBF24" />
                  <Text style={[styles.monthSummaryItemText, { color: '#FBBF24' }, isArabic && { textAlign: 'right' }]}>
                    {isArabic ? 'إنجازات محققة' : 'Achievements Reached'}
                  </Text>
                  <Text style={[styles.monthSummaryItemCount, { color: '#FBBF24' }]}>
                    {completedAchievements.length}
                  </Text>
                </View>
              )}

              {incompleteGoals.length > 0 && (
                <View style={[
                  styles.monthSummaryItem, 
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border },
                  isArabic && { flexDirection: 'row-reverse' }
                ]}>
                  <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.monthSummaryItemText, { color: colors.textMuted }, isArabic && { textAlign: 'right' }]}>
                    {isArabic ? 'أهداف متبقية' : 'Goals Incomplete'}
                  </Text>
                  <Text style={[styles.monthSummaryItemCount, { color: colors.textMuted }]}>
                    {incompleteGoals.length}
                  </Text>
                </View>
              )}

              {incompleteAchievements.length > 0 && (
                <View style={[
                  styles.monthSummaryItem, 
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border },
                  isArabic && { flexDirection: 'row-reverse' }
                ]}>
                  <Ionicons name="trophy-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.monthSummaryItemText, { color: colors.textMuted }, isArabic && { textAlign: 'right' }]}>
                    {isArabic ? 'إنجازات قيد العمل' : 'Achievements In Progress'}
                  </Text>
                  <Text style={[styles.monthSummaryItemCount, { color: colors.textMuted }]}>
                    {incompleteAchievements.length}
                  </Text>
                </View>
              )}

              {completedTasks.length === 0 && notDoneTasks.length === 0 && completedGoals.length === 0 && completedAchievements.length === 0 && incompleteGoals.length === 0 && incompleteAchievements.length === 0 && (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
                    {isArabic ? 'لا توجد بيانات مسجلة لهذا الشهر بعد' : 'No recorded activity for this month yet'}
                  </Text>
                </View>
              )}
            </View>
          );
        })()}
      </ScrollView>
    );
  };

  const getPlannerListCount = (key: string) => {
    if (key === 'checklist') return plannerChecklistItems?.length || 0;
    if (key === 'bullet') return plannerBulletItems?.length || 0;
    if (key === 'toggle') return plannerToggleItems?.length || 0;
    return 0;
  };

  const openPlannerListModal = (listType: string) => {
    setActivePlannerListType(listType);
    setPlannerListModalVisible(true);
  };

  const renderSpecificDayView = (day: number, month: number, year: number) => {
    const tasks = getTasksForDay(day, month, year);
    const selectedDateTs = new Date(year, month, day).getTime();
    const palette = getMonthPalette(month);
    const dayOfWeekIndex = new Date(year, month, day).getDay();
    const weekdayName = isArabic ? fullWeekdays_ar[dayOfWeekIndex] : fullWeekdays_en[dayOfWeekIndex];

    const activeTasks = tasks.filter(t => t.type !== 'note' && t.type !== 'reminder' && t.status !== 'done');
    const completedTasks = tasks.filter(t => t.type !== 'note' && t.type !== 'reminder' && t.status === 'done');
    const reminderTasks = tasks.filter(t => t.type === 'reminder');
    const noteTasks = tasks.filter(t => t.type === 'note');

    return (
      <ScrollView 
        ref={scrollViewRef} 
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Day Glance Header ─── */}
        <View style={[styles.specificDayHeaderNew, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.specificDayDateGroup, isArabic && { alignItems: 'flex-end' }]}>
            <Text style={styles.specificDayTitleNew}>
              {day} {months[month]} {year}
            </Text>
            <View style={[styles.specificDayWeekdayPill, isArabic && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="calendar" size={12} color={colors.primary} />
              <Text style={styles.specificDayWeekdayText}>{weekdayName}</Text>
            </View>
          </View>
          
          <View style={styles.specificDayTaskCountBadge}>
            <Text style={styles.specificDayTaskCountNumber}>{activeTasks.length}</Text>
            <Text style={styles.specificDayTaskCountLabel}>
              {activeTasks.length === 1 ? (isArabic ? 'مهمة' : 'task') : (isArabic ? 'مهام' : 'tasks')}
            </Text>
          </View>
        </View>

        {/* ─── Daily Goals & Progress Card (Harmonized with Month Palette) ─── */}
        {(() => {
          const dayGoalDocs = allGoals.filter((g: any) => g.year === year && g.month === month && g.day === day);
          const dayAchievementDocs = allAchievements.filter((a: any) => a.year === year && a.month === month && a.day === day);

          let totalGoals = 0;
          let completedGoals = 0;
          dayGoalDocs.forEach((doc: any) => {
            const stats = getChecklistStats(doc.description);
            totalGoals += stats.total;
            completedGoals += stats.completed;
          });
          if (totalGoals === 0 && dayGoalDocs.length > 0) {
            totalGoals = dayGoalDocs.length;
            completedGoals = dayGoalDocs.filter((d: any) => d.isCompleted).length;
          }

          const goalProgress = totalGoals > 0 ? completedGoals / totalGoals : 0;
          const achievementCount = dayAchievementDocs.length;
          const totalDayTasks = tasks.length;
          const completedDayTasksCount = completedTasks.length;
          const taskProgress = totalDayTasks > 0 ? completedDayTasksCount / totalDayTasks : 0;

          return (
            <LivePress
              style={[
                styles.monthGoalsCardNew,
                {
                  backgroundColor: palette.bg,
                  borderColor: palette.ink + '20',
                  shadowColor: palette.ink,
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 5,
                }
              ]}
              onPress={() => router.push({
                pathname: '/goals-detail',
                params: {
                  year: year.toString(),
                  month: month.toString(),
                  day: day.toString(),
                  title: isArabic ? `أهداف ${day} ${months[month]}` : `${months[month]} ${day} Goals`,
                }
              })}
              pressScale={0.96}
            >
              <View style={[styles.monthGoalsHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.monthGoalsTitleText, { color: palette.ink }]}>
                    {isArabic ? `أهداف ${day} ${months[month]}` : `Day ${day} Goals`}
                  </Text>
                </View>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: palette.ink + '14',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Ionicons name="create-outline" size={16} color={palette.ink} />
                </View>
              </View>

              <View style={[styles.monthStatsRow, isArabic && { flexDirection: 'row-reverse' }]}>
                {/* Tasks Capsule */}
                <View style={[styles.monthStatCapsule, { backgroundColor: palette.ink + '0E', borderColor: palette.ink + '18' }]}>
                  <Ionicons name="checkbox-outline" size={16} color={palette.ink} />
                  <Text style={[styles.monthStatValueText, { color: palette.ink }]}>
                    {totalDayTasks > 0 ? `${completedDayTasksCount}/${totalDayTasks}` : '0'}
                  </Text>
                  <Text style={[styles.monthStatLabelText, { color: palette.ink + 'B3' }]} numberOfLines={1}>
                    {isArabic ? 'المهام' : 'Tasks'}
                  </Text>
                </View>

                {/* Goals Capsule */}
                <View style={[styles.monthStatCapsule, { backgroundColor: palette.ink + '0E', borderColor: palette.ink + '18' }]}>
                  <Ionicons name="flag-outline" size={16} color={palette.ink} />
                  <Text style={[styles.monthStatValueText, { color: palette.ink }]}>
                    {totalGoals > 0 ? `${completedGoals}/${totalGoals}` : '—'}
                  </Text>
                  <Text style={[styles.monthStatLabelText, { color: palette.ink + 'B3' }]} numberOfLines={1}>
                    {isArabic ? 'الأهداف' : 'Goals'}
                  </Text>
                </View>

                {/* Achievements Capsule */}
                <View style={[styles.monthStatCapsule, { backgroundColor: palette.ink + '0E', borderColor: palette.ink + '18' }]}>
                  <Ionicons name="trophy-outline" size={16} color={palette.ink} />
                  <Text style={[styles.monthStatValueText, { color: palette.ink }]}>
                    {achievementCount}
                  </Text>
                  <Text style={[styles.monthStatLabelText, { color: palette.ink + 'B3' }]} numberOfLines={1}>
                    {isArabic ? 'إنجازات' : 'Achievements'}
                  </Text>
                </View>
              </View>

              {totalGoals > 0 || totalDayTasks > 0 ? (
                <View style={[styles.monthProgressContainer, isArabic && { alignItems: 'flex-end' }]}>
                  <View style={[styles.monthProgressBarTrack, { backgroundColor: palette.ink + '1A', width: '100%' }]}>
                    <View style={[
                      styles.monthProgressBarFill,
                      {
                        width: `${totalGoals > 0 ? goalProgress * 100 : taskProgress * 100}%`,
                        backgroundColor: palette.accent,
                      }
                    ]} />
                  </View>
                  <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 2 }}>
                    <Text style={[styles.monthProgressText, { color: palette.ink }]}>
                      {totalGoals > 0 
                        ? `${Math.round(goalProgress * 100)}% ${t.goalCompleted || 'complete'}` 
                        : `${Math.round(taskProgress * 100)}% ${isArabic ? 'مهام مكتملة' : 'tasks done'}`}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: palette.ink + '99' }}>
                      {isArabic ? 'اضغط للتفاصيل' : 'Tap for details'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={{ textAlign: 'center', color: palette.ink + '99', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                  {isArabic ? 'اضغط لتحديد أهداف اليوم' : 'Tap to set daily goals'}
                </Text>
              )}
            </LivePress>
          );
        })()}

        {/* ─── Day Timeline & Schedule Section (Directly under Goals) ─── */}
        <DayTimelineSchedule
          year={year}
          month={month}
          day={day}
          selectedDateTs={selectedDateTs}
          tasks={tasks}
          checklistItems={plannerChecklistItems || []}
          bulletItems={plannerBulletItems || []}
          toggleItems={plannerToggleItems || []}
          isArabic={isArabic}
          t={t}
          onToggleTodo={(id, currentStatus) => {
            updateTodoStatus({ id, status: currentStatus === 'done' ? 'not_started' : 'done' });
          }}
          onTogglePlannerItem={(id, isCompleted) => {
            updatePlannerItemMutation({ id, isCompleted: !isCompleted });
          }}
          onDeleteTodo={(id) => {
            deleteTodoMutation({ id });
          }}
          onDeletePlannerItem={(id) => {
            deletePlannerItemMutation({ id });
          }}
          onAddTodo={async (payload) => {
            if (!userId) return;
            return await addTodoMutation({
              userId,
              ...payload,
            });
          }}
          onAddPlannerItem={async (payload) => {
            if (!userId) return;
            return await addPlannerItemMutation({
              userId,
              ...payload,
            });
          }}
          onOpenTaskDetails={(todoId) => {
            setSelectedTaskForModal(todoId);
          }}
        />

        {/* ─── Dynamic Live Day Summary Card ─── */}
        {(() => {
          const dayGoalDocs = allGoals.filter((g: any) => g.year === year && g.month === month && g.day === day);
          const dayAchievementDocs = allAchievements.filter((a: any) => a.year === year && a.month === month && a.day === day);
          
          const completedTasks = tasks.filter(t => t.status === 'done');
          const pendingTasks = tasks.filter(t => t.status !== 'done');
          const completedGoals = dayGoalDocs.filter((g: any) => g.isCompleted);

          const totalTrackedItems = tasks.length + dayGoalDocs.length;
          const totalCompleted = completedTasks.length + completedGoals.length;
          const completionPct = totalTrackedItems > 0 ? Math.round((totalCompleted / totalTrackedItems) * 100) : 0;

          return (
            <View style={[styles.monthSummaryCardNew, { marginTop: 6, marginBottom: 28 }]}>
              {/* Header with Title & Completion Rate Badge */}
              <View style={[styles.monthSummaryHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="pie-chart" size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.monthSummaryTitle}>
                    {t.daySummary || (isArabic ? 'ملخص اليوم' : 'Day Summary')}
                  </Text>
                </View>

                {totalTrackedItems > 0 && (
                  <View style={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: completionPct === 100 ? '#10B98120' : colors.primary + '18',
                    borderWidth: 1,
                    borderColor: completionPct === 100 ? '#10B981' : colors.primary + '40',
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: completionPct === 100 ? '#10B981' : colors.primary,
                    }}>
                      {completionPct}% {isArabic ? 'مكتمل' : 'Done'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Progress Bar */}
              {totalTrackedItems > 0 && (
                <View style={{ height: 6, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', marginVertical: 10 }}>
                  <View style={{
                    width: `${completionPct}%`,
                    height: '100%',
                    backgroundColor: completionPct === 100 ? '#10B981' : colors.primary,
                    borderRadius: 3,
                  }} />
                </View>
              )}

              {/* Quick Metrics Grid */}
              <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', gap: 8, marginTop: 4, marginBottom: 12 }}>
                <View style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 2 }}>
                    {completedTasks.length}/{tasks.length}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, marginTop: 1 }}>
                    {isArabic ? 'مهام منجزة' : 'Tasks Done'}
                  </Text>
                </View>

                <View style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}>
                  <Ionicons name="flag" size={18} color={colors.primary} />
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 2 }}>
                    {completedGoals.length}/{dayGoalDocs.length}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, marginTop: 1 }}>
                    {isArabic ? 'أهداف محققة' : 'Goals Met'}
                  </Text>
                </View>

                <View style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: pendingTasks.length > 0 ? '#EF444410' : colors.surface,
                  borderWidth: 1,
                  borderColor: pendingTasks.length > 0 ? '#EF444435' : colors.border,
                  alignItems: 'center',
                }}>
                  <Ionicons name={pendingTasks.length > 0 ? "alert-circle" : "sparkles"} size={18} color={pendingTasks.length > 0 ? "#EF4444" : colors.textMuted} />
                  <Text style={{ fontSize: 16, fontWeight: '900', color: pendingTasks.length > 0 ? "#EF4444" : colors.text, marginTop: 2 }}>
                    {pendingTasks.length}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: pendingTasks.length > 0 ? "#EF4444" : colors.textMuted, marginTop: 1 }}>
                    {isArabic ? 'لم تُنجز' : 'Pending'}
                  </Text>
                </View>
              </View>

              {/* ─── End of Day Review: Pending Items Section ─── */}
              {pendingTasks.length > 0 && (
                <View style={{
                  marginTop: 6,
                  marginBottom: 10,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: isDarkMode ? '#1E1B24' : '#FFF7F7',
                  borderWidth: 1,
                  borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                }}>
                  <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, isArabic && { flexDirection: 'row-reverse' }]}>
                    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, isArabic && { flexDirection: 'row-reverse' }]}>
                      <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444' }}>
                        {t.pendingItems || (isArabic ? 'عناصر قيد الانتظار ولم تنجز' : 'Pending Items')}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#EF444420' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>
                        {pendingTasks.length}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 8 }}>
                    {pendingTasks.map((item) => {
                      let timeStr: string | undefined;
                      if (item.dueDate) {
                        timeStr = new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }

                      return (
                        <LivePress
                          key={item._id}
                          style={[{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            padding: 10,
                            borderRadius: 10,
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                          }, isArabic && { flexDirection: 'row-reverse' }]}
                          onPress={() => setSelectedTaskForModal(item._id)}
                          pressScale={0.97}
                        >
                          {/* Quick Toggle Checkbox */}
                          <TouchableOpacity
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              borderWidth: 1.5,
                              borderColor: '#EF4444',
                              justifyContent: 'center',
                              alignItems: 'center',
                              backgroundColor: 'transparent',
                            }}
                            onPress={() => updateTodoStatus({ id: item._id, status: 'done' })}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' }} />
                          </TouchableOpacity>

                          {/* Text Info */}
                          <View style={{ flex: 1 }}>
                            <Text style={[{ fontSize: 13, fontWeight: '700', color: colors.text }, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
                              {item.text || (isArabic ? 'مهمة بدون عنوان' : 'Untitled Task')}
                            </Text>
                            {timeStr && (
                              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }, isArabic && { flexDirection: 'row-reverse' }]}>
                                <Ionicons name="time-outline" size={11} color={colors.primary} />
                                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                                  {timeStr}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Chevron */}
                          <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={14} color={colors.textMuted} />
                        </LivePress>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ─── Completed Items Section ─── */}
              {completedTasks.length > 0 && (
                <View style={{
                  marginTop: 6,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: isDarkMode ? '#13231B' : '#F0FDF4',
                  borderWidth: 1,
                  borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)',
                }}>
                  <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
                    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, isArabic && { flexDirection: 'row-reverse' }]}>
                      <Ionicons name="checkmark-done-circle" size={16} color="#10B981" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>
                        {t.completedItems || (isArabic ? 'العناصر المكتملة' : 'Completed Items')}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#10B98120' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>
                        {completedTasks.length}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 6 }}>
                    {completedTasks.map((item) => (
                      <LivePress
                        key={item._id}
                        style={[{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          paddingVertical: 4,
                        }, isArabic && { flexDirection: 'row-reverse' }]}
                        onPress={() => setSelectedTaskForModal(item._id)}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={[{
                          flex: 1,
                          fontSize: 12,
                          fontWeight: '600',
                          color: colors.textMuted,
                          textDecorationLine: 'line-through',
                        }, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
                          {item.text}
                        </Text>
                      </LivePress>
                    ))}
                  </View>
                </View>
              )}

              {/* Celebratory State when all tasks done */}
              {tasks.length > 0 && pendingTasks.length === 0 && (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>
                    {t.allDayTasksDone || (isArabic ? 'تم إنجاز جميع مهام اليوم بنجاح! 🎉' : 'All tasks for today are completed! 🎉')}
                  </Text>
                </View>
              )}

              {/* Empty State */}
              {tasks.length === 0 && dayGoalDocs.length === 0 && dayAchievementDocs.length === 0 && (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Ionicons name="calendar-outline" size={24} color={colors.textMuted} style={{ marginBottom: 6 }} />
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600', textAlign: 'center' }}>
                    {t.noTasksScheduledDay || (isArabic ? 'لا توجد مهام مجدولة لهذا اليوم حتى الآن.' : 'No tasks scheduled for this day yet.')}
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* ─── Modals ─── */}
        <TaskDetailModal
          visible={!!selectedTaskForModal}
          onClose={() => setSelectedTaskForModal(null)}
          todoId={selectedTaskForModal}
          initialDate={selectedDateTs || undefined}
        />

        <TimerModal 
          visible={isTimerModalVisible}
          onClose={() => { setTimerModalVisible(false); setSelectedTodoId(null); }}
          onSave={(ms, due, dt) => { if (selectedTodoId) setTimerMutation({ id: selectedTodoId, duration: ms, dueDate: due, date: dt }); }}
          initialDate={tasks.find(t => t._id === selectedTodoId)?.date}
        />

        <ProjectPickerModal
          visible={isProjectModalVisible}
          onClose={() => { setProjectModalVisible(false); setSelectedTodoId(null); }}
          onSelect={(selection) => { 
            if (!selectedTodoId) return;
            if (selection.type === 'none') {
              linkTaskMutation({ id: selectedTodoId, categoryId: undefined, subCategoryId: undefined, projectId: undefined });
            } else if (selection.type === 'category') {
              linkTaskMutation({ id: selectedTodoId, categoryId: selection.categoryId, subCategoryId: undefined, projectId: undefined });
            } else if (selection.type === 'subCategory') {
              linkTaskMutation({ id: selectedTodoId, categoryId: selection.categoryId, subCategoryId: selection.subCategoryId, projectId: undefined });
            } else if (selection.type === 'project') {
              linkTaskMutation({ id: selectedTodoId, categoryId: undefined, subCategoryId: undefined, projectId: selection.projectId });
            }
          }}
        />

        <PlannerListModal
          visible={plannerListModalVisible}
          onClose={() => setPlannerListModalVisible(false)}
          date={selectedDateTs || 0}
          listType={activePlannerListType}
          colors={colors}
          styles={styles}
          userId={userId}
          isArabic={isArabic}
          t={t}
        />

        <ActionModal 
          visible={isActionModalVisible}
          onClose={() => { setActionModalVisible(false); setSelectedItemForAction(null); }}
          title={selectedItemForAction?.text || (selectedItemForAction?.type === 'reminder' ? (isArabic ? 'تذكير' : 'Reminder') : (isArabic ? 'ملاحظة' : 'Note'))}
          isArabic={isArabic}
          options={[
            { 
              label: isArabic ? 'تعديل' : 'Edit', 
              icon: 'create-outline', 
              onPress: () => router.push({ pathname: '/note-detail', params: { id: selectedItemForAction?._id, isReminder: selectedItemForAction?.type === 'reminder' ? 'true' : 'false' } }) 
            },
            { 
              label: isArabic ? 'مشاركة' : 'Share', 
              icon: 'share-social-outline', 
              onPress: () => Share.share({ message: `${selectedItemForAction?.text || 'Untitled'}\n\n${selectedItemForAction?.description || ''}` }) 
            },
            { 
              label: isArabic ? 'حذف' : 'Delete', 
              icon: 'trash-outline', 
              variant: 'destructive',
              onPress: () => {
                if (selectedItemForAction) {
                  deleteTodoMutation({ id: selectedItemForAction._id });
                }
              }
            }
          ]}
        />
      </ScrollView>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >

      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
      <SafeAreaView style={styles.safeArea}>
        <AnimatedWavyHeader backgroundColor={colors.bg} waveHeight={10} contentStyle={{ paddingBottom: 2 }}>
          <View style={[styles.header, { paddingBottom: 4 }, isArabic && { flexDirection: 'row-reverse' }]}>
            {selectedMonth === null ? (
              <>
                <Text style={styles.headerTitle}>{t.planner}</Text>
                <View style={{ width: 44 }} />
              </>
            ) : selectedDay === null ? (
              <>
                <LivePress
                  style={styles.headerBackBtn}
                  onPress={() => setSelectedMonth(null)}
                  pressScale={0.96}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name={isArabic ? "chevron-forward" : "chevron-back"} size={20} color={colors.text} />
                  <Text style={styles.headerBackText}>{isArabic ? 'الشهور' : 'All Months'}</Text>
                </LivePress>
                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{currentYear}</Text>
                </View>
              </>
            ) : (
              <>
                <LivePress
                  style={styles.headerBackBtn}
                  onPress={handleGoBack}
                  pressScale={0.96}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name={isArabic ? "chevron-forward" : "chevron-back"} size={20} color={colors.text} />
                  <Text style={styles.headerBackText}>
                    {isFromHome ? (isArabic ? 'الرئيسية' : 'Home') : months[selectedMonth!]}
                  </Text>
                </LivePress>
                <LivePress
                  onPress={() => {
                    if (isFromHome) {
                      router.replace('/(tabs)');
                    } else {
                      resetAll();
                    }
                  }}
                  style={styles.headerActionBtn}
                  pressScale={0.96}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </LivePress>
              </>
            )}
          </View>
        </AnimatedWavyHeader>
        
        {selectedMonth === null ? (
            renderMonthGrid()
        ) : selectedDay === null ? (
            <View style={{ flex: 1 }} {...dayViewPanResponder.panHandlers}>
              {renderDayGrid(selectedMonth)}
            </View>
        ) : (
            <View style={{ flex: 1 }} {...dayViewPanResponder.panHandlers}>
              {renderSpecificDayView(selectedDay, selectedMonth, currentYear)}
            </View>
        )}
      </SafeAreaView>

      <ScreenGuide visible={showGuide} tips={plannerTips} onDismiss={dismissGuide} isArabic={isArabic} />

    </KeyboardAvoidingView>
  );
};

export default Planner;

