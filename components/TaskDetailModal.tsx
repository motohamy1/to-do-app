import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Platform, LayoutAnimation, ActivityIndicator, KeyboardAvoidingView, Alert } from 'react-native';
import useTheme from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { SubtaskRow } from './SubtaskRow';


interface TaskDetailModalProps {
  visible: boolean;
  onClose: () => void;
  todoId: Id<"todos"> | null;
  initialDate?: number;
  projectId?: Id<"projects">;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ visible, onClose, todoId, initialDate, projectId }) => {
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);

  // --- Task Nesting (Back Stack) ---
  const [taskStack, setTaskStack] = useState<Id<"todos">[]>([]);
  const currentTodoId = taskStack.length > 0 ? taskStack[taskStack.length - 1] : todoId;
  const todo = useOfflineQuery<any>('todos.getById', api.todos.getById, currentTodoId ? { id: currentTodoId } : "skip");
  const subtasks = useOfflineQuery<any[]>('todos.getSubtasks', api.todos.getSubtasks, currentTodoId ? { parentId: currentTodoId } : "skip");
  const project = useOfflineQuery<any>('projects.getProjectMetadata', api.projects.getProjectMetadata, todo?.projectId ? { id: todo.projectId } : "skip");

  const updateTodo = useOfflineMutation(api.todos.updateTodo, "todos:updateTodo");
  const updateStatus = useOfflineMutation(api.todos.updateStatus, "todos:updateStatus");
  const setTimer = useOfflineMutation(api.todos.setTimer, "todos:setTimer");
  const startTimer = useOfflineMutation(api.todos.startTimer, "todos:startTimer");
  const pauseTimer = useOfflineMutation(api.todos.pauseTimer, "todos:pauseTimer");
  const resetTimer = useOfflineMutation(api.todos.resetTimer, "todos:resetTimer");
  const removeTimer = useOfflineMutation(api.todos.removeTimer, "todos:removeTimer");
  const addTodo = useOfflineMutation(api.todos.addTodo, "todos:addTodo");
  const deleteTodo = useOfflineMutation(api.todos.deleteTodo, "todos:deleteTodo");

  const [editText, setEditText] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [status, setStatus] = useState<string>("not_started");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [datePickerMode, setDatePickerMode] = useState<'dueDate'>('dueDate');
  const [dueDate, setDueDate] = useState<number | undefined>(undefined);

  useEffect(() => {

    let interval: any;
    if (todo?.status === 'in_progress' && todo?.timerStartTime && todo?.timerDuration) {
      const tick = () => {
        const elapsed = Date.now() - todo.timerStartTime!;
        const remaining = Math.max(0, todo.timerDuration! - elapsed);
        setTimeLeft(remaining);
      };
      tick();
      interval = setInterval(tick, 1000);
    } else if (todo?.status === 'paused' && todo?.timeLeftAtPause !== undefined) {
      setTimeLeft(todo.timeLeftAtPause);
    } else {
      setTimeLeft(todo?.timerDuration || 0);
    }
    return () => clearInterval(interval);
  }, [todo?.status, todo?.timerStartTime, todo?.timerDuration, todo?.timeLeftAtPause]);


  // Only initialize form state when navigating to a *different* task
  const [initializedForId, setInitializedForId] = useState<string | null>(null);
  useEffect(() => {
    if (todo && todo._id !== initializedForId) {
      setEditText(todo.text);
      setDescription(todo.description || "");
      setPriority(todo.priority || "Medium");
      
      // Initialize hours and minutes from timerDuration
      if (todo.timerDuration) {
        setHours(String(Math.floor(todo.timerDuration / 3600000)));
        setMinutes(String(Math.floor((todo.timerDuration % 3600000) / 60000)));
      } else {
        setHours("0");
        setMinutes("0");
      }
      setDueDate(todo.dueDate);
      setStatus(todo.status);
      setInitializedForId(todo._id);
    }
  }, [todo?._id]);

  // Reset to blank draft when modal opens with no todoId
  useEffect(() => {
    if (visible && !todoId) {
      setEditText("");
      setDescription("");
      setPriority("Medium");
      setHours("0");
      setMinutes("0");
      setDueDate(undefined);
      setStatus("not_started");
      setNewSubtaskText("");
      setIsEditingTimer(false);
      setInitializedForId(null);
    }
  }, [visible, todoId]);


  const handleClose = async () => {
    if (todoId) {
      saveText();
      saveDescription();
    } else if (editText.trim() && userId) {
      // Create new task from draft
      const h = parseInt(hours) || 0;
      const m = parseInt(minutes) || 0;
      const ms = (h * 3600 + m * 60) * 1000;
      
      await addTodo({
        userId,
        text: editText.trim(),
        description: description.trim(),
        priority: priority,
        date: initialDate || Date.now(),
        dueDate: dueDate,
        status: status,
        ...(projectId ? { projectId } : {}),
        ...(ms > 0 ? { timerDuration: ms } : {}),
      });
    }
    
    setTaskStack([]);
    setInitializedForId(null);
    // Explicitly reset draft state for next time
    setEditText("");
    setDescription("");
    setPriority("Medium");
    setHours("0");
    setMinutes("0");
    onClose();
  };

  const handleBack = () => {
    if (taskStack.length > 0) {
      const newStack = [...taskStack];
      newStack.pop();
      setTaskStack(newStack);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } else {
      handleClose();
    }
  };

  const openSubtaskDetail = (id: Id<"todos">) => {
    setTaskStack(prev => [...prev, id]);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const saveText = () => {
    if (currentTodoId && editText.trim() && editText !== todo?.text) {
      updateTodo({ id: currentTodoId, text: editText.trim() });
    }
  };

  const saveDescription = () => {
    if (currentTodoId && description !== todo?.description) {
      updateTodo({ id: currentTodoId, description: description.trim() });
    }
  };

  const handleUpdatePriority = (p: string) => {
    setPriority(p);
    if (currentTodoId) {
      updateTodo({ id: currentTodoId, priority: p });
    }
  };

  const [newSubHours, setNewSubHours] = useState("0");
  const [newSubMinutes, setNewSubMinutes] = useState("0");
  const [showNewSubTimerPicker, setShowNewSubTimerPicker] = useState(false);

  const newSubDuration = useMemo(() => {
    const h = parseInt(newSubHours) || 0;
    const m = parseInt(newSubMinutes) || 0;
    const ms = (h * 3600 + m * 60) * 1000;
    return ms > 0 ? ms : undefined;
  }, [newSubHours, newSubMinutes]);

  // Remaining timer budget for new subtasks in modal
  const modalSubBudget = useMemo(() => {
    if (!todo?.timerDuration || !subtasks) return undefined;
    const usedDuration = subtasks.reduce((sum: number, s: any) => sum + (s.timerDuration || 0), 0);
    return Math.max(0, todo.timerDuration - usedDuration);
  }, [todo?.timerDuration, subtasks]);

  // Subtask handlers for SubtaskRow
  const handleStartSubtask = (id: Id<"todos">) => startTimer({ id });
  const handlePauseSubtask = (id: Id<"todos">) => pauseTimer({ id });
  const handleToggleSubComplete = (id: Id<"todos">, currentStatus: string) => 
    updateStatus({ id, status: currentStatus === 'done' ? 'not_started' : 'done' });
  const handleDeleteSub = (id: Id<"todos">) => deleteTodo({ id });
  const handleSetSubTimer = (id: Id<"todos">, ms: number, direction: string) => 
    setTimer({ id, duration: ms, timerDirection: direction });
  const handleUpdateSubText = (id: Id<"todos">, text: string) => 
    updateTodo({ id, text });


  const handleAddSubtask = () => {
    if (newSubtaskText.trim() && userId && currentTodoId) {
      // Validate subtask timer against parent budget
      if (newSubDuration && todo?.timerDuration) {
        const usedDuration = subtasks ? subtasks.reduce((sum: number, s: any) => sum + (s.timerDuration || 0), 0) : 0;
        const available = Math.max(0, todo.timerDuration - usedDuration);
        if (newSubDuration > available) {
          const availH = Math.floor(available / 3600000);
          const availM = Math.floor((available % 3600000) / 60000);
          Alert.alert(
            isArabic ? 'الوقت غير كافٍ' : 'Time Budget Exceeded',
            isArabic
              ? `المتاح: ${availH > 0 ? availH + 'س ' : ''}${availM}د`
              : `Available: ${availH > 0 ? availH + 'h ' : ''}${availM}m`
          );
          return;
        }
      }
      addTodo({
        userId: userId!,
        text: newSubtaskText.trim(),
        parentId: currentTodoId!,
        projectId: todo?.projectId,
        ...(newSubDuration && { timerDuration: newSubDuration })
      });
      setNewSubtaskText("");
      setNewSubHours("0");
      setNewSubMinutes("0");
      setShowNewSubTimerPicker(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const handleSaveCustomTimer = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const ms = (h * 3600 + m * 60) * 1000;
    if (currentTodoId) {
      setTimer({ id: currentTodoId, duration: ms });
    }
    setIsEditingTimer(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const time = selectedDate.getTime();
      setDueDate(time);
      if (currentTodoId) {
        setTimer({ id: currentTodoId, dueDate: time });
      }
    }
  };

  const projectColor = project?.color || colors.primary;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleBack}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            {/* Header */}
           <View style={[styles.header, { borderBottomColor: colors.border + '40' }, isArabic && { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity onPress={handleBack} style={styles.headerIcon}>
              <Ionicons name={taskStack.length > 0 ? (isArabic ? "chevron-forward" : "chevron-back") : "close"} size={28} color={colors.text} />
            </TouchableOpacity>
            
            <View style={{ flex: 1, alignItems: 'center' }}>
               <View style={[styles.breadcrumb, isArabic && { flexDirection: 'row-reverse' }]}>
                 <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                   {isArabic ? "تفاصيل المهمة" : "Task Details"}
                 </Text>
               </View>
            </View>

            <TouchableOpacity onPress={() => {
              if (currentTodoId) {
                const performDelete = () => deleteTodo({ id: currentTodoId! }).then(handleBack);
                if (Platform.OS === 'web') {
                  if (window.confirm(t.confirmDeleteTask || "Are you sure you want to delete this task?")) {
                    performDelete();
                  }
                } else {
                  Alert.alert(
                    t.confirmDeleteTitle || "Confirm Delete", 
                    t.confirmDeleteTask || "Are you sure you want to delete this task?", 
                    [
                      { text: t.cancel || "Cancel", style: "cancel" },
                      { text: t.delete || "Delete", style: "destructive", onPress: performDelete }
                    ]
                  );
                }
              }
            }} style={styles.headerIcon}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>

          </View>

          {(!todo && currentTodoId) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={projectColor} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* Project Badge */}
              {project && (
                <View style={[styles.projectBadge, { backgroundColor: projectColor + '15', borderColor: projectColor + '30' }, isArabic && { alignSelf: 'flex-end' }]}>
                  <Ionicons name="folder-open-outline" size={14} color={projectColor} />
                  <Text style={[styles.projectBadgeText, { color: projectColor }]}>{project.name}</Text>
                </View>
              )}

              {/* Task Title Input */}
              <View style={[styles.section, isArabic && { alignItems: 'flex-end' }]}>
                <TextInput
                  style={[styles.titleInput, { color: colors.text }, isArabic && { textAlign: 'right' }]}
                  value={editText}
                  onChangeText={setEditText}
                  onBlur={saveText}
                  multiline
                  placeholder={isArabic ? "عنوان المهمة..." : "Task Title..."}
                  placeholderTextColor={isDarkMode ? "#FFFFFF40" : "#00000040"}

                />
              </View>

              {/* Timer Section Selection */}
              {(!todo || !todo.timerDuration) && !isEditingTimer && (
                <View style={[styles.section, isArabic && { alignItems: 'flex-end' }]}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{t.timer}</Text>
                  <TouchableOpacity 
                    style={[styles.deadlineButton, { borderColor: projectColor + '60', backgroundColor: projectColor + '10' }, isArabic && { flexDirection: 'row-reverse' }]}
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsEditingTimer(true);
                    }}
                  >
                    <Ionicons name="timer-outline" size={20} color={projectColor} />
                    <Text style={[styles.deadlineButtonText, { color: colors.text, fontWeight: '700' }]}>
                      {isArabic ? 'إضافة مؤقت' : 'Add a Timer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {isEditingTimer && (
                <View style={[styles.section, isArabic && { alignItems: 'flex-end' }]}>
                  <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                    <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{t.timer}</Text>

                    <TouchableOpacity onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setIsEditingTimer(false);
                    }}>
                      <Text style={{ fontSize: 13, color: colors.danger, fontWeight: '700' }}>{t.cancel}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Custom Timer Input Row */}
                  <View style={[styles.customTimerRow, isArabic && { flexDirection: 'row-reverse' }]}>
                    <View style={styles.customTimerInputGroup}>
                      <TextInput
                        style={[styles.customTimerInput, { color: colors.text, borderColor: colors.border }]}
                        keyboardType="numeric"
                        value={hours}
                        onChangeText={setHours}
                        maxLength={2}
                        selectTextOnFocus
                      />
                      <Text style={[styles.customTimerSubLabel, { color: colors.textMuted }]}>{t.hours}</Text>
                    </View>
                    <Text style={[styles.customTimerColon, { color: colors.text }]}>:</Text>
                    <View style={styles.customTimerInputGroup}>
                      <TextInput
                        style={[styles.customTimerInput, { color: colors.text, borderColor: colors.border }]}
                        keyboardType="numeric"
                        value={minutes}
                        onChangeText={setMinutes}
                        maxLength={2}
                        selectTextOnFocus
                      />
                      <Text style={[styles.customTimerSubLabel, { color: colors.textMuted }]}>{t.minutes}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.customTimerSaveButton, { backgroundColor: projectColor }]}
                      onPress={handleSaveCustomTimer}
                    >
                      <Ionicons name="checkmark" size={20} color={isDarkMode ? "#000" : "#FFF"} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Deadline Selection */}
              <View style={[styles.section, isArabic && { alignItems: 'flex-end' }]}>
                <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{t.deadline || (isArabic ? 'الموعد النهائي' : 'Deadline')}</Text>
                  {dueDate && (
                    <TouchableOpacity onPress={() => {
                      setDueDate(undefined);
                      if (currentTodoId) setTimer({ id: currentTodoId, dueDate: undefined });
                    }}>
                      <Text style={{ fontSize: 13, color: colors.danger, fontWeight: '700' }}>{t.remove || (isArabic ? 'إزالة' : 'Remove')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={[styles.deadlineButton, { borderColor: dueDate ? projectColor : colors.border, backgroundColor: dueDate ? projectColor + '10' : 'transparent' }, isArabic && { flexDirection: 'row-reverse' }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={dueDate ? projectColor : colors.textMuted} />
                  <Text style={[styles.deadlineButtonText, { color: dueDate ? colors.text : colors.textMuted }]}>
                    {dueDate ? new Date(dueDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : (isArabic ? 'تحديد موعد نهائي' : 'Set a deadline')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dueDate ? new Date(dueDate) : new Date()}
                    mode="date"
                    display="default"
                    themeVariant={isDarkMode ? 'dark' : 'light'}
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>

              {/* Circular Timer Visualization */}
              {todo?.timerDuration && !isEditingTimer && (
                <View style={styles.timerContainer}>
                  <Svg width="200" height="200" viewBox="0 0 220 220">
                    <G rotation="-90" origin="110, 110">
                      {/* Background Circle */}
                      <Circle
                        cx="110"
                        cy="110"
                        r="90"
                        stroke={isDarkMode ? colors.border : "#E2E8F0"}
                        strokeWidth="12"
                        fill="none"
                        opacity={isDarkMode ? 0.2 : 0.5}
                      />
                      {/* Progress Arc */}
                      <Circle
                        cx="110"
                        cy="110"
                        r="90"
                        stroke={projectColor}
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(timeLeft / (todo!.timerDuration || 1)) * 565}, 565`}
                        strokeLinecap="round"
                      />
                    </G>
                    {/* Time Text */}
                    <SvgText
                      x="110"
                      y="105"
                      fontSize="48"
                      fontWeight="900"
                      fill={colors.text}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {`${Math.floor(timeLeft / 60000)}:${String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}`}
                    </SvgText>
                    {/* Status Text Under Time */}
                    <SvgText
                      x="110"
                      y="145"
                      fontSize="12"
                      fontWeight="700"
                      fill={colors.textMuted}
                      textAnchor="middle"
                      opacity={0.8}
                    >
                      {todo!.status === 'in_progress' ? (isArabic ? 'جاهز؟ ركز!' : 'Stay Focused') : (isArabic ? 'جاهز للبدء؟' : 'Ready to start?')}
                    </SvgText>
                  </Svg>

                  <View style={[styles.timerControls, isArabic && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity 
                      style={[styles.mainControlButton, { backgroundColor: projectColor }]}
                      onPress={() => {
                        if (todo!.status === 'in_progress') pauseTimer({ id: currentTodoId! });
                        else startTimer({ id: currentTodoId! });
                      }}
                    >
                      <Ionicons name={todo!.status === 'in_progress' ? "pause" : "play"} size={22} color={isDarkMode ? "#000" : "#FFF"} />
                      <Text style={[styles.mainControlButtonText, { color: isDarkMode ? "#000" : "#FFF" }]}>
                        {todo!.status === 'in_progress' ? (isArabic ? 'إيقاف' : 'Pause Task') : todo!.status === 'paused' ? (isArabic ? 'استئناف المهمة' : 'Resume Task') : (isArabic ? 'ابدأ المهمة' : 'Start Task')}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.secondaryButton, { borderColor: projectColor + '40', backgroundColor: colors.surface }]}
                      onPress={() => resetTimer({ id: currentTodoId! })}
                    >
                      <Ionicons name="refresh" size={20} color={projectColor} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.secondaryActionsRow}>
                    <TouchableOpacity 
                      style={[styles.tertiaryButton, { borderColor: colors.border }]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsEditingTimer(true);
                      }}
                    >
                      <Ionicons name="timer-outline" size={16} color={colors.text} />
                      <Text style={[styles.tertiaryButtonText, { color: colors.text }]}>
                        {isArabic ? "تغيير الوقت" : "Change Timer"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.tertiaryButton, { borderColor: colors.danger + '40' }]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        if (currentTodoId) removeTimer({ id: currentTodoId });
                        setIsEditingTimer(false);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      <Text style={[styles.tertiaryButtonText, { color: colors.danger }]}>
                        {isArabic ? "إزالة" : "Remove"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}



              {/* Status Section */}
              <View style={[styles.section, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{isArabic ? "الحالة" : "Status"}</Text>
                
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 4, borderRadius: 12 }, isArabic && { flexDirection: 'row-reverse' }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setStatus('in_progress');
                      if (currentTodoId) {
                        if (todo?.timerDuration && todo.timerDuration > 0) {
                          startTimer({ id: currentTodoId });
                        } else {
                          updateStatus({ id: currentTodoId, status: 'in_progress' });
                        }
                      }
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: status === 'in_progress' ? '#f85d08' : 'transparent', backgroundColor: status === 'in_progress' ? '#f85d08' : 'transparent' }}
                  >
                    <Ionicons name="play" size={14} color={status === 'in_progress' ? '#FFF' : colors.textMuted} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: status === 'in_progress' ? '#FFF' : colors.textMuted }}>{t.inProgress}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setStatus('done');
                      if (currentTodoId) updateStatus({ id: currentTodoId, status: 'done' });
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: status === 'done' ? colors.success : 'transparent', backgroundColor: status === 'done' ? colors.success : 'transparent' }}
                  >
                    <Ionicons name="checkmark-circle" size={14} color={status === 'done' ? '#FFF' : colors.textMuted} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: status === 'done' ? '#FFF' : colors.textMuted }}>{t.done}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setStatus('not_done');
                      if (currentTodoId) updateStatus({ id: currentTodoId, status: 'not_done' });
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: status === 'not_done' ? '#ff0000' : 'transparent', backgroundColor: status === 'not_done' ? '#ff0000' : 'transparent' }}
                  >
                    <Ionicons name="close-circle" size={14} color={status === 'not_done' ? '#FFF' : colors.textMuted} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: status === 'not_done' ? '#FFF' : colors.textMuted }}>{t.notDone}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Priority Section */}
              <View style={[styles.section, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{isArabic ? "الأولوية" : "Priority"}</Text>
                <View style={[styles.priorityPills, isArabic && { flexDirection: 'row-reverse' }]}>
                  {['Low', 'Medium', 'High'].map((p) => (
                    <TouchableOpacity 
                      key={p} 
                      style={[
                        styles.priorityPill, 
                        { backgroundColor: priority === p ? (p === 'High' ? colors.danger : p === 'Medium' ? colors.warning : colors.primary) + '20' : colors.surface },
                        priority === p && { borderColor: p === 'High' ? colors.danger : p === 'Medium' ? colors.warning : colors.primary }
                      ]}
                      onPress={() => handleUpdatePriority(p)}
                    >
                      <Text style={[styles.priorityText, { color: priority === p ? (isDarkMode ? '#FFFFFF' : (p === 'High' ? colors.danger : p === 'Medium' ? colors.warning : colors.primary)) : colors.textMuted }]}>
                        {p === 'Low' ? (isArabic ? 'منخفضة' : 'Low') : p === 'Medium' ? (isArabic ? 'متوسطة' : 'Med') : (isArabic ? 'عالية' : 'High')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View style={[styles.section, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{isArabic ? "الوصف" : "Description"}</Text>

                <TextInput
                  style={[styles.descriptionInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={description}
                  onChangeText={setDescription}
                  onBlur={saveDescription}
                  multiline
                  placeholder={isArabic ? "أضف وصفاً هنا..." : "Add details here..."}
                  placeholderTextColor={isDarkMode ? "#FFFFFF40" : "#00000040"}

                />
              </View>

              {/* Subtasks Section */}
              <View style={[styles.section, { marginTop: 24 }]}>
                <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText, marginBottom: 0 }]}>{isArabic ? "المهام الفرعية" : "Subtasks"}</Text>

                  <Text style={{ fontSize: 12, fontWeight: '700', color: projectColor }}>
                    {subtasks?.filter(s => s.status === 'done').length || 0}/{subtasks?.length || 0}
                  </Text>
                </View>
                
                <View style={[styles.subtaskList, { gap: 10 }]}>
                    {subtasks?.map((sub) => (
                    <SubtaskRow
                      key={sub._id}
                      sub={sub}
                      parentTimerDuration={todo?.timerDuration}
                      onStartSubtask={handleStartSubtask}
                      onPauseSubtask={handlePauseSubtask}
                      onToggleComplete={handleToggleSubComplete}
                      onDelete={handleDeleteSub}
                      onSetTimer={handleSetSubTimer}
                      onUpdateText={handleUpdateSubText}
                      onUpdateStatus={(id, status) => updateStatus({ id, status })}
                      onSelect={(id) => openSubtaskDetail(id)}
                    />
                  ))}

                  <View style={[{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: projectColor + '30', overflow: 'hidden' }]}>
                    <View style={[styles.addSubtaskContainer, { borderBottomWidth: showNewSubTimerPicker ? 1 : 0, borderBottomColor: colors.border + '20' }, isArabic && { flexDirection: 'row-reverse' }]}>
                      <TextInput
                        style={[styles.addSubtaskInput, { color: colors.text }, isArabic && { textAlign: 'right' }]}
                        placeholder={isArabic ? "إضافة مهمة فرعية..." : "Add a subtask..."}
                        placeholderTextColor={isDarkMode ? "#FFFFFF40" : "#00000040"}
                        value={newSubtaskText}
                        onChangeText={setNewSubtaskText}
                        onSubmitEditing={() => {
                          if (newSubtaskText.trim()) {
                            if (newSubDuration) handleAddSubtask();
                            else setShowNewSubTimerPicker(true);
                          }
                        }}
                      />

                      <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity 
                          onPress={() => setShowNewSubTimerPicker(!showNewSubTimerPicker)}
                          style={newSubDuration ? { backgroundColor: projectColor + '20', padding: 4, borderRadius: 6 } : {}}
                        >
                          <Ionicons name="timer-outline" size={22} color={newSubDuration ? projectColor : colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleAddSubtask}>
                          <Ionicons name="add-circle" size={32} color={projectColor} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {showNewSubTimerPicker && (
                      <View style={{ padding: 12, backgroundColor: colors.bg + '50' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase' }}>
                          {isArabic ? "ضبط وقت المهمة الفرعية" : "Subtask Duration"}
                        </Text>
                        
                        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, isArabic && { flexDirection: 'row-reverse' }]}>
                          <View style={{ alignItems: 'center', gap: 4 }}>
                            <TextInput
                              style={{ width: 60, height: 44, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.text, textAlign: 'center', fontSize: 18, fontWeight: '800' }}
                              keyboardType="numeric"
                              value={newSubHours}
                              onChangeText={setNewSubHours}
                              maxLength={2}
                              selectTextOnFocus
                            />
                            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>{t.hours}</Text>
                          </View>
                          
                          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, marginTop: -15 }}>:</Text>
                          
                          <View style={{ alignItems: 'center', gap: 4 }}>
                            <TextInput
                              style={{ width: 60, height: 44, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.text, textAlign: 'center', fontSize: 18, fontWeight: '800' }}
                              keyboardType="numeric"
                              value={newSubMinutes}
                              onChangeText={setNewSubMinutes}
                              maxLength={2}
                              selectTextOnFocus
                            />
                            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>{t.minutes}</Text>
                          </View>

                          <TouchableOpacity 
                            onPress={() => {
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              setNewSubHours("0");
                              setNewSubMinutes("0");
                              setShowNewSubTimerPicker(false);
                            }}
                            style={{ marginLeft: 'auto', padding: 8 }}
                          >
                            <Ionicons name="close-circle" size={24} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>

            </ScrollView>
          )}

          </KeyboardAvoidingView>

          {/* Bottom Action */}
          <View style={[styles.footer, { borderTopColor: colors.border + '40', backgroundColor: colors.bg }]}>
            <TouchableOpacity style={[styles.doneButton, { backgroundColor: projectColor }]} onPress={handleClose}>
              <Text style={[styles.doneButtonText, { color: isDarkMode ? '#000' : '#FFF' }]}>{isArabic ? "تم" : "Done"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '92%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  timerPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  timerPreset: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerPresetText: {
    fontSize: 13,
    fontWeight: '800',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 16,
  },
  projectBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  titleInput: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    padding: 0,
    minHeight: 44,
  },
  rowSection: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 28,
  },
  halfSection: {
    flex: 1,
  },
  customTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  customTimerInputGroup: {
    alignItems: 'center',
  },
  customTimerInput: {
    width: 60,
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  customTimerSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  customTimerColon: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: -16,
  },
  customTimerSaveButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  deadlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  deadlineButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 32,
    padding: 24,
    alignSelf: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  mainControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mainControlButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
    justifyContent: 'center',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minWidth: 130,
    justifyContent: 'center',
  },
  tertiaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
  },
  priorityPills: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '800',
  },
  descriptionInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  subtaskList: {
    gap: 10,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  subtaskText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  addSubtaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addSubtaskInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    height: 40,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
  },
  doneButton: {
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
  doneButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
});

export default TaskDetailModal;
