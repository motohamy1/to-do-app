import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import { createScrollStackStyles } from '@/assets/styles/scrollStack.styles';
import { Id } from '@/convex/_generated/dataModel';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useWindowDimensions } from 'react-native';

export type ManagedItemType = 'reminder' | 'meeting' | 'appointment';

export interface EventData {
  _id?: Id<"todos">;
  title: string;
  date: number;
  startTime?: number;
  endTime?: number;
  location?: string;
  meetingLink?: string;
  priority?: string;
  type?: ManagedItemType;
  description?: string;
}

interface EventManagementModalProps {
  visible: boolean;
  onClose: () => void;
  initialDate?: number;
  eventToEdit?: EventData | null;
  onSaveEvent: (event: EventData) => Promise<void> | void;
  onDeleteEvent?: (id: Id<"todos">) => Promise<void> | void;
}

export const EventManagementModal: React.FC<EventManagementModalProps> = ({
  visible,
  onClose,
  initialDate,
  eventToEdit,
  onSaveEvent,
  onDeleteEvent,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const styles = createScrollStackStyles(colors, isArabic, isDarkMode);
  const { height: screenHeight } = useWindowDimensions();
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();

  const [title, setTitle] = useState('');
  const [itemType, setItemType] = useState<ManagedItemType>('reminder');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title || '');
      setItemType(
        eventToEdit.type === 'meeting' || eventToEdit.type === 'appointment'
          ? eventToEdit.type
          : 'reminder'
      );
      setSelectedDate(new Date(eventToEdit.date || Date.now()));
      setSelectedTime(new Date(eventToEdit.startTime || eventToEdit.date || Date.now()));
      setLocation(eventToEdit.location || '');
      setMeetingLink(eventToEdit.meetingLink || '');
      setNotes(eventToEdit.description || '');
    } else {
      setTitle('');
      setItemType('reminder');
      const baseDate = initialDate ? new Date(initialDate) : new Date();
      setSelectedDate(baseDate);
      setSelectedTime(new Date());
      setLocation('');
      setMeetingLink('');
      setNotes('');
    }
  }, [eventToEdit, initialDate, visible]);

  const handleSave = async () => {
    if (isSaving) return;
    if (!title.trim()) {
      Alert.alert(t.missingFields, t.fillAll);
      return;
    }

    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const eventDateObj = new Date(selectedDate);
      eventDateObj.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

      const savedData: EventData = {
        _id: eventToEdit?._id,
        title: title.trim(),
        type: itemType,
        date: eventDateObj.getTime(),
        startTime: eventDateObj.getTime(),
        location: itemType === 'reminder' ? '' : location.trim(),
        meetingLink: itemType === 'reminder' ? '' : meetingLink.trim(),
        description: notes.trim(),
        priority: 'High',
      };

      await onSaveEvent(savedData);
      onClose();
    } catch (err) {
      Alert.alert(t.error, t.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!eventToEdit?._id || !onDeleteEvent) return;

    Alert.alert(
      t.confirmDeleteTitle,
      isArabic ? 'هل أنت متأكد من حذف هذا العنصر؟' : `Are you sure you want to delete this ${typeWord.toLowerCase()}?`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await onDeleteEvent(eventToEdit._id!);
            onClose();
          },
        },
      ]
    );
  };

  const dateString = selectedDate.toLocaleDateString(
    isArabic ? 'ar-SA' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );

  const timeString = selectedTime.toLocaleTimeString(
    isArabic ? 'ar-SA' : 'en-US',
    { hour: '2-digit', minute: '2-digit' }
  );

  const typeWord =
    itemType === 'reminder' ? t.typeReminder : itemType === 'meeting' ? t.typeMeeting : t.typeAppointment;

  const headerTitle = eventToEdit
    ? (isArabic ? `تعديل ${typeWord}` : `Edit ${typeWord}`)
    : (isArabic ? `إضافة ${typeWord}` : `Add ${typeWord}`);

  const typeOptions: { id: ManagedItemType; icon: string; label: string }[] = [
    { id: 'reminder', icon: 'alarm-outline', label: t.typeReminder },
    { id: 'meeting', icon: 'videocam-outline', label: t.typeMeeting },
    { id: 'appointment', icon: 'calendar-outline', label: t.typeAppointment },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
              style={[
                styles.modalContent,
                {
                  maxHeight: isKeyboardVisible
                    ? Math.max(320, screenHeight - keyboardHeight - (Platform.OS === 'ios' ? 44 : 28))
                    : '90%',
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.modalDragHandle} />

              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {headerTitle}
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 140 : 40 }}
              >
                <View style={styles.modalForm}>
                  {/* Type Selector: Reminder / Meeting / Appointment */}
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalInputLabel}>
                      {isArabic ? 'النوع' : 'Type'}
                    </Text>
                    <View style={styles.modalTypeRow}>
                      {typeOptions.map((opt) => {
                        const active = itemType === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.modalTypeChip, active && styles.modalTypeChipActive]}
                            onPress={() => setItemType(opt.id)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={opt.icon as any}
                              size={15}
                              color={active ? colors.text : colors.textMuted}
                            />
                            <Text style={[styles.modalTypeChipText, active && styles.modalTypeChipTextActive]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Item Title */}
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalInputLabel}>{itemType === 'reminder' ? t.reminderTitle : t.eventTitle}</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder={
                        itemType === 'reminder'
                          ? (isArabic ? 'مثال: شرب الدواء' : 'e.g., Take the medication')
                          : (isArabic ? 'مثال: اجتماع فريق العمل' : 'e.g., Team Sync Meeting')
                      }
                      placeholderTextColor={colors.textMuted}
                      value={title}
                      onChangeText={setTitle}
                      autoFocus={!eventToEdit}
                    />
                  </View>

                  {/* Date & Time Selectors */}
                  <View style={styles.modalTimeRow}>
                    {/* Date Picker Button */}
                    <TouchableOpacity
                      style={styles.modalTimeBox}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                      <Text style={styles.modalTimeBoxText}>{dateString}</Text>
                    </TouchableOpacity>

                    {/* Time Picker Button */}
                    <TouchableOpacity
                      style={styles.modalTimeBox}
                      onPress={() => setShowTimePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="time-outline" size={18} color={colors.primary} />
                      <Text style={styles.modalTimeBoxText}>{timeString}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Date Picker Modal (Native) */}
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_, date) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (date) setSelectedDate(date);
                      }}
                    />
                  )}

                  {/* Time Picker Modal (Native) */}
                  {showTimePicker && (
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_, date) => {
                        setShowTimePicker(Platform.OS === 'ios');
                        if (date) setSelectedTime(date);
                      }}
                    />
                  )}

                  {/* Location & Meeting Link (events only) */}
                  {itemType !== 'reminder' ? (
                    <>
                      <View style={styles.modalInputGroup}>
                        <Text style={styles.modalInputLabel}>{t.eventLocation}</Text>
                        <TextInput
                          style={styles.modalTextInput}
                          placeholder={isArabic ? 'مثال: قاعة الاجتماعات أو العنوان' : 'e.g., Conference Room B'}
                          placeholderTextColor={colors.textMuted}
                          value={location}
                          onChangeText={setLocation}
                        />
                      </View>

                      <View style={styles.modalInputGroup}>
                        <Text style={styles.modalInputLabel}>{t.eventMeetingLink}</Text>
                        <TextInput
                          style={styles.modalTextInput}
                          placeholder="https://meet.google.com/..."
                          placeholderTextColor={colors.textMuted}
                          value={meetingLink}
                          onChangeText={setMeetingLink}
                          keyboardType="url"
                          autoCapitalize="none"
                        />
                      </View>
                    </>
                  ) : null}

                  {/* Notes — like attaching a note to a reminder in the Notes page */}
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalInputLabel}>{t.itemNotes}</Text>
                    <TextInput
                      style={styles.modalNotesInput}
                      placeholder={t.itemNotesPlaceholder}
                      placeholderTextColor={colors.textMuted}
                      value={notes}
                      onChangeText={setNotes}
                      multiline={true}
                      blurOnSubmit={false}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.modalActionRow}>
                    {eventToEdit && onDeleteEvent && (
                      <TouchableOpacity
                        style={styles.modalDeleteBtn}
                        onPress={handleDelete}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.modalSaveBtn}
                      onPress={handleSave}
                      disabled={isSaving}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.modalSaveBtnText}>{t.save}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default EventManagementModal;
