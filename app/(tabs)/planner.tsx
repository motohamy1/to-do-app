import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Animated, StyleSheet, BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { createPlannerStyles } from '@/assets/styles/planner.styles';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import TodoInput from '@/components/TodoInput';
import TodoCard from '@/components/TodoCard';
import TimerModal from '@/components/TimerModal';
import ProjectPickerModal from '@/components/ProjectPickerModal';
import { createHomeStyles } from '@/assets/styles/home.styles';
import { Id } from '@/convex/_generated/dataModel';

import { useTranslation } from '@/utils/i18n';

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

const Planner = () => {
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const styles = createPlannerStyles(colors, isArabic);
  const homeStyles = createHomeStyles(colors, isArabic);
  const router = useRouter();
  const months = isArabic ? months_ar : months_en;
  
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  const [expandedTodoId, setExpandedTodoId] = useState<Id<"todos"> | null>(null);
  const [isTimerModalVisible, setTimerModalVisible] = useState(false);
  const [isProjectModalVisible, setProjectModalVisible] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<Id<"todos"> | null>(null);

  const updateTodoStatus = useMutation(api.todos.updateStatus);
  const deleteTodoMutation = useMutation(api.todos.deleteTodo);
  const setTimerMutation = useMutation(api.todos.setTimer);
  const linkProjectMutation = useMutation(api.todos.linkProject);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };




  // Handle system back button
  useEffect(() => {
    const backAction = () => {
      if (selectedDay !== null) {
        setSelectedDay(null);
        return true;
      }
      if (selectedMonth !== null) {
        setSelectedMonth(null);
        return true;
      }
      return false; // let default behavior happen
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [selectedMonth, selectedDay]);

  
  const todos = useQuery(api.todos.get, userId ? { userId } : "skip") || [];

  const currentYear = new Date().getFullYear();

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getTasksForDay = (day: number, month: number, year: number) => {
    return todos.filter(todo => {
      if (!todo.date) return false;
      const todoDate = new Date(todo.date);
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
      if (!todo.date) return false;
      const todoDate = new Date(todo.date);
      return todoDate.getMonth() === monthIndex && todoDate.getFullYear() === currentYear;
    });
  };

  const renderMonthGrid = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 80 }}
    >
      <View style={[styles.monthGrid, isArabic && { flexDirection: 'row-reverse' }]}>
        {months.map((month, index) => {
          const tasks = getTasksForMonth(index);
          const isSelected = selectedMonth === index;
          return (
            <TouchableOpacity 
              key={month} 
              style={[styles.monthCard, isSelected && styles.selectedMonthCard]}
              onPress={() => setSelectedMonth(index)}
              activeOpacity={0.7}
            >
              {tasks.length > 0 && !isSelected && <View style={styles.monthIndicator} />}
              <Text style={[styles.monthName, isSelected && styles.selectedMonthName]}>
                {isArabic ? month : month.substring(0, 3)}
              </Text>
              <Text style={[styles.monthStats, isSelected && styles.selectedMonthStats]}>
                {tasks.length > 0 ? `${tasks.length} ${tasks.length === 1 ? t.task : t.tasks}` : t.empty}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderDayGrid = (monthIndex: number) => {
    const daysInMonth = getDaysInMonth(monthIndex, currentYear);
    const dayElements = [];

    for (let i = 1; i <= daysInMonth; i++) {
        const tasks = getTasksForDay(i, monthIndex, currentYear);
        const isToday = i === new Date().getDate() && 
                        monthIndex === new Date().getMonth() && 
                        currentYear === new Date().getFullYear();

        dayElements.push(
            <TouchableOpacity 
                key={i} 
                style={[
                    styles.dayCard, 
                    tasks.length > 0 && styles.hasTaskCard,
                    isToday && styles.todayCard
                ]}
                onPress={() => setSelectedDay(i)}
                activeOpacity={0.7}
            >
                {tasks.length > 0 && !isToday && <View style={styles.monthIndicator} />}
                <Text style={[
                    styles.dayText, 
                    isToday && styles.todayText
                ]}>{i}</Text>
                <Text style={[
                    styles.dayStats, 
                    isToday && styles.todayStats
                ]}>
                    {tasks.length > 0 ? `${tasks.length} ${tasks.length === 1 ? t.task : t.tasks}` : t.empty}
                </Text>
            </TouchableOpacity>
        );
    }

    return (
        <ScrollView 
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }} 
            showsVerticalScrollIndicator={false}
        >

            <View style={{ paddingHorizontal: 24, marginBottom: 32, alignItems: 'center' }}>
                <Text style={[styles.headerTitle, { fontSize: isArabic ? 34 : 38, letterSpacing: -1 }]}>{months[monthIndex]}</Text>
                <View style={{ height: 4, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 8 }} />
                <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 12, fontWeight: '700' }}>
                    {getTasksForMonth(monthIndex).length} {t.tasksThisMonth}
                </Text>
            </View>

            <View style={[styles.dayGrid, isArabic && { flexDirection: 'row-reverse' }]}>
                {isArabic ? [...dayElements].reverse() : dayElements}
            </View>
        </ScrollView>
    );
  };

  const renderSpecificDayView = (day: number, month: number, year: number) => {
    const tasks = getTasksForDay(day, month, year);
    const selectedDateTs = new Date(year, month, day).getTime();

    return (
        <ScrollView 
            ref={scrollViewRef} 
            contentContainerStyle={{ paddingBottom: 100 }} 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
        >


            <View style={[styles.specificDayHeader, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={styles.specificDayTitle}>{isArabic ? `${day} ${months[month]}` : `${day} ${months[month]}`}</Text>
                <Text style={[styles.specificDaySubtitle, isArabic && { textAlign: 'right' }]}>
                    {tasks.length === 0 ? t.startPlanning : `${tasks.length} ${t.tasksScheduled}`}
                </Text>
            </View>

            <View style={{ gap: 12 }}>
                {tasks.map(task => {
                    const isExpanded = expandedTodoId === task._id;

                    if (isExpanded) {
                      return (
                        <View key={task._id} style={{ marginBottom: 16 }}>
                          <View style={{ width: '92%', alignSelf: 'center' }}>
                            <TodoCard 
                              todo={{ ...task, status: task.status || 'not_started' }} 
                              homeStyles={homeStyles}
                              onSetTimer={(id) => { setSelectedTodoId(id as Id<"todos">); setTimerModalVisible(true); }} 
                              onLongPress={(id) => deleteTodoMutation({ id: id as Id<"todos"> })} 
                              onLinkProject={(id) => { setSelectedTodoId(id as Id<"todos">); setProjectModalVisible(true); }}
                            />
                          </View>
                          <TouchableOpacity 
                            style={{ 
                              alignSelf: 'center', 
                              marginTop: -16, 
                              backgroundColor: colors.surface, 
                              borderRadius: 20, 
                              padding: 6,
                              borderWidth: 1,
                              borderColor: colors.border,
                              zIndex: 10,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 4,
                              elevation: 3,
                            }}
                            onPress={() => setExpandedTodoId(null)}
                          >
                            <Ionicons name="chevron-up" size={20} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    return (
                        <TouchableOpacity 
                            key={task._id} 
                            style={[styles.taskItem, isArabic && { flexDirection: 'row-reverse' }]}
                            onPress={() => setExpandedTodoId(task._id)}
                            activeOpacity={0.7}
                        >
                            <TouchableOpacity 
                                onPress={() => updateTodoStatus({ 
                                    id: task._id, 
                                    status: task.status === 'done' ? 'not_started' : 'done' 
                                })}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons 
                                    name={task.status === 'done' ? "checkmark-circle" : "ellipse-outline"} 
                                    size={24} 
                                    color={task.status === 'done' ? colors.success : colors.border} 
                                />
                            </TouchableOpacity>
                            <View style={{ flex: 1, marginHorizontal: 12 }}>
                                <Text style={[
                                    styles.taskItemText, 
                                    task.status === 'done' && { textDecorationLine: 'line-through', color: colors.textMuted, opacity: 0.6 },
                                    isArabic && { textAlign: 'right' }
                                ]}>
                                    {task.text}
                                </Text>
                                {task.status !== 'done' && task.status && (
                                    <Text style={[{ fontSize: 11, color: colors.textMuted, textTransform: 'capitalize', marginTop: 2 }, isArabic && { textAlign: 'right' }]}>
                                        {isArabic ? (t as any)[task.status] || task.status : task.status.replace('_', ' ')}
                                    </Text>
                                )}
                            </View>
                            <Ionicons name="create-outline" size={18} color={colors.textMuted} style={{ opacity: 0.5 }} />
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={[styles.addDayTaskContainer, { marginBottom: 40 }]}>
                <TodoInput initialDate={selectedDateTs} onFocus={scrollToBottom} />
            </View>


            <TimerModal 
                visible={isTimerModalVisible}
                onClose={() => { setTimerModalVisible(false); setSelectedTodoId(null); }}
                onSave={(ms, due, dt) => { if (selectedTodoId) setTimerMutation({ id: selectedTodoId, duration: ms, dueDate: due, date: dt }); }}
                initialDate={tasks.find(t => t._id === selectedTodoId)?.date}
            />

            <ProjectPickerModal
                visible={isProjectModalVisible}
                onClose={() => { setProjectModalVisible(false); setSelectedTodoId(null); }}
                onSelect={(id) => { if (selectedTodoId) linkProjectMutation({ id: selectedTodoId, projectId: id }); }}
            />
        </ScrollView>
    );
  };


  return (
    <KeyboardAvoidingView
      style={[styles.container, isArabic && { direction: 'rtl' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >

      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.headerTitle}>{t.planner}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {(selectedMonth !== null || selectedDay !== null) && (
                <TouchableOpacity onPress={resetAll}>
                  <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>
        </View>
        
        {selectedMonth === null ? (
            renderMonthGrid()
        ) : selectedDay === null ? (
            renderDayGrid(selectedMonth)
        ) : (
            renderSpecificDayView(selectedDay, selectedMonth, currentYear)
        )}
      </SafeAreaView>

      {/* Floating Action Button for detailed Reminder */}
      <TouchableOpacity 
        style={[homeStyles.fab, isArabic && homeStyles.fabRtl]}
        onPress={() => router.push('/add-reminder')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#000000" />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

export default Planner;

