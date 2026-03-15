import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { createPlannerStyles } from '@/assets/styles/planner.styles';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import TodoInput from '@/components/TodoInput';

const months = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

const Planner = () => {
  const { colors } = useTheme();
  const styles = createPlannerStyles(colors);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  const todos = useQuery(api.todos.get);

  const currentYear = new Date().getFullYear();

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getTasksForDay = (day: number, month: number, year: number) => {
    if (!todos) return [];
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

  const renderMonthGrid = () => (
    <View style={styles.monthGrid}>
      {months.map((month, index) => (
        <TouchableOpacity 
          key={month} 
          style={styles.monthCircle}
          onPress={() => setSelectedMonth(index)}
        >
          <Text style={styles.monthText}>{month.substring(0, 3)}</Text>
        </TouchableOpacity>
      ))}
    </View>
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
                    styles.dayCircle, 
                    tasks.length > 0 && styles.hasTaskCircle,
                    isToday && styles.todayCircle
                ]}
                onPress={() => setSelectedDay(i)}
            >
                <Text style={[
                    styles.dayCircleText, 
                    tasks.length > 0 && styles.hasTaskText,
                    isToday && styles.todayText
                ]}>{i}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedMonth(null)}>
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
                <Text style={styles.backText}>Back to Months</Text>
            </TouchableOpacity>

            <View style={{ paddingHorizontal: 24, marginBottom: 10 }}>
                <Text style={styles.headerTitle}>{months[monthIndex]} Grid</Text>
                <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 4 }}>Select a day to view or add tasks</Text>
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
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedDay(null)}>
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
                <Text style={styles.backText}>Back to {months[month]}</Text>
            </TouchableOpacity>

            <View style={styles.specificDayHeader}>
                <Text style={styles.specificDayTitle}>{day} {months[month]}</Text>
                <Text style={styles.specificDaySubtitle}>
                    {tasks.length === 0 ? 'No tasks for today. Start planning!' : `${tasks.length} tasks scheduled`}
                </Text>
            </View>

            <View style={{ gap: 12 }}>
                {tasks.map(task => (
                    <View key={task._id} style={styles.dayItem}>
                        <View style={styles.taskItem}>
                            <Ionicons 
                                name={(task.status || 'not_started') === 'done' ? "checkmark-circle" : ((task.status || 'not_started') === 'in_progress' ? "play-circle" : "ellipse-outline")} 
                                size={22} 
                                color={(task.status || 'not_started') === 'done' ? colors.success : ((task.status || 'not_started') === 'in_progress' ? colors.info : colors.primary)} 
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.taskText, (task.status || 'not_started') === 'done' && { textDecorationLine: 'line-through', color: colors.textMuted, fontSize: 16 }]}>
                                    {task.text}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' }}>
                                    {(task.status || 'not_started').replace('_', ' ')}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.addDayTaskContainer}>
                <TodoInput initialDate={selectedDateTs} />
            </View>
        </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Planner</Text>
            {(selectedMonth !== null || selectedDay !== null) && (
                <TouchableOpacity onPress={resetAll}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
            )}
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

export default Planner;
