import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Animated, StyleSheet, BackHandler, KeyboardAvoidingView, Platform, FlatList, Share } from 'react-native';
import { useRouter } from 'expo-router';
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
  
  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<any>(null);

  const updateTodoStatus = useOfflineMutation(api.todos.updateStatus, "todos:updateStatus");
  const deleteTodoMutation = useOfflineMutation(api.todos.deleteTodo, "todos:deleteTodo");
  const setTimerMutation = useOfflineMutation(api.todos.setTimer, "todos:setTimer");
  const linkProjectMutation = useOfflineMutation(api.todos.linkProject, "todos:linkProject");
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

  
  const todos = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : "skip") || [];

  const currentYear = new Date().getFullYear();

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getTasksForDay = (day: number, month: number, year: number) => {
    return todos.filter(todo => {
      const targetDate = todo.dueDate || todo.date;
      if (!targetDate) return false;
      const todoDate = new Date(targetDate);
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
      const targetDate = todo.dueDate || todo.date;
      if (!targetDate) return false;
      const todoDate = new Date(targetDate);
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

            {tasks.filter(t => t.type === 'reminder').length > 0 && (
                <View style={{ marginBottom: 32 }}>
                    <Text style={[{ fontSize: 20, fontWeight: '800', paddingHorizontal: 24, marginBottom: 16, color: colors.text }, isArabic && { textAlign: 'right' }]}>{isArabic ? 'التذكيرات' : 'Reminders'}</Text>
                    <FlatList 
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                        data={tasks.filter(t => t.type === 'reminder')}
                        keyExtractor={item => item._id}
                        renderItem={({ item: task }) => (
                            <TouchableOpacity 
                                style={[styles.taskItem, { width: 240, marginHorizontal: 8, height: 150, flexDirection: 'column', alignItems: isArabic ? 'flex-end' : 'flex-start', padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                                onPress={() => router.push({ pathname: '/note-detail', params: { id: task._id, isReminder: 'true' } })}
                                onLongPress={() => {
                                    setSelectedItemForAction(task);
                                    setActionModalVisible(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[{ backgroundColor: '#FF6B6B15', width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="alarm-outline" size={22} color="#FF6B6B" />
                                </View>
                                <View style={{ flex: 1, width: '100%', marginTop: 16 }}>
                                    <Text style={[styles.taskItemText, { fontSize: 16, fontWeight: '600' }, isArabic && { textAlign: 'right' }]} numberOfLines={2}>
                                        {task.text}
                                    </Text>
                                    {task.dueDate && (
                                       <Text style={[{ fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '600' }, isArabic && { textAlign: 'right' }]}>
                                           {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                       </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {tasks.filter(t => t.type === 'note').length > 0 && (
                <View style={{ marginBottom: 32 }}>
                    <Text style={[{ fontSize: 20, fontWeight: '800', paddingHorizontal: 24, marginBottom: 16, color: colors.text }, isArabic && { textAlign: 'right' }]}>{isArabic ? 'الملاحظات' : 'Notes'}</Text>
                    <FlatList 
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                        data={tasks.filter(t => t.type === 'note')}
                        keyExtractor={item => item._id}
                        renderItem={({ item: task }) => (
                            <TouchableOpacity 
                                style={[styles.taskItem, { width: 240, marginHorizontal: 8, height: 150, flexDirection: 'column', alignItems: isArabic ? 'flex-end' : 'flex-start', padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                                onPress={() => router.push({ pathname: '/note-detail', params: { id: task._id, isReminder: 'false' } })}
                                onLongPress={() => {
                                    setSelectedItemForAction(task);
                                    setActionModalVisible(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[{ backgroundColor: colors.primary + '15', width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1, width: '100%', marginTop: 16 }}>
                                    <Text style={[styles.taskItemText, { fontSize: 16, fontWeight: '600' }, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
                                        {task.text}
                                    </Text>
                                    {task.description && (
                                       <Text style={[{ fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' }, isArabic && { textAlign: 'right' }]} numberOfLines={1}>
                                           {task.description}
                                       </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            <View style={{ marginBottom: 40 }}>
                {tasks.filter(t => t.type !== 'note' && t.type !== 'reminder').length > 0 && (
                    <View style={{ marginBottom: 24 }}>
                        <Text style={[{ fontSize: 20, fontWeight: '800', paddingHorizontal: 24, marginBottom: 16, color: colors.text }, isArabic && { textAlign: 'right' }]}>{t.tasks}</Text>
                        <FlatList 
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                            data={tasks.filter(t => t.type !== 'note' && t.type !== 'reminder')}
                            keyExtractor={item => item._id}
                            renderItem={({ item: task }) => {
                                const isExpanded = expandedTodoId === task._id;
                                return (
                                    <View style={{ width: 240, marginHorizontal: 8 }}>
                                        <TouchableOpacity 
                                            style={[styles.taskItem, { width: '100%', height: 150, flexDirection: 'column', alignItems: 'flex-start', padding: 16, backgroundColor: isExpanded ? colors.primary + '10' : colors.surface, borderWidth: 1, borderColor: isExpanded ? colors.primary : colors.border }]}
                                            onPress={() => setExpandedTodoId(isExpanded ? null : task._id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <TouchableOpacity 
                                                    onPress={() => updateTodoStatus({ id: task._id, status: task.status === 'done' ? 'not_started' : 'done' })}
                                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                                >
                                                    <Ionicons 
                                                        name={task.status === 'done' ? "checkmark-circle" : "ellipse-outline"} 
                                                        size={26} 
                                                        color={task.status === 'done' ? colors.success : colors.border} 
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                            <View style={{ flex: 1, width: '100%', marginTop: 16 }}>
                                                <Text style={[
                                                    styles.taskItemText, 
                                                    task.status === 'done' && { textDecorationLine: 'line-through', color: colors.textMuted, opacity: 0.6 },
                                                    isArabic && { textAlign: 'right' },
                                                    { fontSize: 16, fontWeight: '600' }
                                                ]} numberOfLines={2}>
                                                    {task.text}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            }}
                        />
                        {expandedTodoId && tasks.find(t => t._id === expandedTodoId && t.type !== 'note' && t.type !== 'reminder') && (
                            <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                                <TodoCard 
                                  todo={{ ...tasks.find(t => t._id === expandedTodoId), status: tasks.find(t => t._id === expandedTodoId)?.status || 'not_started' } as any} 
                                  homeStyles={homeStyles}
                                  onSetTimer={(id) => { setSelectedTodoId(id as Id<"todos">); setTimerModalVisible(true); }} 
                                  onLongPress={(id) => deleteTodoMutation({ id: id as Id<"todos"> })} 
                                  onLinkProject={(id) => { setSelectedTodoId(id as Id<"todos">); setProjectModalVisible(true); }}
                                />
                                <TouchableOpacity 
                                  style={{ alignSelf: 'center', marginTop: -16, backgroundColor: colors.surface, borderRadius: 20, padding: 6, borderWidth: 1, borderColor: colors.border, zIndex: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
                                  onPress={() => setExpandedTodoId(null)}
                                >
                                  <Ionicons name="chevron-up" size={20} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                <View style={[styles.addDayTaskContainer, tasks.filter(t => t.type !== 'note' && t.type !== 'reminder' && !t.dueDate).length === 0 && { marginTop: 0 }]}>
                    <TodoInput initialDate={selectedDateTs} onFocus={scrollToBottom} />
                </View>
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


    </KeyboardAvoidingView>
  );
};

export default Planner;

