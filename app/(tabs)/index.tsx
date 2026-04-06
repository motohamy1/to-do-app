import { createHomeStyles } from "@/assets/styles/home.styles";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from '@expo/vector-icons';
import { useOfflineQuery } from "@/hooks/useOfflineQuery";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import React, { useState, useMemo, useRef } from 'react';

import { StatusBar, View, Text, ScrollView, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from "../../convex/_generated/api";
import { Id } from '../../convex/_generated/dataModel';
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import TodoInput from "@/components/TodoInput";
import TodoCard from "@/components/TodoCard";
import TimerModal from "@/components/TimerModal";
import ProjectPickerModal from "@/components/ProjectPickerModal";
import ActionModal from "@/components/ActionModal";
import CircularProgress from "@/components/CircularProgress";
import { useAuth } from "@/hooks/useAuth";
import { useScreenGuide } from "@/hooks/useScreenGuide";
import ScreenGuide from "@/components/ScreenGuide";
import type { GuideTip } from "@/components/ScreenGuide";

import { useTranslation } from "@/utils/i18n";

const index = () => {
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
    const [activeFilter, setActiveFilter] = useState<'All' | 'In Progress' | 'Done'>('All');
    
    const [isActionModalVisible, setActionModalVisible] = useState(false);
    const [selectedTodoForAction, setSelectedTodoForAction] = useState<any>(null);

    const [isGlobalActionModalVisible, setGlobalActionModalVisible] = useState(false);
    const [showOverdue, setShowOverdue] = useState(false);
    const [sortActive, setSortActive] = useState('');

    const scrollViewRef = useRef<ScrollView>(null);
    const homeStyles = createHomeStyles(colors, isArabic);
    const { showGuide, dismissGuide } = useScreenGuide('home');

    const homeTips: GuideTip[] = isArabic ? [
      { icon: 'add-circle-outline', title: 'أضف مهمة', description: 'اكتب مهمتك في الحقل بالأسفل واضغط إرسال لإضافتها.', accentColor: '#D4F82D' },
      { icon: 'timer-outline', title: 'مؤقت ذكي', description: 'اضغط على أيقونة الساعة لتحديد مدة المهمة وموعدها.', accentColor: '#00E096' },
      { icon: 'hand-left-outline', title: 'اضغط مطولاً', description: 'اضغط مطولاً على أي مهمة لحذفها أو مشاركتها أو ربطها بمشروع.', accentColor: '#5CB2FF' },
    ] : [
      { icon: 'add-circle-outline', title: 'Add a Task', description: 'Type your task in the input field below and hit send to add it.', accentColor: '#D4F82D' },
      { icon: 'timer-outline', title: 'Smart Timer', description: 'Tap the clock icon on any task to set a duration and due date.', accentColor: '#00E096' },
      { icon: 'hand-left-outline', title: 'Long Press', description: 'Long press any task to delete, share, or link it to a project.', accentColor: '#5CB2FF' },
    ];

    const scrollToBottom = () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    };


    const normalizedTodos = todos?.filter(t => t.type !== 'note' && t.type !== 'reminder').map(t => ({

      ...t,
      status: t.status || ((t as any).isCompleted ? 'done' : 'not_started')
    })) || [];

    const { todayTodos, overdueTodos } = useMemo(() => {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const tomorrowStart = todayStart + 86400000;
      
      const today: any[] = [];
      const overdue: any[] = [];

      normalizedTodos.forEach(t => {
        if (t.status === 'done' && t.date !== undefined && (t.date < todayStart || t.date >= tomorrowStart)) return;
        
        if (t.date !== undefined && t.date < todayStart && t.status !== 'done') {
          overdue.push(t);
        } else if (!t.date || (t.date >= todayStart && t.date < tomorrowStart)) {
          today.push(t);
        }
      });
      
      if (sortActive === 'priority') {
        const pScores: any = { 'Urgent': 3, 'High': 2, 'Medium': 1, 'Low': 0, undefined: -1 };
        today.sort((a, b) => (pScores[b.priority] || -1) - (pScores[a.priority] || -1));
      } else if (sortActive === 'date') {
        today.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
      }

      return { todayTodos: today, overdueTodos: overdue };
    }, [normalizedTodos, sortActive]);
    const doneTodosCount = todayTodos.filter(t => t.status === 'done').length;
    const inProgressCount = todayTodos.filter(t => t.status === 'in_progress' || t.status === 'paused').length;
    const totalCount = todayTodos.length;

    const progressPercent = totalCount === 0 ? 0 : Math.round((doneTodosCount / totalCount) * 100);

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

    const handleSelectProject = (projectId: string) => {
      if (selectedTodoId) {
        linkProject({ id: selectedTodoId, projectId });
      }
    };

    const displayedTodos = useMemo(() => {
        if (activeFilter === 'Done') return todayTodos.filter(t => t.status === 'done');
        if (activeFilter === 'In Progress') return todayTodos.filter(t => t.status === 'in_progress' || t.status === 'paused');
        return todayTodos;
    }, [todayTodos, activeFilter]);

    const displayedOverdue = useMemo(() => {
        if (activeFilter === 'Done') return overdueTodos.filter(t => t.status === 'done');
        if (activeFilter === 'In Progress') return overdueTodos.filter(t => t.status === 'in_progress' || t.status === 'paused');
        return overdueTodos;
    }, [overdueTodos, activeFilter]);

    return (
        <KeyboardAvoidingView 
            style={[homeStyles.container, isArabic && { direction: 'rtl' }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -110}
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
                              <Text style={homeStyles.todaysPlanSubtitle}>{doneTodosCount}/{totalCount} {t.tasksCompleted}</Text>
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
                      <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={[homeStyles.pillsContainer, isArabic && { flexDirection: 'row-reverse' }]}
                      >
                          {(['All', 'In Progress', 'Done'] as const).map(filter => {
                              const isActive = activeFilter === filter;
                              let count = 0;
                              if (filter === 'All') count = totalCount;
                              if (filter === 'In Progress') count = inProgressCount;
                              if (filter === 'Done') count = doneTodosCount;

                              const filterLabel = filter === 'All' ? t.all : 
                                                filter === 'In Progress' ? t.inProgress : t.done;

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
                      </ScrollView>

                      {/* Tasks List */}
                      <View style={[homeStyles.sectionTitleContainer, isArabic && { flexDirection: 'row-reverse' }]}>
                          <Text style={homeStyles.sectionTitleText}>{t.tasksForToday}</Text>
                          <TouchableOpacity onPress={() => setGlobalActionModalVisible(true)}>
                              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
                          </TouchableOpacity>
                      </View>

                      {displayedTodos.length === 0 && displayedOverdue.length === 0 && (
                        <View style={homeStyles.emptyContainer}>
                           <Ionicons name="clipboard-outline" size={48} color={colors.border} />
                           <Text style={homeStyles.emptyText}>{t.noTasksFound}</Text>
                        </View>
                      )}

                      {displayedTodos.map(todo => (
                          <TodoCard 
                              key={todo._id} 
                              todo={todo} 
                              onSetTimer={handleOpenTimerModal}
                              onLongPress={(id) => {
                                  setSelectedTodoForAction(todo);
                                  setActionModalVisible(true);
                              }}
                              onLinkProject={handleOpenProjectModal}
                              homeStyles={homeStyles}
                              isTimelineMode={true}
                          />
                      ))}
                      
                      {activeFilter === 'All' && (
                          <View style={{ marginTop: 24, marginBottom: 24 }}>
                              <TodoInput onFocus={scrollToBottom} />
                          </View>
                      )}
                      
                      {displayedOverdue.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                          <TouchableOpacity 
                            style={[homeStyles.sectionTitleContainer, isArabic && { flexDirection: 'row-reverse' }, { marginBottom: 8 }]}
                            onPress={() => setShowOverdue(!showOverdue)}
                          >
                            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={[homeStyles.sectionTitleText, { color: colors.warning }]}>{t.overdueTasks}</Text>
                              <View style={{ backgroundColor: colors.warning + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning }}>{displayedOverdue.length}</Text>
                              </View>
                            </View>
                            <Ionicons 
                              name={showOverdue ? 'chevron-down' : (isArabic ? 'chevron-back' : 'chevron-forward')} 
                              size={20} 
                              color={colors.textMuted} 
                            />
                          </TouchableOpacity>
                          
                          {showOverdue && displayedOverdue.map(todo => (
                            <TodoCard 
                                key={todo._id} 
                                todo={todo} 
                                onSetTimer={handleOpenTimerModal}
                                onLongPress={(id) => {
                                    setSelectedTodoForAction(todo);
                                    setActionModalVisible(true);
                                }}
                                onLinkProject={handleOpenProjectModal}
                                homeStyles={homeStyles}
                                isTimelineMode={true}
                            />
                          ))}
                        </View>
                      )}

                   </ScrollView>
                )}
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
              visible={isActionModalVisible}
              onClose={() => { setActionModalVisible(false); setSelectedTodoForAction(null); }}
              title={selectedTodoForAction?.text || (isArabic ? 'خيارات المهمة' : 'Task Options')}
              isArabic={isArabic}
              options={[
                { 
                  label: isArabic ? 'تعديل التفاصيل' : 'Edit Details', 
                  icon: 'create-outline', 
                  onPress: () => {
                    // This could open the timer modal or a new detail modal
                    // For now, let's allow editing using existing modals if applicable
                    handleOpenTimerModal(selectedTodoForAction?._id);
                  } 
                },
                {
                  label: isArabic ? 'ربط بمشروع' : 'Link Project',
                  icon: 'folder-outline',
                  onPress: () => handleOpenProjectModal(selectedTodoForAction?._id)
                },
                { 
                  label: isArabic ? 'مشاركة' : 'Share', 
                  icon: 'share-social-outline', 
                  onPress: () => Share.share({ message: `${selectedTodoForAction?.text || 'Untitled'}\n\n${selectedTodoForAction?.description || ''}` }) 
                },
                { 
                  label: isArabic ? 'حذف' : 'Delete', 
                  icon: 'trash-outline', 
                  variant: 'destructive',
                  onPress: () => {
                    if (selectedTodoForAction?._id) {
                      deleteTodo({ id: selectedTodoForAction._id });
                    }
                  }
                }
              ]}
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

export default index;
