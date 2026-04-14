import { createHomeStyles } from "@/assets/styles/home.styles";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from '@expo/vector-icons';
import { useOfflineQuery } from "@/hooks/useOfflineQuery";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import React, { useState, useMemo, useRef } from 'react';

import { StatusBar, View, Text, ScrollView, FlatList, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from "../../convex/_generated/api";
import { Id } from '../../convex/_generated/dataModel';
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import TodoCard from "@/components/TodoCard";
import FloatingActionButton from "@/components/FloatingActionButton";
import TaskDetailModal from "@/components/TaskDetailModal";
import TimerModal from "@/components/TimerModal";
import ProjectPickerModal from "@/components/ProjectPickerModal";
import ActionModal from "@/components/ActionModal";
import CircularProgress from "@/components/CircularProgress";
import { useAuth } from "@/hooks/useAuth";
import { useScreenGuide } from "@/hooks/useScreenGuide";
import ScreenGuide from "@/components/ScreenGuide";
import type { GuideTip } from "@/components/ScreenGuide";
import { useTaskTimers } from "@/hooks/useTaskTimers";
import { useDailyReminders } from "@/hooks/useDailyReminders";

import { useTranslation } from "@/utils/i18n";

const Index = () => {
    const { userId, language } = useAuth();
    const { t, isArabic } = useTranslation(language);
    const todos = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : "skip");
    const deleteTodo = useOfflineMutation(api.todos.deleteTodo, "todos:deleteTodo");
    const router = useRouter();
    const setTimerMutation = useOfflineMutation(api.todos.setTimer, "todos:setTimer");
    const linkProject = useOfflineMutation(api.todos.linkProject, "todos:linkProject");
    const updateTodo = useOfflineMutation(api.todos.updateTodo, "todos:updateTodo");
    const updateStatus = useOfflineMutation(api.todos.updateStatus, "todos:updateStatus");
    const { colors, isDarkMode } = useTheme();

    const [isTimerModalVisible, setTimerModalVisible] = useState(false);
    const [isProjectModalVisible, setProjectModalVisible] = useState(false);
    const [selectedTodoId, setSelectedTodoId] = useState<Id<"todos"> | null>(null);
    const [activeFilter, setActiveFilter] = useState<'All' | 'In Progress' | 'Done' | 'Not Done'>('All');
    
    const [isGlobalActionModalVisible, setGlobalActionModalVisible] = useState(false);
    const [showOverdue, setShowOverdue] = useState(true);
    const [sortActive, setSortActive] = useState('');
    const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const homeStyles = createHomeStyles(colors, isArabic);
    const { showGuide, dismissGuide } = useScreenGuide('home');
    useTaskTimers(todos, updateStatus);
    useDailyReminders(todos, language);

    const homeTips: GuideTip[] = isArabic ? [
      { icon: 'add-circle-outline', title: 'أضف مهمة', description: 'اكتب مهمتك في الحقل بالأسفل واضغط إرسال لإضافتها.', accentColor: '#D4F82D' },
      { icon: 'timer-outline', title: 'مؤقت ذكي', description: 'اضغط على أيقونة الساعة لتحديد مدة المهمة وموعدها.', accentColor: '#00E096' },
      { icon: 'hand-left-outline', title: 'اضغط مطولاً', description: 'اضغط مطولاً على أي مهمة لحذفها أو مشاركتها أو ربطها بمشروع.', accentColor: '#5CB2FF' },
    ] : [
      { icon: 'add-circle-outline', title: 'Add a Task', description: 'Type your task in the input field below and hit send to add it.', accentColor: '#D4F82D' },
      { icon: 'timer-outline', title: 'Smart Timer', description: 'Tap the clock icon on any task to set a duration and due date.', accentColor: '#00E096' },
      { icon: 'hand-left-outline', title: 'Long Press', description: 'Long press any task to delete, share, or link it to a project.', accentColor: '#5CB2FF' },
    ];



    const normalizedTodos = todos?.filter(t => t.type !== 'note' && t.type !== 'reminder').map(t => ({

      ...t,
      status: t.status || ((t as any).isCompleted ? 'done' : 'not_started')
    })) || [];

    const { todayTodos, todayNotDone, overdueTodos, overdueByDay, groupedDoneTodos, todayDoneForProgress, todayAllForProgress } = useMemo(() => {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const tomorrowStart = todayStart + 86400000;
      
      const today: any[] = [];
      const todayNotDoneList: any[] = [];
      const overdue: any[] = [];

      const groupedDoneDayMap = new Map<number, any[]>();

      // Track ALL today-scoped tasks for progress (including done ones)
      let todayDoneCount = 0;
      let todayTotalCount = 0;

      normalizedTodos.forEach(t => {
        const isScheduledForToday = !t.date || (t.date >= todayStart && t.date < tomorrowStart);

        if (t.status === 'done') {
          const completionDay = t.completedAt 
            ? new Date(t.completedAt).setHours(0, 0, 0, 0)
            : (t.date ? new Date(t.date).setHours(0, 0, 0, 0) : todayStart);
          if (!groupedDoneDayMap.has(completionDay)) groupedDoneDayMap.set(completionDay, []);
          groupedDoneDayMap.get(completionDay)!.push(t);
          // Count done tasks that belong to today for progress tracking
          if (isScheduledForToday || (t.completedAt && t.completedAt >= todayStart && t.completedAt < tomorrowStart)) {
            todayDoneCount++;
            todayTotalCount++;
          }
        } else if (t.status === 'not_done' && isScheduledForToday) {
          // Separate not_done tasks into their own list
          todayNotDoneList.push(t);
          todayTotalCount++;
        } else {
          if (isScheduledForToday) {
            today.push(t);
            todayTotalCount++;
          } else if (t.date !== undefined && t.date < todayStart) {
            overdue.push(t);
          }
        }
      });

      const groupedDoneTodos = Array.from(groupedDoneDayMap.entries())
        .sort(([a], [b]) => b - a)
        .map(([dayTimestamp, tasks]) => ({ dayTimestamp, tasks }));
      
      // Default sort: priority descending, then creation time ascending (oldest first)
      const pScores: any = { 'Urgent': 3, 'High': 2, 'Medium': 1, 'Low': 0, undefined: -1 };
      if (sortActive === 'date') {
        today.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
      } else {
        // Always sort by priority first, then by creation time (oldest first)
        today.sort((a, b) => {
          const pDiff = (pScores[b.priority] ?? -1) - (pScores[a.priority] ?? -1);
          if (pDiff !== 0) return pDiff;
          return (a._creationTime || 0) - (b._creationTime || 0); // oldest first
        });
      }

      // Sort not_done the same way
      todayNotDoneList.sort((a, b) => {
        const pDiff = (pScores[b.priority] ?? -1) - (pScores[a.priority] ?? -1);
        if (pDiff !== 0) return pDiff;
        return (a._creationTime || 0) - (b._creationTime || 0);
      });

      // Sort overdue by date descending (latest first)
      overdue.sort((a, b) => (b.date || 0) - (a.date || 0));

      // Group overdue tasks by day (descending from latest to oldest)
      const dayMap = new Map<number, any[]>();
      overdue.forEach(t => {
        const dayStart = new Date(t.date).setHours(0, 0, 0, 0);
        if (!dayMap.has(dayStart)) dayMap.set(dayStart, []);
        dayMap.get(dayStart)!.push(t);
      });
      const grouped = Array.from(dayMap.entries())
        .sort(([a], [b]) => b - a)
        .map(([dayTimestamp, tasks]) => ({ dayTimestamp, tasks }));

      return { 
        todayTodos: today, 
        todayNotDone: todayNotDoneList, 
        overdueTodos: overdue, 
        overdueByDay: grouped, 
        groupedDoneTodos,
        todayDoneForProgress: todayDoneCount,
        todayAllForProgress: todayTotalCount
      };
    }, [normalizedTodos, sortActive]);
    const inProgressCount = todayTodos.filter(t => t.status === 'in_progress').length;
    const totalCount = todayTodos.filter(t => t.status !== 'done' && t.status !== 'in_progress').length;
    
    const totalDoneCount = groupedDoneTodos.reduce((sum, group) => sum + group.tasks.length, 0);

    // Progress uses ALL today-scoped tasks (done + active + not_done) so adding new tasks
    // doesn't reset the percentage — it properly recalculates with the full picture
    const progressPercent = todayAllForProgress === 0 ? 0 : Math.round((todayDoneForProgress / todayAllForProgress) * 100);

    const handleOpenTimerModal = (id: Id<"todos">) => {
      setSelectedTodoId(id);
      setTimerModalVisible(true);
    };

    const handleSaveTimer = (durationInMs: number, dueDate?: number, date?: number) => {
      if (selectedTodoId) {
        setTimerMutation({ id: selectedTodoId, duration: durationInMs, dueDate, date });
      }
    };

    const handleOpenProjectModal = (id: Id<"todos">) => {
      setSelectedTodoId(id);
      setProjectModalVisible(true);
    };

    const handleSelectProject = (projectId: string | undefined) => {
      if (selectedTodoId) {
        linkProject({ id: selectedTodoId, projectId });
      }
    };

    const displayedTodos = useMemo(() => {
        if (activeFilter === 'All') return todayTodos.filter(t => t.status !== 'done' && t.status !== 'in_progress');
        if (activeFilter === 'In Progress') return todayTodos.filter(t => t.status === 'in_progress');
        if (activeFilter === 'Done' || activeFilter === 'Not Done') return [];
        return todayTodos;
    }, [todayTodos, activeFilter]);

    const displayedOverdue = useMemo(() => {
        if (activeFilter !== 'Not Done') return [];
        return overdueTodos;
    }, [overdueTodos, activeFilter]);

    return (
        <KeyboardAvoidingView 
            style={homeStyles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >

            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
            <SafeAreaView style={homeStyles.safeArea} edges={['top']}>
                <Header />
                {todos === undefined ? (
                   <View style={homeStyles.loadingContainer}>
                     <ActivityIndicator size="large" color={colors.primary} />
                   </View>
                ) : (
                   <ScrollView 
                     ref={scrollViewRef}
                     contentContainerStyle={homeStyles.scrollContent} 
                     showsVerticalScrollIndicator={false} 
                     keyboardShouldPersistTaps="handled"
                   >

                      
                      {/* Today's Plan Card */}
                       <View style={[homeStyles.todaysPlanCard, isArabic && { flexDirection: 'row-reverse' }]}>
                           <View style={isArabic && { alignItems: 'flex-end' }}>
                               <Text style={homeStyles.todaysPlanTitle}>{t.todaysPlan}</Text>
                               <Text style={homeStyles.todaysPlanSubtitle}>{todayDoneForProgress}/{todayAllForProgress} {t.tasksCompleted}</Text>
                           </View>
                           <CircularProgress 
                               size={64} 
                               strokeWidth={6} 
                               progress={progressPercent} 
                              color="#000000" 
                              unfilledColor="rgba(0,0,0,0.1)"
                          >
                              <Text style={{ fontSize: 16, fontWeight: "800", color: "#000000" }}>{progressPercent}%</Text>
                          </CircularProgress>
                      </View>

                      {/* Filter Pills */}
                      <View style={[homeStyles.pillsContainer, isArabic && { flexDirection: 'row-reverse' }]}>
                          {(['All', 'In Progress', 'Done', 'Not Done'] as const).map(filter => {
                              const isActive = activeFilter === filter;
                              let count = 0;
                              if (filter === 'All') count = totalCount;
                              if (filter === 'In Progress') count = inProgressCount;
                              if (filter === 'Done') count = totalDoneCount;
                              if (filter === 'Not Done') count = todayNotDone.length + overdueTodos.length;

                              const filterLabel = filter === 'All' ? (isArabic ? 'المهام' : 'To-Do') : 
                                                filter === 'In Progress' ? t.inProgress : 
                                                filter === 'Done' ? t.done : 
                                                (isArabic ? 'لم تُنجز' : 'Not Done');

                              return (
                                  <TouchableOpacity 
                                      key={filter} 
                                      style={[homeStyles.pill, isActive ? homeStyles.pillActive : homeStyles.pillInactive]}
                                      onPress={() => setActiveFilter(filter)}
                                  >
                                      <Text style={[homeStyles.pillText, { color: isActive ? colors.primary : colors.textMuted }]}>
                                          {filterLabel}
                                      </Text>
                                      <Text style={[homeStyles.pillSubText, { color: isActive ? colors.primary + 'CC' : colors.textMuted }]}>
                                          {count} {count === 1 ? t.task : t.tasks}
                                      </Text>
                                  </TouchableOpacity>
                              );
                          })}
                      </View>

                       {/* Today's Tasks List */}
                       {activeFilter !== 'Done' && activeFilter !== 'Not Done' && (
                         <View style={[homeStyles.sectionTitleContainer, isArabic && { flexDirection: 'row-reverse' }]}>
                             <Text style={homeStyles.sectionTitleText}>{t.tasksForToday}</Text>
                              <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 25 }}>
                                  <FloatingActionButton 
                                      onPress={() => setIsTaskModalVisible(true)} 
                                      style={homeStyles.fab}
                                  />
                                  <TouchableOpacity onPress={() => setGlobalActionModalVisible(true)}>
                                      <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
                                  </TouchableOpacity>
                              </View>
                          </View>
                       )}

                       {activeFilter === 'All' && todayTodos.length === 0 && (
                         <View style={homeStyles.emptyContainer}>
                            <Ionicons name="clipboard-outline" size={48} color={colors.border} />
                            <Text style={homeStyles.emptyText}>{t.noTasksFound}</Text>
                         </View>
                       )}

                       {activeFilter === 'In Progress' && displayedTodos.length === 0 && (
                         <View style={homeStyles.emptyContainer}>
                            <Ionicons name="clipboard-outline" size={48} color={colors.border} />
                            <Text style={homeStyles.emptyText}>{t.noTasksFound}</Text>
                         </View>
                       )}

                       {activeFilter === 'Done' && totalDoneCount === 0 && (
                         <View style={homeStyles.emptyContainer}>
                            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.border} />
                            <Text style={homeStyles.emptyText}>{t.noTasksFound}</Text>
                         </View>
                       )}

                       {activeFilter === 'Not Done' && todayNotDone.length === 0 && overdueTodos.length === 0 && (
                         <View style={homeStyles.emptyContainer}>
                            <Ionicons name="close-circle-outline" size={48} color={colors.border} />
                            <Text style={homeStyles.emptyText}>{t.noTasksFound}</Text>
                         </View>
                       )}

                       {activeFilter !== 'Done' && activeFilter !== 'Not Done' && displayedTodos.filter(t => t.status !== 'done').map(todo => (
                           <TodoCard 
                               key={todo._id} 
                               todo={todo} 
                               onSetTimer={handleOpenTimerModal}
                               onLinkProject={handleOpenProjectModal}
                               homeStyles={homeStyles}
                               isTimelineMode={true}
                           />
                       ))}

                       {/* Not Done Tasks (today) - separate section */}
                       {activeFilter === 'Not Done' && todayNotDone.length > 0 && (
                            <View style={{ marginTop: 24 }}>
                                <View style={[homeStyles.sectionTitleContainer, isArabic && { flexDirection: 'row-reverse' }]}>
                                    <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={[homeStyles.sectionTitleText, { color: colors.danger }]}>{isArabic ? 'اليوم' : 'Today'}</Text>
                                        <View style={{ backgroundColor: colors.danger + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.danger }}>{todayNotDone.length}</Text>
                                        </View>
                                    </View>
                                </View>
                                {todayNotDone.map(todo => (
                                    <TodoCard 
                                        key={todo._id} 
                                        todo={todo} 
                                        onSetTimer={handleOpenTimerModal}
                                        onLinkProject={handleOpenProjectModal}
                                        homeStyles={homeStyles}
                                        isTimelineMode={true}
                                    />
                                ))}
                            </View>
                        )}


                       {activeFilter === 'Done' && groupedDoneTodos.map(({ dayTimestamp, tasks }) => {
                         const dayLabel = new Date(dayTimestamp).toLocaleDateString(
                           isArabic ? 'ar-SA' : 'en-US',
                           { weekday: 'long', month: 'short', day: 'numeric' }
                         );
                         return (
                           <View key={dayTimestamp} style={{ marginTop: 16 }}>
                               <View style={homeStyles.sectionTitleContainer}>
                                   <Text style={[homeStyles.sectionTitleText, { fontSize: 14, color: colors.textMuted }]}>{dayLabel}</Text>
                               </View>
                               <FlatList
                                 horizontal
                                 showsHorizontalScrollIndicator={false}
                                 data={tasks}
                                 keyExtractor={(item) => item._id}
                                 contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
                                 renderItem={({ item }) => (
                                   <View style={{ width: 320 }}>
                                     <TodoCard 
                                         todo={item} 
                                         onSetTimer={handleOpenTimerModal}
                                         onLinkProject={handleOpenProjectModal}
                                         homeStyles={homeStyles}
                                         isTimelineMode={false}
                                     />
                                   </View>
                                 )}
                               />
                           </View>
                         );
                       })}
                       

                       {/* Not Done Tasks (Overdue) */}
                       {displayedOverdue.length > 0 && (
                         <View style={{ marginBottom: 16 }}>
                           <TouchableOpacity 
                             style={[homeStyles.sectionTitleContainer, isArabic && { flexDirection: 'row-reverse' }, { marginBottom: 8 }]}
                             onPress={() => setShowOverdue(!showOverdue)}
                           >
                             <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                               <Text style={[homeStyles.sectionTitleText, { color: colors.danger }]}>{isArabic ? 'سابقاً' : 'Previous'}</Text>
                               <View style={{ backgroundColor: colors.danger + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                                 <Text style={{ fontSize: 12, fontWeight: '800', color: colors.danger }}>{displayedOverdue.length}</Text>
                               </View>
                             </View>
                             <Ionicons 
                               name={showOverdue ? 'chevron-down' : (isArabic ? 'chevron-back' : 'chevron-forward')} 
                               size={20} 
                               color={colors.textMuted} 
                             />
                           </TouchableOpacity>
                           
                           {showOverdue && overdueByDay.map(({ dayTimestamp, tasks: dayTasks }) => {
                             const filteredDayTasks = activeFilter === 'Done' ? dayTasks.filter(t => t.status === 'done')
                               : activeFilter === 'In Progress' ? dayTasks.filter(t => t.status === 'in_progress')
                               : activeFilter === 'All' ? dayTasks.filter(t => t.status !== 'done' && t.status !== 'in_progress')
                               : dayTasks;
                             if (filteredDayTasks.length === 0) return null;

                             const dayLabel = new Date(dayTimestamp).toLocaleDateString(
                               isArabic ? 'ar-SA' : 'en-US',
                               { weekday: 'short', month: 'short', day: 'numeric' }
                             );

                             return (
                               <View key={dayTimestamp} style={{ marginBottom: 12 }}>
                                 <View style={[{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 24 }]}>
                                   <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                                   <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{dayLabel}</Text>
                                 </View>
                                 {filteredDayTasks.map(todo => (
                                     <TodoCard 
                                         key={todo._id} 
                                         todo={todo} 
                                         onSetTimer={handleOpenTimerModal}
                                         onLinkProject={handleOpenProjectModal}
                                         homeStyles={homeStyles}
                                         isTimelineMode={true}
                                     />
                                 ))}
                               </View>
                             );
                           })}
                         </View>
                       )}

                   </ScrollView>
                )}

                <TaskDetailModal 
                    visible={isTaskModalVisible}
                    onClose={() => setIsTaskModalVisible(false)}
                    todoId={null}
                    initialDate={Date.now()}
                />
            </SafeAreaView>

            <TimerModal 
              visible={isTimerModalVisible}
              onClose={() => {
                setTimerModalVisible(false);
                setSelectedTodoId(null);
              }}
              onSave={handleSaveTimer}
              initialDate={todos?.find(t => t._id === selectedTodoId)?.date}
            />

            <ProjectPickerModal
              visible={isProjectModalVisible}
              onClose={() => {
                setProjectModalVisible(false);
                setSelectedTodoId(null);
              }}
              onSelect={handleSelectProject}
            />

            <ActionModal 
              visible={isGlobalActionModalVisible}
              onClose={() => setGlobalActionModalVisible(false)}
              title={isArabic ? 'خيارات القائمة' : 'List Options'}
              isArabic={isArabic}
              options={[
                {
                  label: t.sortByPriority,
                  icon: 'star-outline',
                  onPress: () => setSortActive('priority')
                },
                {
                  label: t.sortByDueDate,
                  icon: 'calendar-outline',
                  onPress: () => setSortActive('date')
                },
                {
                  label: t.markAllDone,
                  icon: 'checkmark-done-outline',
                  onPress: () => {
                    displayedTodos.forEach(t => updateStatus({ id: t._id, status: 'done' }));
                  }
                },
                {
                  label: t.clearCompleted,
                  icon: 'trash-outline',
                  variant: 'destructive',
                  onPress: () => {
                    todayTodos.filter(t => t.status === 'done').forEach(t => deleteTodo({ id: t._id }));
                  }
                }
              ]}
            />

            <ScreenGuide visible={showGuide} tips={homeTips} onDismiss={dismissGuide} isArabic={isArabic} />
        </KeyboardAvoidingView>
    );
};

export default Index;
