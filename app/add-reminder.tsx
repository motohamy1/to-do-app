import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  SafeAreaView, 
  Platform, 
  KeyboardAvoidingView, 
  ScrollView,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { useTranslation } from '@/utils/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

const AddReminderScreen = () => {
  const router = useRouter();
  const { initialTitle, initialDate } = useLocalSearchParams<{ initialTitle?: string, initialDate?: string }>();
  
  const { colors, isDarkMode } = useTheme();
  const { language, userId } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const addTodo = useMutation(api.todos.addTodo);

  const [title, setTitle] = useState(initialTitle || "");
  const [dueDate, setDueDate] = useState<number | undefined>(initialDate ? parseInt(initialDate) : undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const handleSave = async () => {
    if (!title.trim()) return;
    if (!userId) {
       Alert.alert(t.authError, t.authFailed);
       return;
    }

    try {
      // In a real app we would check for duplicates here
      await addTodo({
        userId: userId!,
        text: title.trim(),
        dueDate: dueDate,
        status: "not_started",
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      router.back();
    } catch (error) {
      console.error("Error saving reminder:", error);
      Alert.alert(t.error || "Error", t.saveFailed || "Failed to save reminder");
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDate = new Date(dueDate || Date.now());
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDueDate(newDate.getTime());
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(dueDate || Date.now());
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setDueDate(newDate.getTime());
    }
  };

  const displayDate = dueDate ? new Date(dueDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : (isArabic ? "اختر التاريخ" : "Select Date");

  const displayTime = dueDate ? new Date(dueDate).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }) : (isArabic ? "اختر الوقت" : "Select Time");

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name={isArabic ? "chevron-forward" : "chevron-back"} size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isArabic ? "إضافة تذكير" : "Add Reminder"}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Title Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.textMuted }, isArabic && { textAlign: 'right' }]}>
               {isArabic ? "ما الذي تريد تذكره؟" : "What do you want to remember?"}
            </Text>
            <TextInput
              style={[styles.titleInput, { color: colors.text }, isArabic && { textAlign: 'right' }]}
              placeholder={isArabic ? "تذكير بـ..." : "Remind me about..."}
              placeholderTextColor={isDarkMode ? "#FFFFFF40" : "#00000040"}
              value={title}
              onChangeText={setTitle}
              autoFocus
              multiline
            />
          </View>

          {/* DateTime Selection */}
          <View style={styles.dateTimeSection}>
            <TouchableOpacity 
              style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
              onPress={() => setShowDatePicker(true)}
            >
              <View style={[styles.dateTimeIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.dateTimeTextContainer}>
                <Text style={[styles.dateTimeLabel, { color: colors.textMuted }]}>{isArabic ? "التاريخ" : "Date"}</Text>
                <Text style={[styles.dateTimeValue, { color: colors.text }]}>{displayDate}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
              onPress={() => setShowTimePicker(true)}
            >
              <View style={[styles.dateTimeIcon, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="time-outline" size={20} color={colors.warning} />
              </View>
              <View style={styles.dateTimeTextContainer}>
                <Text style={[styles.dateTimeLabel, { color: colors.textMuted }]}>{isArabic ? "الوقت" : "Time"}</Text>
                <Text style={[styles.dateTimeValue, { color: colors.text }]}>{displayTime}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate ? new Date(dueDate) : new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={dueDate ? new Date(dueDate) : new Date()}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

        </ScrollView>

        {/* Footer Action */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              { backgroundColor: title.trim() ? colors.primary : colors.border },
              !title.trim() && { opacity: 0.5 }
            ]} 
            onPress={handleSave}
            disabled={!title.trim()}
          >
            <Text style={[styles.saveButtonText, { color: isDarkMode ? '#000' : '#FFF' }]}>
               {isArabic ? "حفظ التذكير" : "Save Reminder"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: 24,
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    padding: 0,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateTimeSection: {
    gap: 16,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  dateTimeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  saveButton: {
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});

export default AddReminderScreen;
