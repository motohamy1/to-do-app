import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Animated, StyleSheet, BackHandler } from 'react-native';
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

const months = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

const Planner = () => {
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const styles = createPlannerStyles(colors);
  const homeStyles = createHomeStyles(colors);
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

  // Animated toggle
  const toggleAnim = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: isDarkMode ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isDarkMode]);

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
  const pillTranslate = toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const trackBg = toggleAnim.interpolate({ inputRange: [0, 1], outputRange: ['#E2E8F0', '#1E2130'] });
  
  const { userId } = useAuth();
  const todos = useQuery(api.todos.get, userId ? { userId } : "skip") || [];

  const currentYear = new Date().getFullYear();

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getTasksForDay = (day: number, month: number, year: number) => {
    return todos.filter(todo => {
      if (!todo.date) return false;
      const todoDate = new Date(todo.date);
      // Ensure we compare day, month, and year correctly
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
      <View style={styles.monthGrid}>
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
                {month.substring(0, 3)}
              </Text>
              <Text style={[styles.monthStats, isSelected && styles.selectedMonthStats]}>
                {tasks.length > 0 ? `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}` : 'Empty'}
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
                    {tasks.length > 0 ? `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}` : 'Empty'}
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
                <Text style={[styles.headerTitle, { fontSize: 38, letterSpacing: -1 }]}>{months[monthIndex]}</Text>
                <View style={{ height: 4, width: 40, backgroundColor: colors.primary, borderRadius: 2, marginTop: 8 }} />
                <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 12, fontWeight: '700' }}>
                    {getTasksForMonth(monthIndex).length} tasks this month
                </Text>
            </View>

            <View style={styles.dayGrid}>
                {dayElements}
            </View>
        </ScrollView>
    );
  };

  const renderSpecificDayView = (day: number, month: number, year: number) => {
    const tasks = getTasksForDay(day, month, year);
    const selectedDateTs = new Date(year, month, day).getTime();

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            <View style={styles.specificDayHeader}>
                <Text style={styles.specificDayTitle}>{day} {months[month]}</Text>
                <Text style={styles.specificDaySubtitle}>
                    {tasks.length === 0 ? 'No tasks for today. Start planning!' : `${tasks.length} tasks scheduled`}
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
                            style={styles.taskItem}
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
                            <View style={{ flex: 1 }}>
                                <Text style={[
                                    styles.taskItemText, 
                                    task.status === 'done' && { textDecorationLine: 'line-through', color: colors.textMuted, opacity: 0.6 }
                                ]}>
                                    {task.text}
                                </Text>
                                {task.status !== 'done' && task.status && (
                                    <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'capitalize', marginTop: 2 }}>
                                        {task.status.replace('_', ' ')}
                                    </Text>
                                )}
                            </View>
                            <Ionicons name="create-outline" size={18} color={colors.textMuted} style={{ opacity: 0.5 }} />
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.addDayTaskContainer}>
                <TodoInput initialDate={selectedDateTs} />
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
    <View style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Planner</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {/* Dark/Light Mode Toggle */}
              <TouchableOpacity
                onPress={toggleDarkMode}
                activeOpacity={0.85}
                style={plannerToggleStyles.toggleWrapper}
              >
                <Ionicons name="sunny" size={13} color={isDarkMode ? '#7A8099' : '#FFAB00'} />
                <Ionicons name="moon" size={12} color={isDarkMode ? '#7C5CFF' : '#C4C9E0'} />
                <Animated.View style={[plannerToggleStyles.track, { backgroundColor: trackBg }]}>
                  <Animated.View
                    style={[
                      plannerToggleStyles.pill,
                      { transform: [{ translateX: pillTranslate }], backgroundColor: isDarkMode ? '#7C5CFF' : '#6C47FF' },
                    ]}
                  />
                </Animated.View>
              </TouchableOpacity>
              {/* Close / Reset */}
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
    </View>
  );
};

const plannerToggleStyles = StyleSheet.create({
  toggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    marginLeft: 4,
  },
  pill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
  },
});

export default Planner;

