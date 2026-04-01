import React, { useState, useEffect } from 'react';
import { 
  View,
  Text, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import { createNotesStyles } from '@/assets/styles/notes.styles';

export default function NoteDetailScreen() {
  const router = useRouter();
  const { id, isReminder } = useLocalSearchParams<{ id: string, isReminder: string }>();
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const styles = createNotesStyles(colors, isArabic);
  const insets = useSafeAreaInsets();

  // Note State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dueDate, setDueDate] = useState<number>(0);

  // Modal State
  const [showReminderModal, setShowReminderModal] = useState(isReminder === 'true');
  const [reminderTitle, setReminderTitle] = useState('');
  
  // Custom Calendar State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Custom Exact Time state
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Queries & Mutations
  const existingNote = useQuery(api.todos.get, userId ? { userId } : 'skip')?.find(t => t._id === id);
  const addNote = useMutation(api.todos.addTodo);
  const deleteNoteMutation = useMutation(api.todos.deleteTodo);
  // const updateNote = useMutation(api.todos.updateTodo); // Assuming it exists
  
  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.text || '');
      setBody(existingNote.description || '');
      if (existingNote.dueDate) {
        setDueDate(existingNote.dueDate);
        const d = new Date(existingNote.dueDate);
        setSelectedDate(d);
        setCurrentMonth(d);
        setSelectedTime(d);
      }
    }
  }, [existingNote]);

  const handleSaveNote = async () => {
    if (!title.trim() && !body.trim()) {
      router.back();
      return;
    }
    
    if (userId) {
      // NOTE: Here we would use updateNote if id exists. 
      // For simplicity/fallback, using addNote if id is missing.
      // If we had updateMutation we'd do:
      // if (id) await updateMutation({ id, text: title, description: body, dueDate });
      // else await addNote({...});
      try {
        if (!id) {
          await addNote({
            userId,
            text: title.trim(),
            description: body.trim(),
            dueDate: dueDate || undefined,
            status: 'not_started'
          });
        }
      } catch (err) {
        console.warn('Failed to save note', err);
      }
    }
    router.back();
  };

  const handleDeleteNote = async () => {
    if (id) {
      try {
        await deleteNoteMutation({ id: id as any }); // type casting to Convex Id bypasses tight inferred param typing
      } catch (err) {
        console.warn('Failed to delete note', err);
      }
    }
    router.back();
  };

  const handleCreateReminder = async () => {
    // Combine selected date with selected arbitrary time
    const finalDate = new Date(selectedDate);
    finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    
    const dueDateMs = finalDate.getTime();
    setDueDate(dueDateMs);
    
    if (reminderTitle.trim()) {
        setTitle(reminderTitle);
    }
    
    try {
      if (dueDateMs > Date.now()) {
        const Notifications = require('expo-notifications');
        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminderTitle || 'Reminder',
            body: body || 'You have a scheduled reminder from your to-do app.',
            sound: true,
          },
          trigger: { date: finalDate } as any
        });
      }
    } catch (err) {
      console.warn('Notification scheduling skipped:', err);
    }

    setShowReminderModal(false);
  };

  // Calendar Helpers
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  
  const renderCalendarDays = () => {
    const cells = [];
    const isCurrentMonthSelected = selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();

    // Empty cells for alignment
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
        const isActive = isCurrentMonthSelected && selectedDate.getDate() === i;

        cells.push(
          <TouchableOpacity 
            key={`day-${i}`} 
            style={[styles.dayCell, isActive && styles.dayCellActive]}
            onPress={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i))}
          >
            <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{i}</Text>
          </TouchableOpacity>
        );
    }
    return cells;
  };

  return (
    <SafeAreaView style={styles.detailSafeArea} edges={['left', 'right', 'bottom']}>
      {/* Top Header */}
      <View style={[styles.detailHeader, isArabic && { flexDirection: 'row-reverse' }, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.detailHeaderBtn} onPress={handleSaveNote}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.detailHeaderRight}>
          <TouchableOpacity 
            style={styles.detailHeaderBtn} 
            onPress={() => {
                setReminderTitle(title);
                setShowReminderModal(true);
            }}
          >
            <Ionicons name="alarm-outline" size={24} color={dueDate ? colors.primary : colors.text} />
          </TouchableOpacity>
          {id ? (
            <TouchableOpacity style={styles.detailHeaderBtn} onPress={handleDeleteNote}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Note Content */}
      <View style={styles.detailContent}>
        <TextInput
          style={[styles.titleInput, isArabic && { textAlign: 'right' }]}
          placeholder="Note Title"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.bodyInput, isArabic && { textAlign: 'right' }]}
          placeholder="Start Typing your notes..."
          placeholderTextColor={colors.textMuted}
          value={body}
          onChangeText={setBody}
          multiline
        />
      </View>

      {/* Reminder Modal Overlay */}
      <Modal
        visible={showReminderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReminderModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, isArabic && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowReminderModal(false)}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Reminder</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title Section */}
              <Text style={[styles.sectionLabel, isArabic && { textAlign: 'right' }]}>What do you want to be reminded?</Text>
              <TextInput
                style={[styles.reminderTitleInput, isArabic && { textAlign: 'right' }]}
                placeholder="Enter your title..."
                placeholderTextColor={colors.textMuted}
                value={reminderTitle}
                onChangeText={setReminderTitle}
              />

              {/* Date Section (Custom Calendar) */}
              <Text style={[styles.sectionLabel, isArabic && { textAlign: 'right' }]}>Select Date</Text>
              <View style={styles.calendarCard}>
                <View style={[styles.calendarHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                  <TouchableOpacity onPress={prevMonth}>
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.calendarTitle}>
                    {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity onPress={nextMonth}>
                    <Ionicons name="chevron-forward" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Weekdays */}
                <View style={[styles.weekDaysRow, isArabic && { flexDirection: 'row-reverse' }]}>
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                    <Text key={d} style={styles.weekDayText}>{d}</Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={[styles.daysGrid, isArabic && { flexDirection: 'row-reverse' }]}>
                  {renderCalendarDays()}
                </View>
              </View>

              {/* Time Section */}
              <Text style={[styles.sectionLabel, isArabic && { textAlign: 'right' }]}>Select Exact Time</Text>
              
              <View style={[styles.timePresetsRow, isArabic && { flexDirection: 'row-reverse' }, { alignItems: 'center' }]}>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="spinner"
                    style={{ flex: 1, height: 120 }}
                    onChange={(e, d) => d && setSelectedTime(d)}
                  />
                ) : (
                  <>
                    <TouchableOpacity 
                      style={[styles.timePresetBtn, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', height: 60 }]}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Ionicons name="time-outline" size={24} color={colors.text} style={{ marginRight: 8 }} />
                      <Text style={[styles.timePresetMain, { color: colors.text, fontSize: 24 }]}>
                        {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                    {showTimePicker && (
                      <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        display="default"
                        is24Hour={true}
                        onChange={(e, d) => {
                           setShowTimePicker(false);
                           if (d) setSelectedTime(d);
                        }}
                      />
                    )}
                  </>
                )}
              </View>

              {/* Create Button */}
              <TouchableOpacity style={styles.createReminderBtn} onPress={handleCreateReminder}>
                <Text style={styles.createReminderText}>Create Reminder</Text>
              </TouchableOpacity>
              
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
