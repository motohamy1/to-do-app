import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import useTheme from '@/hooks/useTheme';
import { useTranslation } from '@/utils/i18n';
import { getServerNow } from '@/utils/offlineStorage';
import { buildPauseUpdates, buildSubtaskPauseUpdates, buildSubtaskStartUpdates, startUpdate } from '@/utils/timerActions';
import { scheduleReminderNotification, showTaskCompletedNotification } from '@/utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { useKeyboard } from '@/hooks/useKeyboard';
import { InlineTimerPicker } from './InlineTimerPicker';
import UniversalLinkPickerModal, { UniversalLinkSelection } from './UniversalLinkPickerModal';
import SmartHashtagModal, { MatchedEntity } from './SmartHashtagModal';
import { useConvex } from 'convex/react';
import { SubtaskRow } from './SubtaskRow';


interface TaskDetailModalProps {
  visible: boolean;
  onClose: () => void;
  todoId: Id<"todos"> | null;
  initialDate?: number;
  projectId?: Id<"projects">;
  initialSection?: 'subtask';
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ visible, onClose, todoId, initialDate, projectId, initialSection }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const subtaskSectionY = useRef<number>(0);
  const subtaskInputRef = useRef<TextInput>(null);
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const { height: screenHeight } = useWindowDimensions();
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const convex = useConvex();

  // --- Task Nesting (Back Stack) ---
  const [taskStack, setTaskStack] = useState<Id<"todos">[]>([]);
  const currentTodoId = taskStack.length > 0 ? taskStack[taskStack.length - 1] : todoId;
  const todo = useOfflineQuery<any>('todos.getById', api.todos.getById, currentTodoId ? { id: currentTodoId } : "skip");
  const subtasks = useOfflineQuery<any[]>('todos.getSubtasks', api.todos.getSubtasks, currentTodoId ? { parentId: currentTodoId } : "skip");
  const checklistItems = useOfflineQuery<any[]>('todos.getTaskChecklists', api.todos.getTaskChecklists, currentTodoId ? { todoId: currentTodoId } : "skip");
  const [draftLink, setDraftLink] = useState<{ type?: string; categoryId?: string; subCategoryId?: string; projectId?: string; goalId?: string } | null>(null);

  const resolvedProjectId = currentTodoId ? todo?.projectId : (draftLink?.projectId || projectId);
  const resolvedCategoryId = currentTodoId ? todo?.categoryId : draftLink?.categoryId;
  const resolvedSubCategoryId = currentTodoId ? todo?.subCategoryId : draftLink?.subCategoryId;
  const resolvedGoalId = currentTodoId ? todo?.goalId : draftLink?.goalId;

  const project = useOfflineQuery<any>('projects.getProjectMetadata', api.projects.getProjectMetadata, resolvedProjectId ? { id: resolvedProjectId } : "skip");
  const linkedCategory = useOfflineQuery<any>('projects.getCategory', api.projects.getCategory, resolvedCategoryId ? { id: resolvedCategoryId } : "skip");
  const linkedSubCategory = useOfflineQuery<any>('projects.getSubCategory', api.projects.getSubCategory, resolvedSubCategoryId ? { id: resolvedSubCategoryId } : "skip");
  const linkedGoal = useOfflineQuery<any>('yearlyGoals.getGoal', api.yearlyGoals.getGoal, resolvedGoalId ? { id: resolvedGoalId } : "skip");

  // Smart hashtag matching state
  const [smartTagMatch, setSmartTagMatch] = useState<MatchedEntity | null>(null);
  const [isSmartModalVisible, setIsSmartModalVisible] = useState(false);
  const [pendingTagToResolve, setPendingTagToResolve] = useState('');

  const updateTodo = useOfflineMutation(api.todos.updateTodo, "todos:updateTodo");
  const linkTask = useOfflineMutation(api.todos.linkTask, "todos:linkTask");
  const updateStatus = useOfflineMutation(api.todos.updateStatus, "todos:updateStatus");
  const setTimer = useOfflineMutation(api.todos.setTimer, "todos:setTimer");
  const setTimerRunState = useOfflineMutation(api.todos.setTimerRunState, "todos:setTimerRunState");
  const resetTimer = useOfflineMutation(api.todos.resetTimer, "todos:resetTimer");
  const removeTimer = useOfflineMutation(api.todos.removeTimer, "todos:removeTimer");
  const addTodo = useOfflineMutation(api.todos.addTodo, "todos:addTodo");
  const deleteTodo = useOfflineMutation(api.todos.deleteTodo, "todos:deleteTodo");
  const addCheckItem = useOfflineMutation(api.todos.addTaskChecklistItem, "todos:addTaskChecklistItem");
  const toggleCheckItem = useOfflineMutation(api.todos.toggleTaskChecklistItem, "todos:toggleTaskChecklistItem");
  const deleteCheckItem = useOfflineMutation(api.todos.deleteTaskChecklistItem, "todos:deleteTaskChecklistItem");

  const [editText, setEditText] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [status, setStatus] = useState<string>("not_started");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [timerDirection, setTimerDirection] = useState<'up'|'down'>('down');
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [datePickerMode, setDatePickerMode] = useState<'date'|'time'>('date');
  const [dueDate, setDueDate] = useState<number | undefined>(undefined);

  useEffect(() => {

    let interval: any;
    if (todo?.status === 'in_progress' && todo?.timerStartTime) {
      const tick = () => {
        const elapsed = Math.max(0, getServerNow() - todo.timerStartTime!);
        if (todo.timerDirection === 'up') {
          setTimeLeft(elapsed);
        } else if (todo.timerDuration) {
          setTimeLeft(Math.max(0, todo.timerDuration - elapsed));
        }
      };
      tick();
      interval = setInterval(tick, 1000);
    } else if (todo?.status === 'paused' && todo?.timeLeftAtPause !== undefined) {
      setTimeLeft(todo.timeLeftAtPause);
    } else if (todo?.status === 'done') {
      // Show total elapsed time for completed tasks
      if (todo?.timerDirection === 'up') {
        setTimeLeft(todo?.timeLeftAtPause || 0);
      } else {
        setTimeLeft(todo?.timerDuration || 0);
      }
    } else {
      const computedMs = (parseInt(hours) || 0) * 3600000 + (parseInt(minutes) || 0) * 60000;
      const tDuration = todo?.timerDuration || computedMs;
      const tDirection = todo?.timerDirection || timerDirection;
      setTimeLeft(tDirection === 'up' ? 0 : tDuration);
    }
    return () => clearInterval(interval);
  }, [todo?.status, todo?.timerStartTime, todo?.timerDuration, todo?.timeLeftAtPause, todo?.timerDirection, timerDirection, hours, minutes]);


  // Only initialize form state when navigating to a *different* task
  const [initializedForId, setInitializedForId] = useState<string | null>(null);
  useEffect(() => {
    if (todo && !Array.isArray(todo) && todo._id !== initializedForId) {
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
      setTimerDirection(todo.timerDirection || 'down');
      setHashtags(todo.hashtags || []);
      setInitializedForId(todo._id);
    }
  }, [todo?._id]);

  // Keep local status in sync with server-side changes (e.g. timer resume sets in_progress)
  useEffect(() => {
    if (todo?.status && todo.status !== status) {
      setStatus(todo.status);
    }
  }, [todo?.status]);

  // Reset to blank draft when modal opens with no todoId
  useEffect(() => {
    if (visible && !todoId) {
      setEditText("");
      setDescription("");
      setHours("0");
      setMinutes("0");
      setDueDate(undefined);
      setStatus("not_started");
      setNewSubtaskText("");
      setIsEditingTimer(false);
      setTimerDirection('down');
      setInitializedForId(null);
      setPendingSubtasks([]);
      setHashtags([]);
      setNewHashtag("");
      setDraftLink(projectId ? { type: 'project', projectId } : null);
    }
  }, [visible, todoId, projectId]);

  useEffect(() => {
    if (visible && initialSection === 'subtask') {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: subtaskSectionY.current, animated: true });
        setTimeout(() => subtaskInputRef.current?.focus(), 150);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [visible, initialSection]);

  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
    }
  }, [visible]);

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (todoId) {
      saveText();
      saveDescription();
    } else if (editText.trim() && userId) {
      // Create new task from draft
      const h = parseInt(hours) || 0;
      const m = parseInt(minutes) || 0;
      const ms = (h * 3600 + m * 60) * 1000;
      
      addTodo({
        userId,
        text: editText.trim(),
        description: description.trim(),
        priority: priority,
        date: initialDate || Date.now(),
        dueDate: dueDate,
        status: status,
        ...(draftLink?.categoryId ? { categoryId: draftLink.categoryId as any } : {}),
        ...(draftLink?.subCategoryId ? { subCategoryId: draftLink.subCategoryId as any } : {}),
        ...(draftLink?.projectId ? { projectId: draftLink.projectId } : projectId ? { projectId } : {}),
        ...(draftLink?.goalId ? { goalId: draftLink.goalId as any } : {}),
        ...(hashtags.length > 0 ? { hashtags } : {}),
        ...(timerDirection === 'up' ? { timerDirection: 'up' } : ms > 0 ? { timerDuration: ms, timerDirection: 'down' } : {}),
      }).then((parentIdResult: any) => {
        const parentId = typeof parentIdResult === 'string' ? parentIdResult : parentIdResult?._id;
        for (const sub of pendingSubtasks) {
          addTodo({
            userId: userId!,
            text: sub.text,
            parentId,
            status: "not_started",
            ...(projectId ? { projectId } : {}),
            ...(sub.timerDuration ? { timerDuration: sub.timerDuration } : {}),
            ...(sub.timerDirection ? { timerDirection: sub.timerDirection } : {})
          }).catch(() => {});
        }
      }).catch((e: any) => console.warn('Offline add todo error', e));
    }
    
    setTaskStack([]);
    setInitializedForId(null);
    setPendingSubtasks([]);
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

  const handleSelectLink = (selection: UniversalLinkSelection) => {
    if (!currentTodoId) {
      if (selection.type === 'none') {
        setDraftLink(null);
      } else if (selection.type === 'goal') {
        setDraftLink(prev => ({ ...prev, goalId: selection.goalId }));
      } else if (selection.type === 'category') {
        setDraftLink(prev => ({ ...prev, categoryId: selection.categoryId, subCategoryId: undefined, projectId: undefined }));
      } else if (selection.type === 'subCategory') {
        setDraftLink(prev => ({ ...prev, categoryId: selection.categoryId, subCategoryId: selection.subCategoryId, projectId: undefined }));
      } else if (selection.type === 'project') {
        setDraftLink(prev => ({ ...prev, projectId: selection.projectId, categoryId: undefined, subCategoryId: undefined }));
      }
      return;
    }
    if (selection.type === 'none') {
      linkTask({ id: currentTodoId, categoryId: undefined, subCategoryId: undefined, projectId: undefined, goalId: undefined });
    } else if (selection.type === 'goal') {
      linkTask({ id: currentTodoId, goalId: selection.goalId, categoryId: todo?.categoryId, subCategoryId: todo?.subCategoryId, projectId: todo?.projectId });
    } else if (selection.type === 'category') {
      linkTask({ id: currentTodoId, categoryId: selection.categoryId, subCategoryId: undefined, projectId: undefined, goalId: todo?.goalId });
    } else if (selection.type === 'subCategory') {
      linkTask({ id: currentTodoId, categoryId: selection.categoryId, subCategoryId: selection.subCategoryId, projectId: undefined, goalId: todo?.goalId });
    } else if (selection.type === 'project') {
      linkTask({ id: currentTodoId, categoryId: undefined, subCategoryId: undefined, projectId: selection.projectId, goalId: todo?.goalId });
    }
  };

  // Smart hashtag resolution
  const checkAndAddHashtag = async (tagText: string) => {
    const cleaned = tagText.trim().replace(/^#/, '').toLowerCase();
    if (!cleaned) return;
    if (hashtags.includes(cleaned)) {
      setNewHashtag('');
      return;
    }

    if (userId) {
      try {
        const match = await convex.query(api.topics.matchHashtag, { userId, tag: cleaned });
        if (match && match.match) {
          setPendingTagToResolve(cleaned);
          setSmartTagMatch(match as any);
          setIsSmartModalVisible(true);
          return;
        }
      } catch (err) {
        console.warn('Error matching hashtag:', err);
      }
    }

    // Default: add directly as plain tag
    addTagDirectly(cleaned);
  };

  const addTagDirectly = (tagText: string) => {
    if (!hashtags.includes(tagText)) {
      const newTags = [...hashtags, tagText];
      setHashtags(newTags);
      if (currentTodoId) updateTodo({ id: currentTodoId, hashtags: newTags });
    }
    setNewHashtag('');
  };

  const handleSmartLinkDirectly = (entity: MatchedEntity, tagText: string) => {
    addTagDirectly(tagText);
    if (entity.type === 'space') {
      handleSelectLink({ type: 'category', categoryId: entity.id as any });
    } else if (entity.type === 'project') {
      handleSelectLink({ type: 'project', projectId: entity.id });
    } else if (entity.type === 'goal') {
      handleSelectLink({ type: 'goal', goalId: entity.id as any });
    }
  };

  const openSubtaskDetail = (id: Id<"todos">) => {
    setTaskStack(prev => [...prev, id]);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const saveText = () => {
    if (currentTodoId) {
      if (!editText.trim()) {
        setEditText(todo?.text || "");
        Keyboard.dismiss();
        return;
      }
      if (editText !== todo?.text) {
        updateTodo({ id: currentTodoId, text: editText.trim() });
        import('@/utils/notifications').then(n => n.updateTimerNotificationText(currentTodoId, editText.trim(), false, isArabic ? 'ar' : 'en'));
      }
      Keyboard.dismiss();
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

  const [newSubDuration, setNewSubDuration] = useState<number | undefined>(undefined);
  const [newSubDirection, setNewSubDirection] = useState<string>('down');
  const [showNewSubTimerPicker, setShowNewSubTimerPicker] = useState(false);
  const [pendingSubtasks, setPendingSubtasks] = useState<{text: string, timerDuration?: number, timerDirection?: string}[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [isAddingCheck, setIsAddingCheck] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [isProjectModalVisible, setProjectModalVisible] = useState(false);
  const [projectModalTab, setProjectModalTab] = useState<'spaces' | 'goals'>('spaces');

  const computedTimerMs = useMemo(() => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    return (h * 3600 + m * 60) * 1000;
  }, [hours, minutes]);

  const effectiveTimerDuration = todo?.timerDuration || computedTimerMs;
  const effectiveTimerDirection = todo?.timerDirection || timerDirection;

  // Remaining timer budget for new subtasks in modal
  const modalSubBudget = useMemo(() => {
    if (!todo?.timerDuration || !subtasks) return undefined;
    const usedDuration = subtasks.reduce((sum: number, s: any) => sum + (s.timerDuration || 0), 0);
    return Math.max(0, todo.timerDuration - usedDuration);
  }, [todo?.timerDuration, subtasks]);

  // Subtask handlers for SubtaskRow
  const handleStartSubtask = (id: Id<"todos">) => {
    const sub = (subtasks || []).find((s: any) => s._id === id);
    if (!sub) return;
    setTimerRunState({ updates: buildSubtaskStartUpdates(sub, todo) });
  };
  const handlePauseSubtask = (id: Id<"todos">) => {
    const sub = (subtasks || []).find((s: any) => s._id === id);
    if (!sub) return;
    const updates = buildSubtaskPauseUpdates(sub, subtasks || [], todo);
    if (updates.length > 0) setTimerRunState({ updates });
  };
  const handleToggleSubComplete = (id: Id<"todos">, currentStatus: string) => 
    updateStatus({ id, status: currentStatus === 'done' ? 'not_started' : 'done' });
  const handleDeleteSub = (id: Id<"todos">) => deleteTodo({ id });
  const handleSetSubTimer = (id: Id<"todos">, ms: number, direction: string) => 
    setTimer({ id, duration: ms, timerDirection: direction });
  const handleUpdateSubText = (id: Id<"todos">, text: string) => {
    updateTodo({ id, text });
    import('@/utils/notifications').then(n => n.updateTimerNotificationText(id, text, true, isArabic ? 'ar' : 'en'));
  };

  const handleAddCheckItem = () => {
    if (!newCheckItem.trim() || !userId || !currentTodoId) return;
    addCheckItem({ userId, todoId: currentTodoId, text: newCheckItem.trim() });
    setNewCheckItem('');
    setIsAddingCheck(false);
  };

  const handleAddSubtask = () => {
    if (newSubtaskText.trim() && userId) {
      if (currentTodoId) {
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
          status: "not_started",
          projectId: todo?.projectId,
          ...(newSubDuration && { timerDuration: newSubDuration }),
          ...(newSubDirection === 'up' && { timerDirection: 'up' })
        });
      } else {
        // Pending logic
        const h = parseInt(hours) || 0;
        const m = parseInt(minutes) || 0;
        const parentDurMs = (h * 3600 + m * 60) * 1000;
        const usedDuration = pendingSubtasks.reduce((sum, s) => sum + (s.timerDuration || 0), 0);
        const available = Math.max(0, parentDurMs - usedDuration);
        
        if (newSubDuration && parentDurMs > 0 && newSubDuration > available) {
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

        setPendingSubtasks(prev => [...prev, { text: newSubtaskText.trim(), timerDuration: newSubDuration, timerDirection: newSubDirection === 'up' ? 'up' : undefined }]);
      }
      setNewSubtaskText("");
      setNewSubDuration(undefined);
      setNewSubDirection('down');
      setShowNewSubTimerPicker(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const handleSaveCustomTimer = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const ms = (h * 3600 + m * 60) * 1000;
    if (currentTodoId) {
      setTimer({ id: currentTodoId, duration: ms, timerDirection: 'down' });
    }
    setIsEditingTimer(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      if (datePickerMode === 'date') {
        const d = new Date(selectedDate);
        d.setHours(23, 59, 59, 0); // Default to end of day to mark date-only
        const time = d.getTime();
        setDueDate(time);
        if (currentTodoId) {
          setTimer({ id: currentTodoId, dueDate: time });
          scheduleReminderNotification(editText || todo?.text || "", time, isArabic ? 'ar' : 'en');
        }
      } else if (datePickerMode === 'time') {
        const baseDate = dueDate ? new Date(dueDate) : new Date();
        baseDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0); // 0 seconds implies time is set
        const time = baseDate.getTime();
        setDueDate(time);
        if (currentTodoId) {
          setTimer({ id: currentTodoId, dueDate: time });
          scheduleReminderNotification(editText || todo?.text || "", time, isArabic ? 'ar' : 'en');
        }
      }
    }
  };

  const hasDeadlineTime = dueDate ? new Date(dueDate).getSeconds() !== 59 : false;

  const linkedItem = project || linkedSubCategory || linkedCategory;
  const projectColor = linkedItem?.color || '#e5f19d';
  const isLightAccent = projectColor === '#e5f19d' || projectColor === '#F9A8D4';
  const projectTextColor = isLightAccent ? '#101116' : colors.primaryText;
  const linkedItemName = project?.name || linkedSubCategory?.name || linkedCategory?.name;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleBack} statusBarTranslucent={true}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleBack}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View 
          style={[
            styles.container, 
            { 
              backgroundColor: colors.bg,
              marginBottom: keyboardHeight,
              maxHeight: isKeyboardVisible 
                ? Math.max(300, screenHeight - keyboardHeight - (Platform.OS === 'ios' ? 44 : 28)) 
                : '92%',
            }
          ]}
        >
            {/* Header */}
           <View style={[styles.header, { borderBottomColor: colors.border + '40' }]}>
            <TouchableOpacity onPress={handleBack} style={styles.headerIcon}>
              <Ionicons name={taskStack.length > 0 ? (isArabic ? "chevron-forward" : "chevron-back") : "close"} size={28} color={colors.text} />
            </TouchableOpacity>
            
            <View style={{ flex: 1, alignItems: 'center' }}>
               <View style={[styles.breadcrumb]}>
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
            <ScrollView 
              ref={scrollViewRef} 
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent} 
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled"
            >
              
              {/* Linked Item Badge */}
              {linkedItem && (
                <View style={[styles.projectBadge, { backgroundColor: projectColor + '15', borderColor: projectColor + '30' }]}>
                  <Ionicons name="folder-open-outline" size={14} color={projectColor} />
                  <Text style={[styles.projectBadgeText, { color: projectColor }]}>{linkedItemName}</Text>
                </View>
              )}

              {/* Task Title Input */}
              <View style={[styles.section]}>
                <TextInput
                  style={[styles.titleInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left', textAlignVertical: 'top' }]}
                  value={editText}
                  onChangeText={setEditText}
                  blurOnSubmit={true}
                  onBlur={saveText}
                  multiline
                  scrollEnabled={true}
                  placeholder={isArabic ? "عنوان المهمة..." : "Task Title..."}
                  placeholderTextColor={isDarkMode ? colors.surfaceText + '40' : colors.text + '40'}
                />
              </View>

              {/* Timer Section Selection */}
              {(!effectiveTimerDuration && effectiveTimerDirection !== 'up') && !isEditingTimer && (
                <View style={[styles.section]}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{t.timer}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity 
                      style={[styles.deadlineButton, { flex: 1, borderColor: projectColor + '60', backgroundColor: projectColor + '10' }]}
                      onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setTimerDirection('down');
                          setIsEditingTimer(true);
                      }}
                    >
                      <Ionicons name="timer-outline" size={20} color={projectColor} />
                      <Text style={[styles.deadlineButtonText, { color: colors.text, fontWeight: '700' }]}>
                        {isArabic ? 'مؤقت تنازلي' : 'Count Down'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.deadlineButton, { flex: 1, borderColor: projectColor + '60', backgroundColor: projectColor + '10' }]}
                      onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setTimerDirection('up');
                          if (currentTodoId) {
                            setTimer({ id: currentTodoId, duration: 0, timerDirection: 'up' });
                          }
                      }}
                    >
                      <Ionicons name="stopwatch-outline" size={20} color={projectColor} />
                      <Text style={[styles.deadlineButtonText, { color: colors.text, fontWeight: '700' }]}>
                        {isArabic ? 'مؤقت تصاعدي' : 'Count Up'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {isEditingTimer && (
                <View style={[styles.section]}>
                  <View style={[styles.sectionHeader]}>
                    <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{t.timer}</Text>

                    <TouchableOpacity onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setIsEditingTimer(false);
                    }}>
                      <Text style={{ fontSize: 13, color: colors.danger, fontWeight: '700' }}>{t.cancel}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Custom Timer Input Row */}
                  <View style={[styles.customTimerRow]}>
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
                      <Ionicons name="checkmark" size={20} color={projectTextColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Deadline Selection */}
              <View style={[styles.section]}>
                <View style={[styles.sectionHeader]}>
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
                  style={[styles.deadlineButton, { borderColor: dueDate ? projectColor : colors.border, backgroundColor: dueDate ? projectColor + '10' : 'transparent' }]}
                  onPress={() => { setDatePickerMode('date'); setShowDatePicker(true); }}
                >
                  <Ionicons name="calendar-outline" size={20} color={dueDate ? projectColor : colors.textMuted} />
                  <Text style={[styles.deadlineButtonText, { color: dueDate ? colors.text : colors.textMuted }]}>
                    {dueDate ? new Date(dueDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : (isArabic ? 'تحديد تاريخ الموعد النهائي' : 'Set a deadline date')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>

                {dueDate && (
                  <View style={{ marginTop: 12 }}>
                    
                    <TouchableOpacity 
                      style={[styles.deadlineButton, { borderColor: hasDeadlineTime ? projectColor : colors.border, backgroundColor: hasDeadlineTime ? projectColor + '10' : 'transparent' }]}
                      onPress={() => { setDatePickerMode('time'); setShowDatePicker(true); }}
                    >
                      <Ionicons name="time-outline" size={20} color={hasDeadlineTime ? projectColor : colors.textMuted} />
                      <Text style={[styles.deadlineButtonText, { color: hasDeadlineTime ? colors.text : colors.textMuted }]}>
                        {hasDeadlineTime ? new Date(dueDate).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' }) : (isArabic ? 'إضافة وقت (اختياري)' : 'Add time (optional)')}
                      </Text>
                      {hasDeadlineTime && (
                        <TouchableOpacity onPress={(e) => {
                          e.stopPropagation();
                          const d = new Date(dueDate);
                          d.setHours(23, 59, 59, 0);
                          setDueDate(d.getTime());
                          if (currentTodoId) setTimer({ id: currentTodoId, dueDate: d.getTime() });
                        }} style={{ padding: 4 }}>
                           <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                      {!hasDeadlineTime && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
                    </TouchableOpacity>
                  </View>
                )}

                {showDatePicker && (
                  <DateTimePicker
                    value={dueDate ? new Date(dueDate) : new Date()}
                    mode={datePickerMode}
                    display="default"
                    themeVariant={isDarkMode ? 'dark' : 'light'}
                    onChange={onDateChange}
                    minimumDate={datePickerMode === 'date' ? new Date() : undefined}
                  />
                )}
              </View>

              {(effectiveTimerDuration > 0 || effectiveTimerDirection === 'up') && !isEditingTimer && (() => {
                const isCountUp = effectiveTimerDirection === 'up';
                return (
                <View style={styles.timerContainer}>
                  <Svg width="200" height="200" viewBox="0 0 220 220">
                    <G rotation="-90" origin="110, 110">
                      {/* Background Circle */}
                      <Circle
                        cx="110"
                        cy="110"
                        r="90"
                        stroke={isDarkMode ? colors.border : colors.border}
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
                        strokeDasharray={isCountUp ? "565, 565" : `${(timeLeft / (effectiveTimerDuration || 1)) * 565}, 565`}
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
                      {isCountUp && timeLeft >= 3600000
                        ? `${Math.floor(timeLeft / 3600000)}:${String(Math.floor((timeLeft % 3600000) / 60000)).padStart(2, '0')}:${String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}`
                        : `${Math.floor(timeLeft / 60000)}:${String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}`}
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
                      {todo?.status === 'in_progress' ? (isArabic ? 'جاهز؟ ركز!' : 'Stay Focused') : todo?.status === 'done' ? (isArabic ? '✔️ مكتمل' : 'Completed') : (isArabic ? 'جاهز للبدء؟' : 'Ready to start?')}
                    </SvgText>
                  </Svg>

                  <View style={[styles.timerControls]}>
                    <TouchableOpacity 
                      style={[styles.mainControlButton, { backgroundColor: projectColor }]}
                      onPress={() => {
                        if (!currentTodoId) {
                          handleClose();
                        } else if (todo?.status === 'in_progress') {
                          const updates = buildPauseUpdates(todo as any, (subtasks || []) as any[]);
                          if (updates.length > 0) setTimerRunState({ updates });
                          else setTimerRunState({ updates: [{ id: currentTodoId, status: 'paused' }] });
                        } else if (todo) {
                          setTimerRunState({ updates: [startUpdate(todo as any)] });
                        }
                      }}
                    >
                      <Ionicons name={!currentTodoId ? "save-outline" : todo?.status === 'in_progress' ? "pause" : "play"} size={22} color={projectTextColor} />
                      <Text style={[styles.mainControlButtonText, { color: projectTextColor }]}>
                        {!currentTodoId ? (isArabic ? 'احفظ للبدء' : 'Save to Start') : todo?.status === 'in_progress' ? (isArabic ? 'إيقاف' : 'Pause Task') : todo?.status === 'paused' ? (isArabic ? 'استئناف المهمة' : 'Resume Task') : (isArabic ? 'ابدأ المهمة' : 'Start Task')}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.secondaryButton, { borderColor: projectColor + '40', backgroundColor: colors.surface, opacity: currentTodoId ? 1 : 0.5 }]}
                      onPress={() => currentTodoId && resetTimer({ id: currentTodoId! })}
                      disabled={!currentTodoId}
                    >
                      <Ionicons name="refresh" size={20} color={projectColor} />
                    </TouchableOpacity>

                    {isCountUp && (
                      <TouchableOpacity 
                        style={[styles.secondaryButton, { borderColor: colors.success + '40', backgroundColor: isDarkMode ? colors.success + '26' : colors.success + '1A' }]}
                        onPress={() => {
                          if (currentTodoId) {
                            updateStatus({ id: currentTodoId, status: 'done' });
                            showTaskCompletedNotification(todo?.text || editText, isArabic ? 'ar' : 'en');
                          }
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      </TouchableOpacity>
                    )}
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
                        setTimerDirection('down');
                        setHours("0");
                        setMinutes("0");
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
                );
              })()}



              {/* Status Section */}
              <View style={[styles.section]}>
                <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{isArabic ? "الحالة" : "Status"}</Text>
                
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDarkMode ? colors.surfaceText + '08' : colors.text + '05', padding: 4, borderRadius: 12 }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setStatus('in_progress');
                      if (currentTodoId) {
                        if ((todo?.timerDuration && todo.timerDuration > 0) || todo?.timerDirection === 'up') {
                          setTimerRunState({ updates: [startUpdate(todo as any)] });
                        } else {
                          updateStatus({ id: currentTodoId, status: 'in_progress' });
                        }
                      }
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: status === 'in_progress' ? colors.warning : 'transparent', backgroundColor: status === 'in_progress' ? colors.warning : 'transparent' }}
                  >
                    <Ionicons name="play" size={14} color={status === 'in_progress' ? '#000' : colors.textMuted} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: status === 'in_progress' ? '#000' : colors.textMuted }}>{t.inProgress}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setStatus('done');
                      if (currentTodoId) {
                        updateStatus({ id: currentTodoId, status: 'done' });
                        showTaskCompletedNotification(todo?.text || editText, isArabic ? 'ar' : 'en');
                      }
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: status === 'done' ? colors.success : 'transparent', backgroundColor: status === 'done' ? colors.success : 'transparent' }}
                  >
                    <Ionicons name="checkmark-circle" size={14} color={status === 'done' ? '#000' : colors.textMuted} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: status === 'done' ? '#000' : colors.textMuted }}>{t.done}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setStatus('not_done');
                      if (currentTodoId) updateStatus({ id: currentTodoId, status: 'not_done' });
                    }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: status === 'not_done' ? colors.danger : 'transparent', backgroundColor: status === 'not_done' ? colors.danger : 'transparent' }}
                  >
                    <Ionicons name="close-circle" size={14} color={status === 'not_done' ? '#000' : colors.textMuted} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: status === 'not_done' ? '#000' : colors.textMuted }}>{t.notDone}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Priority Section */}
              <View style={[styles.section]}>
                <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{isArabic ? "الأولوية" : "Priority"}</Text>
                <View style={[styles.priorityPills]}>
                  {['Low', 'Medium', 'High'].map((p) => (
                    <TouchableOpacity 
                      key={p} 
                      style={[
                        styles.priorityPill, 
                        { backgroundColor: priority === p ? (p === 'High' ? colors.danger : p === 'Medium' ? colors.warning : projectColor) + '20' : colors.surface },
                        priority === p && { borderColor: p === 'High' ? colors.danger : p === 'Medium' ? colors.warning : projectColor }
                      ]}
                      onPress={() => handleUpdatePriority(p)}
                    >
                      <Text style={[styles.priorityText, { color: priority === p ? (isDarkMode ? colors.surfaceText : (p === 'High' ? colors.danger : p === 'Medium' ? colors.warning : projectColor)) : colors.textMuted }]}>
                        {p === 'Low' ? (isArabic ? 'منخفضة' : 'Low') : p === 'Medium' ? (isArabic ? 'متوسطة' : 'Med') : (isArabic ? 'عالية' : 'High')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View style={[styles.section]}>
                <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{isArabic ? "الوصف" : "Description"}</Text>

                <TextInput
                  style={[styles.descriptionInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, textAlign: isArabic ? 'right' : 'left' }]}
                  value={description}
                  onChangeText={setDescription}
                  onBlur={saveDescription}
                  multiline
                  scrollEnabled={true}
                  placeholder={isArabic ? "أضف وصفاً هنا..." : "Add details here..."}
                  placeholderTextColor={isDarkMode ? colors.surfaceText + '40' : colors.text + '40'}
                />
              </View>

              {/* Hashtags Section */}
              <View style={[styles.section]}>
                <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{isArabic ? "العلامات" : "Hashtags"}</Text>
                
                {hashtags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {hashtags.map((tag, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: projectColor + '20', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, gap: 4 }}>
                        <Text style={{ color: projectColor, fontSize: 13, fontWeight: '700' }}>#{tag}</Text>
                        <TouchableOpacity onPress={() => {
                          const newTags = hashtags.filter((_, i) => i !== idx);
                          setHashtags(newTags);
                          if (currentTodoId) updateTodo({ id: currentTodoId, hashtags: newTags });
                        }}>
                          <Ionicons name="close-circle" size={16} color={projectColor} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '700' }}>#</Text>
                  <TextInput 
                    style={{ flex: 1, fontSize: 14, color: colors.text, padding: 0, textAlign: isArabic ? 'right' : 'left' }}
                    placeholder={isArabic ? "أضف علامة..." : "Add a hashtag..."}
                    placeholderTextColor={colors.textMuted}
                    value={newHashtag}
                    onChangeText={setNewHashtag}
                    onFocus={() => { setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150); }}
                    onSubmitEditing={() => {
                      checkAndAddHashtag(newHashtag);
                    }}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={() => {
                    checkAndAddHashtag(newHashtag);
                  }}>
                    <Ionicons name="add-circle" size={24} color={newHashtag.trim() ? projectColor : colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Presets */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {['urgent', 'important', 'idea', 'bug', 'personal', 'work'].map(preset => {
                    if (hashtags.includes(preset)) return null;
                    return (
                      <TouchableOpacity key={preset} onPress={() => {
                        checkAndAddHashtag(preset);
                      }} style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>+{preset}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Link Section */}
              <View style={[styles.section]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText, marginBottom: 0 }]}>{isArabic ? "الارتباطات" : "Links & Context"}</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setProjectModalTab('spaces');
                      setProjectModalVisible(true);
                    }} 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={projectColor} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: projectColor }}>{isArabic ? "تعديل" : "Edit Links"}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 8 }}>
                  {/* Space / Project Badge */}
                  {linkedItem ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: projectColor + '15', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: projectColor + '30' }}>
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}
                        onPress={() => {
                          setProjectModalTab('spaces');
                          setProjectModalVisible(true);
                        }}
                      >
                        <Ionicons name="folder-outline" size={18} color={projectColor} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>{isArabic ? "المساحة / المشروع" : "Space / Project"}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>{linkedItemName}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        if (!currentTodoId) {
                          setDraftLink(prev => ({ ...prev, categoryId: undefined, subCategoryId: undefined, projectId: undefined }));
                        } else {
                          linkTask({ id: currentTodoId, categoryId: undefined, subCategoryId: undefined, projectId: undefined, goalId: todo?.goalId });
                        }
                      }}>
                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.deadlineButton, { borderColor: colors.border, backgroundColor: 'transparent' }]}
                      onPress={() => {
                        setProjectModalTab('spaces');
                        setProjectModalVisible(true);
                      }}
                    >
                      <Ionicons name="folder-open-outline" size={18} color={colors.textMuted} />
                      <Text style={[styles.deadlineButtonText, { color: colors.textMuted, fontSize: 13 }]}>
                        {isArabic ? '+ ربط بمساحة أو مشروع' : '+ Link Space or Project'}
                      </Text>
                      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}

                  {/* Goal Badge */}
                  {linkedGoal ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#8B5CF615', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#8B5CF630' }}>
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}
                        onPress={() => {
                          setProjectModalTab('goals');
                          setProjectModalVisible(true);
                        }}
                      >
                        <Ionicons name="flag-outline" size={18} color="#8B5CF6" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>{isArabic ? "الهدف المرتبط" : "Linked Goal"}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>{linkedGoal.text || linkedGoal.title}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        if (!currentTodoId) {
                          setDraftLink(prev => ({ ...prev, goalId: undefined }));
                        } else {
                          linkTask({ id: currentTodoId, goalId: undefined, categoryId: todo?.categoryId, subCategoryId: todo?.subCategoryId, projectId: todo?.projectId });
                        }
                      }}>
                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.deadlineButton, { borderColor: colors.border, backgroundColor: 'transparent' }]}
                      onPress={() => {
                        setProjectModalTab('goals');
                        setProjectModalVisible(true);
                      }}
                    >
                      <Ionicons name="flag-outline" size={18} color="#8B5CF6" />
                      <Text style={[styles.deadlineButtonText, { color: colors.textMuted, fontSize: 13 }]}>
                        {isArabic ? '+ ربط بهدف' : '+ Link Goal'}
                      </Text>
                      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Checklist Section */}
              {currentTodoId && (
              <View style={[styles.section]}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }} onPress={() => setChecklistOpen(!checklistOpen)}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText, marginBottom: 0 }]}>{isArabic ? "قائمة التحقق" : "Checklist"}</Text>
                  <Ionicons name={checklistOpen ? "chevron-down" : "chevron-forward"} size={20} color={colors.textMuted} />
                </TouchableOpacity>
                {checklistOpen && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {(checklistItems || []).map((item: any) => (
                      <View key={item._id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, gap: 12 }}>
                        <TouchableOpacity onPress={() => toggleCheckItem({ id: item._id })}>
                          <Ionicons 
                            name={item.isCompleted ? "checkbox" : "square-outline"} 
                            size={22} 
                            color={item.isCompleted ? colors.success : colors.border} 
                          />
                        </TouchableOpacity>
                        <Text style={{ flex: 1, fontSize: 14, color: colors.text, textAlign: isArabic ? 'right' : 'left', textDecorationLine: item.isCompleted ? 'line-through' : 'none', opacity: item.isCompleted ? 0.6 : 1 }}>
                          {item.text}
                        </Text>
                        <TouchableOpacity onPress={() => deleteCheckItem({ id: item._id })}>
                          <Ionicons name="close" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {isAddingCheck ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: projectColor + '30', gap: 10 }}>
                        <Ionicons name="square-outline" size={20} color={colors.border} />
                        <TextInput 
                          style={{ flex: 1, fontSize: 14, color: colors.text, fontWeight: '500', padding: 0, textAlign: isArabic ? 'right' : 'left' }}
                          placeholder={isArabic ? "إضافة عنصر..." : "Add checklist item..."}
                          placeholderTextColor={colors.textMuted}
                          value={newCheckItem}
                          onChangeText={setNewCheckItem}
                          onSubmitEditing={handleAddCheckItem}
                          autoFocus
                          onFocus={() => { setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150); }}
                          onBlur={() => { if (!newCheckItem.trim()) setIsAddingCheck(false); }}
                        />
                        <TouchableOpacity onPress={handleAddCheckItem}>
                          <Ionicons name="arrow-up-circle" size={26} color={newCheckItem.trim() ? projectColor : colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 10 }}
                        onPress={() => setIsAddingCheck(true)}
                      >
                        <Ionicons name="add" size={18} color={projectColor} />
                        <Text style={{ fontSize: 14, fontWeight: '500', color: projectColor }}>{isArabic ? "إضافة عنصر للقائمة" : "Add checklist item"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              )}

              {/* Subtasks Section */}
              <View
                style={[styles.section, { marginTop: 24 }]}
                onLayout={(e) => { subtaskSectionY.current = e.nativeEvent.layout.y; }}
              >
                <View style={[styles.sectionHeader]}>
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

                  {pendingSubtasks.map((sub, idx) => (
                    <View key={`pending-${idx}`} style={[styles.subtaskItem, { flexDirection: isArabic ? 'row-reverse' : 'row', opacity: 0.7, padding: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border }]}>
                      <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />
                      <Text style={[styles.subtaskText, { color: colors.text, writingDirection: isArabic ? 'rtl' : 'ltr', flex: 1, marginHorizontal: 8 }]}>{sub.text}</Text>
                      {sub.timerDuration ? (
                        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
                          <Ionicons name="timer-outline" size={14} color={colors.textMuted} />
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>{Math.floor(sub.timerDuration/3600000)}h {Math.floor((sub.timerDuration%3600000)/60000)}m</Text>
                        </View>
                      ) : null}
                      <TouchableOpacity onPress={() => setPendingSubtasks(prev => prev.filter((_, i) => i !== idx))}>
                        <Ionicons name="close-circle" size={20} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={[{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: projectColor + '30', overflow: 'hidden' }]}>
                    <View style={[styles.addSubtaskContainer, { borderBottomWidth: showNewSubTimerPicker ? 1 : 0, borderBottomColor: colors.border + '20' }]}>
                      <TextInput
                        style={[styles.addSubtaskInput, { color: colors.text, minHeight: 40, paddingVertical: Platform.OS === 'ios' ? 8 : 4 }, isArabic && { textAlign: 'right' }]}
                        placeholder={isArabic ? "إضافة مهمة فرعية..." : "Add a subtask..."}
                        placeholderTextColor={isDarkMode ? colors.surfaceText + '40' : colors.text + '40'}
                        multiline={true}
                        blurOnSubmit={true}
                        scrollEnabled={false}
                        ref={subtaskInputRef}
                      value={newSubtaskText}
                        onChangeText={setNewSubtaskText}
                        onFocus={() => { setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150); }}
                        onSubmitEditing={() => {
                          if (newSubtaskText.trim()) {
                            if (newSubDuration || newSubDirection === 'up') handleAddSubtask();
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
                      <View style={{ marginTop: 8 }}>
                        <InlineTimerPicker
                          initialMs={newSubDuration}
                          initialDirection={newSubDirection}
                          maxMs={modalSubBudget}
                          colors={colors}
                          t={t}
                          isArabic={isArabic}
                          accentColor={projectColor}
                          onSave={(ms: number, direction: string) => {
                            setNewSubDuration(ms);
                            setNewSubDirection(direction);
                            setShowNewSubTimerPicker(false);
                          }}
                          onCancel={() => {
                            setNewSubDuration(undefined);
                            setNewSubDirection('down');
                            setShowNewSubTimerPicker(false);
                          }}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>

            </ScrollView>
          )}

          {/* Bottom Action */}
          <View style={[styles.footer, { borderTopColor: colors.border + '40', backgroundColor: colors.bg }]}>
            <TouchableOpacity style={[styles.doneButton, { backgroundColor: projectColor }]} onPress={handleClose}>
              <Text style={[styles.doneButtonText, { color: projectTextColor }]}>{isArabic ? "تم" : "Done"}</Text>
            </TouchableOpacity>
          </View>

          <UniversalLinkPickerModal
            visible={isProjectModalVisible}
            onClose={() => setProjectModalVisible(false)}
            onSelect={handleSelectLink}
            currentCategoryId={resolvedCategoryId}
            currentProjectId={resolvedProjectId}
            currentGoalId={resolvedGoalId}
            initialTab={projectModalTab}
          />

          <SmartHashtagModal
            visible={isSmartModalVisible}
            tag={pendingTagToResolve}
            matchedEntity={smartTagMatch}
            onClose={() => setIsSmartModalVisible(false)}
            onLinkDirectly={handleSmartLinkDirectly}
            onKeepSeparate={(tag) => {
              addTagDirectly(tag);
              setIsSmartModalVisible(false);
            }}
          />
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
    paddingBottom: 100,
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
    fontSize: 16,
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
    fontSize: 16,
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
