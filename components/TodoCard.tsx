import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, LayoutAnimation, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import CircularProgress from './CircularProgress';
import { scheduleTimerNotification, cancelNotification } from '@/utils/notifications';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import TaskDetailModal from './TaskDetailModal';


interface TodoCardProps {
  todo: {
    _id: Id<"todos">;
    text: string;
    status: string;
    timerDuration?: number;
    timerStartTime?: number;
    timeLeftAtPause?: number;
    dueDate?: number;
    projectId?: string;
    date?: number;
    parentId?: Id<"todos">;
    userId?: Id<"users">;
    description?: string;
    location?: string;
    meetingLink?: string;
    priority?: string;
    categoryId?: Id<"projectCategories">;
  };
  onSetTimer: (id: Id<"todos">) => void;
  onLongPress: (id: Id<"todos">) => void;
  onLinkProject: (id: Id<"todos">) => void;
  homeStyles: any;
  depth?: number;
  isTimelineMode?: boolean;
}

// ─── Inline Timer Picker ─────────────────────────────────────────────────────
const InlineTimerPicker = ({
  initialMs,
  onSave,
  onCancel,
  maxMs,
  colors,
  t,
  isArabic
}: {
  initialMs?: number;
  onSave: (ms: number) => void;
  onCancel: () => void;
  maxMs?: number;
  colors: any;
  t: any;
  isArabic: boolean;
}) => {
  const init = initialMs || 0;
  const [hours, setHours] = useState(String(Math.floor(init / 3600000)));
  const [minutes, setMinutes] = useState(String(Math.floor((init % 3600000) / 60000)));

  const handleSave = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const ms = (h * 3600 + m * 60) * 1000;
    if (ms <= 0) {
      Alert.alert(t.invalidTimer, t.setTimerGreater);
      return;
    }
    if (maxMs !== undefined && maxMs > 0 && ms > maxMs) {
      const availH = Math.floor(maxMs / 3600000);
      const availM = Math.floor((maxMs % 3600000) / 60000);
      Alert.alert(t.timerTooLong, `${t.timerExceed} ${availH > 0 ? availH + (isArabic ? 'س ' : 'h ') : ''}${availM}${isArabic ? 'د' : 'm'} (${t.budgetAvailable}).`);
      return;
    }
    onSave(ms);
  };

  return (
    <View style={[{ marginTop: 4, padding: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '30', gap: 12 }, isArabic && { direction: 'rtl' }]}>
      {maxMs !== undefined && maxMs > 0 && (
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }, isArabic && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
          <Text style={[{ color: colors.warning, fontSize: 11, fontWeight: '700' }, isArabic && { textAlign: 'right' }]}>
            {t.budget}: {Math.floor(maxMs / 3600000) > 0 ? Math.floor(maxMs / 3600000) + (isArabic ? 'س ' : 'h ') : ''}{Math.floor((maxMs % 3600000) / 60000)}{isArabic ? 'د' : 'm'} {t.available}
          </Text>
        </View>
      )}
      {/* Duration row */}
      <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
        {/* Hours */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ backgroundColor: colors.surfaceText + '08', borderWidth: 1.5, borderColor: colors.surfaceText + '20', borderRadius: 10, width: 64, height: 52, justifyContent: 'center', alignItems: 'center' }}>
            <TextInput
              style={{ color: colors.surfaceText, fontSize: 22, fontWeight: '800', textAlign: 'center', width: '100%', padding: 0 }}
              keyboardType="numeric"
              value={hours}
              onChangeText={setHours}
              maxLength={2}
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={colors.surfaceText + '40'}
              underlineColorAndroid="transparent"
            />
          </View>
          <Text style={{ color: colors.surfaceText + '60', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>{t.hours}</Text>
        </View>

        <Text style={{ color: colors.surfaceText, fontWeight: '800', fontSize: 24, marginBottom: 18 }}>:</Text>

        {/* Minutes */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ backgroundColor: colors.surfaceText + '08', borderWidth: 1.5, borderColor: colors.surfaceText + '20', borderRadius: 10, width: 64, height: 52, justifyContent: 'center', alignItems: 'center' }}>
            <TextInput
              style={{ color: colors.surfaceText, fontSize: 22, fontWeight: '800', textAlign: 'center', width: '100%', padding: 0 }}
              keyboardType="numeric"
              value={minutes}
              onChangeText={setMinutes}
              maxLength={2}
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={colors.surfaceText + '40'}
              underlineColorAndroid="transparent"
            />
          </View>
          <Text style={{ color: colors.surfaceText + '60', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>{t.minutes}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={[{ flexDirection: 'row', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity
          onPress={handleSave}
          style={[{ flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse' }]}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>✓ {t.setTimer}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
        >
          <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 14 }}>{t.cancel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Helper: format ms to HH:MM:SS or MM:SS ────────────────────────────────
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// ─── Helper: format ms to compact "1h 30m" ──────────────────────────────────
const formatDuration = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// ─── Subtask Row Component ───────────────────────────────────────────────────
const SubtaskRow = ({
  sub,
  parentTimerDuration,
  colors,
  isDarkMode,
  homeStyles,
  onStartSubtask,
  onPauseSubtask,
  onToggleComplete,
  onDelete,
  onSetTimer,
  onUpdateText,
  onUpdateStatus,
}: {
  sub: any;
  parentTimerDuration?: number;
  colors: any;
  isDarkMode: boolean;
  homeStyles: any;
  onStartSubtask: (id: Id<"todos">) => void;
  onPauseSubtask: (id: Id<"todos">) => void;
  onToggleComplete: (id: Id<"todos">, currentStatus: string) => void;
  onDelete: (id: Id<"todos">) => void;
  onSetTimer: (id: Id<"todos">, ms: number) => void;
  onUpdateText: (id: Id<"todos">, text: string) => void;
  onUpdateStatus: (id: Id<"todos">, status: string) => void;
}) => {
  const { language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(sub.text);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [subTimeLeft, setSubTimeLeft] = useState(sub.timerDuration || 0);

  // Compute remaining budget for this subtask's timer picker
  const subtasks = useQuery(api.todos.getSubtasks, sub.parentId ? { parentId: sub.parentId } : "skip");
  const remainingBudget = useMemo(() => {
    if (!parentTimerDuration || !subtasks) return undefined;
    const otherSubsDuration = subtasks
      .filter((s: any) => s._id !== sub._id)
      .reduce((sum: number, s: any) => sum + (s.timerDuration || 0), 0);
    return Math.max(0, parentTimerDuration - otherSubsDuration);
  }, [parentTimerDuration, subtasks, sub._id]);

  // Live countdown for running subtasks
  useEffect(() => {
    if (sub.status === 'in_progress' && sub.timerStartTime && sub.timerDuration) {
      const calc = () => {
        const elapsed = Date.now() - sub.timerStartTime!;
        const remaining = Math.max(0, sub.timerDuration! - elapsed);
        setSubTimeLeft(remaining);
        if (remaining === 0 && sub.status === 'in_progress') {
          onUpdateStatus(sub._id, 'done');
        }
      };
      calc();
      const interval = setInterval(calc, 1000);
      return () => clearInterval(interval);
    } else if (sub.status === 'paused' && sub.timeLeftAtPause !== undefined) {
      setSubTimeLeft(sub.timeLeftAtPause);
    } else if (sub.status === 'done') {
      setSubTimeLeft(0);
    } else {
      setSubTimeLeft(sub.timerDuration || 0);
    }
  }, [sub.status, sub.timerStartTime, sub.timerDuration, sub.timeLeftAtPause]);

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== sub.text) onUpdateText(sub._id, editText.trim());
    setIsEditing(false);
    setShowTimerPicker(false);
  };

  const isDone = sub.status === 'done';
  const isRunning = sub.status === 'in_progress';
  const isPaused = sub.status === 'paused';
  const hasTimer = !!sub.timerDuration;

  if (isEditing) {
    return (
      <View style={[{ backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden', padding: 10, gap: 8 }, isArabic && { direction: 'rtl' }]}>
        <Text style={[{ fontSize: 10, fontWeight: '800', color: colors.surfaceText, letterSpacing: 0.5 }, isArabic && { textAlign: 'right' }]}>{t.editingSubtask}</Text>

        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={() => onToggleComplete(sub._id, sub.status)}>
            <Ionicons
              name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isDone ? colors.success : colors.textMuted}
            />
          </TouchableOpacity>
          <TextInput
            style={[{ flex: 1, color: colors.surfaceText, fontSize: 14, backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary, fontWeight: '600' }, isArabic && { textAlign: 'right' }]}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            onSubmitEditing={handleSaveEdit}
          />
        </View>

        {/* Timer toggle */}
        <TouchableOpacity
          style={[homeStyles.actionBtn, {
            backgroundColor: hasTimer ? colors.surfaceText + '10' : 'transparent',
            borderColor: colors.surfaceText + '30',
            borderWidth: 1,
            alignSelf: isArabic ? 'flex-end' : 'flex-start',
            flexDirection: isArabic ? 'row-reverse' : 'row'
          }]}
          onPress={() => setShowTimerPicker(!showTimerPicker)}
        >
          <Ionicons name="timer-outline" size={16} color={colors.surfaceText} />
          <Text style={[homeStyles.actionBtnText, { color: colors.surfaceText }]}>
            {hasTimer ? formatDuration(sub.timerDuration!) : t.setTimer}
          </Text>
          <Ionicons name={showTimerPicker ? 'chevron-up' : 'chevron-down'} size={13} color={colors.surfaceText} />
        </TouchableOpacity>

        {showTimerPicker && (
          <InlineTimerPicker
            initialMs={sub.timerDuration}
            maxMs={remainingBudget}
            colors={colors}
            t={t}
            isArabic={isArabic}
            onSave={(ms) => {
              onSetTimer(sub._id, ms);
              setShowTimerPicker(false);
            }}
            onCancel={() => setShowTimerPicker(false)}
          />
        )}

        <View style={[{ flexDirection: 'row', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
            onPress={handleSaveEdit}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{t.save}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.border, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
            onPress={() => { setIsEditing(false); setShowTimerPicker(false); }}
          >
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t.cancel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── COLLAPSED ROW ──
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden' }, isArabic && { direction: 'rtl' }]}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', padding: 10 }, isArabic && { flexDirection: 'row-reverse' }]}>
        {/* Checkbox */}
        <TouchableOpacity onPress={() => onToggleComplete(sub._id, sub.status)}>
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={isDone ? colors.success : colors.textMuted}
            style={isArabic ? { marginLeft: 10 } : { marginRight: 10 }}
          />
        </TouchableOpacity>

        {/* Task text - tap to edit */}
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => { setIsEditing(true); setEditText(sub.text); }}
        >
          <Text
            style={[{
              color: isDone ? colors.surfaceText + '60' : colors.surfaceText,
              textDecorationLine: isDone ? 'line-through' : 'none',
              fontSize: 14,
              fontWeight: '600',
            }, isArabic && { textAlign: 'right' }]}
            numberOfLines={2}
          >
            {sub.text}
          </Text>
        </TouchableOpacity>

        {/* Timer controls */}
        {hasTimer && !isDone && (
          <TouchableOpacity
            onPress={() => isRunning ? onPauseSubtask(sub._id) : onStartSubtask(sub._id)}
            style={[{
              flexDirection: isArabic ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: isRunning ? colors.warning + '20' : isPaused ? colors.surfaceText + '15' : colors.surfaceText + '10',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              marginLeft: isArabic ? 0 : 8,
              marginRight: isArabic ? 8 : 0,
              borderWidth: 1,
              borderColor: isRunning ? colors.warning + '50' : colors.surfaceText + '30',
            }]}
          >
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={12}
              color={isRunning ? colors.warning : colors.surfaceText}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                color: isRunning ? colors.warning : colors.surfaceText,
              }}
            >
              {isRunning || isPaused ? formatTime(subTimeLeft) : formatDuration(sub.timerDuration!)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Done badge for timed subtasks */}
        {hasTimer && isDone && (
          <View style={[{
            flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 4,
            backgroundColor: colors.success + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: isArabic ? 0 : 8, marginRight: isArabic ? 8 : 0
          }]}>
            <Ionicons name="checkmark" size={12} color={colors.success} />
            <Text style={{ fontSize: 11, color: colors.success, fontWeight: '800' }}>{t.done}</Text>
          </View>
        )}

        {/* Delete */}
        <TouchableOpacity style={[{ paddingLeft: isArabic ? 0 : 12, paddingRight: isArabic ? 12 : 0 }]} onPress={() => onDelete(sub._id)}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Running indicator bar */}
      {isRunning && (
        <View style={{ height: 2, backgroundColor: colors.warning + '30' }}>
          <View style={[{
            height: 2,
            backgroundColor: colors.warning,
            alignSelf: isArabic ? 'flex-end' : 'flex-start',
            width: sub.timerDuration ? `${Math.min(100, ((sub.timerDuration - subTimeLeft) / sub.timerDuration) * 100)}%` : '0%',
          }]} />
        </View>
      )}
    </View>
  );
};

// ─── Main Card ────────────────────────────────────────────────────────────────
const TodoCard: React.FC<TodoCardProps> = ({ todo, onSetTimer, onLongPress, onLinkProject, homeStyles, depth = 0, isTimelineMode = false }) => {
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const updateStatus = useMutation(api.todos.updateStatus);
  const startTimer = useMutation(api.todos.startTimer);
  const pauseTimer = useMutation(api.todos.pauseTimer);
  const startSubtaskTimer = useMutation(api.todos.startSubtaskTimer);
  const pauseSubtaskTimer = useMutation(api.todos.pauseSubtaskTimer);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const setTimer = useMutation(api.todos.setTimer);
  const addTodo = useMutation(api.todos.addTodo);

  // Main task edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [showTimerPicker, setShowTimerPicker] = useState(false);

  // Subtask state
  const project = useQuery(api.projects.getProjectMetadata, todo.projectId ? { id: todo.projectId } : "skip");
  const subtasks = useQuery(api.todos.getSubtasks, { parentId: todo._id });

  const [timeLeft, setTimeLeft] = useState(todo.timerDuration || 0);

  const [showSubtasks, setShowSubtasks] = useState(false);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubText, setNewSubText] = useState("");
  const [newSubDuration, setNewSubDuration] = useState<number | undefined>(undefined);
  const [showNewSubTimerPicker, setShowNewSubTimerPicker] = useState(false);

  const [lastNotifId, setLastNotifId] = useState<string | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);


  const hasSubtasks = subtasks && subtasks.length > 0;

  // Determine if subtasks have timers (controls whether main timer buttons show)
  const subtasksWithTimers = useMemo(() => {
    if (!hasSubtasks) return [];
    return subtasks.filter((s: any) => !!s.timerDuration);
  }, [subtasks]);
  const hasSubtaskTimers = subtasksWithTimers.length > 0;

  // Calculate timer-weighted progress
  const timerProgress = useMemo(() => {
    if (!hasSubtasks || !todo.timerDuration) return null;
    
    const completedTimerSum = subtasks
      .filter((s: any) => s.status === 'done' && s.timerDuration)
      .reduce((sum: number, s: any) => sum + (s.timerDuration || 0), 0);
    
    return Math.min(100, (completedTimerSum / todo.timerDuration) * 100);
  }, [subtasks, todo.timerDuration]);

  // Calculate simple count-based progress for tasks without timers
  const countProgress = useMemo(() => {
    if (!hasSubtasks) return 0;
    const done = subtasks.filter((s: any) => s.status === 'done').length;
    return (done / subtasks.length) * 100;
  }, [subtasks]);

  // The actual progress to display
  const progress = timerProgress !== null ? timerProgress : (hasSubtasks ? countProgress : 0);

  // Main timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;

    // Auto-complete parent if all subtasks done
    if (hasSubtasks) {
      const completedSubtasks = subtasks.filter((s: any) => s.status === 'done').length;
      const totalSubtasks = subtasks.length;
      if (totalSubtasks > 0 && completedSubtasks === totalSubtasks && todo.status !== 'done') {
        updateStatus({ id: todo._id, status: 'done' });
      } else if (completedSubtasks < totalSubtasks && todo.status === 'done') {
        updateStatus({ id: todo._id, status: 'in_progress' });
      }
    }

    if (todo.status === 'in_progress' && todo.timerDuration && todo.timerStartTime) {
      const calculateTimeInfo = () => {
        const elapsed = Date.now() - todo.timerStartTime!;
        const remaining = Math.max(0, todo.timerDuration! - elapsed);
        setTimeLeft(remaining);
        if (remaining === 0 && todo.status === 'in_progress') {
          updateStatus({ id: todo._id, status: 'done' });
        }
      };
      calculateTimeInfo();
      interval = setInterval(calculateTimeInfo, 1000);
    } else if (todo.status === 'paused') {
      setTimeLeft(todo.timeLeftAtPause || 0);
    } else if (todo.status === 'done' || todo.status === 'not_done') {
      setTimeLeft(0);
    } else {
      setTimeLeft(todo.timerDuration || 0);
    }

    return () => { if (interval) clearInterval(interval); };
  }, [todo.status, todo.timerDuration, todo.timerStartTime, todo.timeLeftAtPause, subtasks]);

  // Overdue logic: automatically mark as not_done if deadline passed
  useEffect(() => {
    if (todo.status !== 'done' && todo.status !== 'not_done' && todo.dueDate && todo.dueDate < Date.now()) {
      updateStatus({ id: todo._id, status: 'done' });
    }
  }, [todo.status, todo.dueDate]);

  const stats = {
    done: subtasks?.filter((s: any) => s.status === 'done').length || 0,
    total: subtasks?.length || 0,
  };

  const handleStartTimer = async () => {
    startTimer({ id: todo._id });
    const id = await scheduleTimerNotification(todo.text, timeLeft);
    setLastNotifId(id);
  };

  const handlePauseTimer = async () => {
    pauseTimer({ id: todo._id });
    if (lastNotifId) { await cancelNotification(lastNotifId); setLastNotifId(null); }
  };

  const handleStartSubtask = useCallback((subId: Id<"todos">) => {
    startSubtaskTimer({ id: subId });
  }, [startSubtaskTimer]);

  const handlePauseSubtask = useCallback((subId: Id<"todos">) => {
    pauseSubtaskTimer({ id: subId });
  }, [pauseSubtaskTimer]);

  const handleToggleSubComplete = useCallback((subId: Id<"todos">, currentStatus: string) => {
    updateStatus({ id: subId, status: currentStatus === 'done' ? 'not_started' : 'done' });
  }, [updateStatus]);

  const handleDeleteSub = useCallback((subId: Id<"todos">) => {
    deleteTodo({ id: subId });
  }, [deleteTodo]);

  const handleSetSubTimer = useCallback((subId: Id<"todos">, ms: number) => {
    setTimer({ id: subId, duration: ms });
  }, [setTimer]);

  const handleUpdateSubText = useCallback((subId: Id<"todos">, text: string) => {
    updateTodo({ id: subId, text });
  }, [updateTodo]);

  const moveToStatus = (status: string) => updateStatus({ id: todo._id, status });

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== todo.text) updateTodo({ id: todo._id, text: editText.trim() });
    setIsEditing(false);
    setShowTimerPicker(false);
  };

  const handleAddSubtask = () => {
    if (newSubText.trim() && userId) {
      addTodo({
        userId,
        text: newSubText.trim(),
        parentId: todo._id,
        projectId: todo.projectId,
        ...(newSubDuration && { timerDuration: newSubDuration })
      });
      setNewSubText('');
      setNewSubDuration(undefined);
      setShowNewSubTimerPicker(false);
      setIsAddingSub(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowSubtasks(true);
    }
  };

  const toggleSubtasks = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSubtasks(!showSubtasks);
  };

  // ─── Status colors ──────────────────────────────────────────────────────────
  let badgeText = t.notStarted;
  let badgeBg = colors.border;
  let badgeColor = colors.surfaceText;
  let timerIconColor = colors.primary;
  let timerText = formatTime(timeLeft);
  let cardBg = colors.surface;

  if (todo.status === "in_progress") { badgeText = t.inProgress; badgeBg = colors.primary + '15'; badgeColor = isDarkMode ? colors.primary : colors.surfaceText; cardBg = colors.taskInProgressBg; }
  else if (todo.status === "paused") { badgeText = t.paused; badgeBg = colors.surfaceText + '10'; badgeColor = isDarkMode ? '#FFFFFF' : colors.surfaceText; timerIconColor = colors.surfaceText + '60'; cardBg = colors.taskPausedBg; }
  else if (todo.status === "done") { badgeText = t.done; badgeBg = colors.success + '20'; badgeColor = isDarkMode ? colors.success : colors.success; timerText = t.done; timerIconColor = colors.success; cardBg = colors.taskDoneBg; }
  else if (todo.status === "not_done") { badgeText = t.notDone; badgeBg = colors.danger + '20'; badgeColor = isDarkMode ? colors.danger : colors.danger; timerText = "—"; timerIconColor = colors.danger; cardBg = colors.taskNotDoneBg; }
  else if (todo.status === "not_started") { cardBg = colors.taskNotStartedBg; badgeBg = colors.surfaceText + '10'; badgeColor = isDarkMode ? '#FFFFFF' : colors.surfaceText; }

  const isTimerSet = !!todo.timerDuration;
  const isDueSoon = todo.dueDate && todo.dueDate < Date.now() + 86400000;
  if (!isTimerSet && hasSubtasks) timerText = `${stats.done}/${stats.total}`;

  // Are any subtasks currently running?
  const anySubtaskRunning = hasSubtasks && subtasks.some((s: any) => s.status === 'in_progress');

  const coreCard = (
    <>
      <View style={[homeStyles.card, { overflow: 'hidden', position: 'relative', backgroundColor: cardBg, padding: isTimelineMode ? 16 : 12 }]}>
        {/* Color bar indicator for timeline mode based on priority */}
        {isTimelineMode && (
          <View style={{
            position: 'absolute', left: 0, top: 24, bottom: 24, width: 4, borderRadius: 2,
            backgroundColor: todo.priority === 'High' ? colors.danger : todo.priority === 'Medium' ? colors.warning : colors.primary
          }}/>
        )}
        <View style={{ zIndex: 1, paddingLeft: isTimelineMode ? 8 : 0 }}>

          {/* ─── Header Row: Title + Badge + Circle ─── */}
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[{ flex: 1, paddingRight: isArabic ? 0 : 8, paddingLeft: isArabic ? 8 : 0 }, isArabic && { alignItems: 'flex-end' }]}>
              {isEditing ? (
                /* ─── FULL EDIT PANEL ─── */
                <View style={[{ backgroundColor: colors.surfaceText + '08', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.surfaceText + '15', marginBottom: 8, gap: 8 }, isArabic && { direction: 'rtl' }]}>
                  <Text style={[{ fontSize: 11, fontWeight: '800', color: colors.surfaceText, letterSpacing: 0.5, marginBottom: 4 }, isArabic && { textAlign: 'right' }]}>{t.editingTask}</Text>

                  {/* Text edit */}
                  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
                    <TextInput
                      style={[{ flex: 1, color: colors.surfaceText, fontSize: 15, fontWeight: '700', backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.surfaceText + '20' }, isArabic && { textAlign: 'right' }]}
                      value={editText}
                      onChangeText={setEditText}
                      autoFocus
                      onSubmitEditing={handleSaveEdit}
                    />
                    <TouchableOpacity onPress={handleSaveEdit}>
                      <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                    </TouchableOpacity>
                  </View>

                  {/* Timer section */}
                  <TouchableOpacity
                    style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isTimerSet ? colors.surfaceText + '10' : 'transparent', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: isTimerSet ? colors.surfaceText + '30' : colors.border, alignSelf: isArabic ? 'flex-end' : 'flex-start' }, isArabic && { flexDirection: 'row-reverse' }]}
                    onPress={() => setShowTimerPicker(!showTimerPicker)}
                  >
                    <Ionicons name="timer-outline" size={16} color={isTimerSet ? colors.surfaceText : colors.textMuted} />
                    <Text style={{ color: isTimerSet ? colors.surfaceText : colors.textMuted, fontWeight: '700', fontSize: 13 }}>
                      {isTimerSet ? `${t.timer}: ${formatDuration(todo.timerDuration!)}` : t.setTimer}
                    </Text>
                    <Ionicons name={showTimerPicker ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
                  </TouchableOpacity>

                  {showTimerPicker && (
                    <InlineTimerPicker
                      initialMs={todo.timerDuration}
                      colors={colors}
                      t={t}
                      isArabic={isArabic}
                      onSave={(ms) => {
                        setTimer({ id: todo._id, duration: ms });
                        setShowTimerPicker(false);
                      }}
                      onCancel={() => setShowTimerPicker(false)}
                    />
                  )}

                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    style={{ backgroundColor: colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: 4 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{t.doneEditing}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setIsDetailModalVisible(true)} onLongPress={() => onLongPress(todo._id)}>
                  <Text style={[homeStyles.cardTitle, { marginBottom: 10, color: colors.surfaceText }, isArabic && { textAlign: 'right' }]} numberOfLines={2}>{todo.text}</Text>
                </TouchableOpacity>
              )}


              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[homeStyles.badge, { backgroundColor: badgeBg === colors.border ? colors.surfaceText + '15' : badgeBg, alignSelf: 'flex-start' }]}>
                  <Text style={[homeStyles.badgeText, { color: (badgeColor === colors.text || badgeColor === colors.textMuted) ? colors.surfaceText : badgeColor }]}>{badgeText}</Text>
                </View>
              </View>
            </View>

            <View style={{ justifyContent: 'center', alignItems: 'center', width: 56 }}>
              <CircularProgress
                size={56} strokeWidth={4} progress={progress}
                color={todo.status === 'paused' ? colors.textMuted : (todo.status === 'done' || todo.status === 'not_done') ? timerIconColor : colors.surfaceText}
                unfilledColor={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: todo.status === 'paused' ? colors.textMuted : (todo.status === 'done' || todo.status === 'not_done') ? timerIconColor : colors.surfaceText, textAlign: 'center' }}>
                  {timerText}
                </Text>
              </CircularProgress>
            </View>
          </View>



          {/* ─── Action Row ─── */}
          <View style={[{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
            {/* Show main task timer controls ONLY when there are NO subtasks with timers */}
            {!hasSubtaskTimers && (
              <>
                {todo.status === 'not_started' && (
                  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
                    {!isTimerSet ? (
                      <TouchableOpacity style={[homeStyles.actionBtn, { backgroundColor: colors.surfaceText + '10', borderColor: colors.surfaceText + '30', borderWidth: 1, flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={() => onSetTimer(todo._id)}>
                        <Ionicons name="timer-outline" size={16} color={colors.surfaceText} />
                        <Text style={[homeStyles.actionBtnText, { color: colors.surfaceText }]}>{t.setTimer}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[homeStyles.actionBtn, { backgroundColor: colors.primary, flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={handleStartTimer}>
                        <Ionicons name="play" size={16} color="#fff" />
                        <Text style={[homeStyles.actionBtnText, { color: '#fff' }]}>{t.startTask}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {todo.status === 'in_progress' && (
                  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={handlePauseTimer}>
                      <Ionicons name="pause" size={16} color={colors.surfaceText} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.successBg }]} onPress={() => moveToStatus('done')}>
                      <Ionicons name="checkmark" size={18} color={colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.danger + '20' }]} onPress={() => moveToStatus('not_done')}>
                      <Ionicons name="close" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}

                {todo.status === 'paused' && (
                  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.primary }]} onPress={handleStartTimer}>
                      <Ionicons name="play" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* When subtasks have timers, show a status indicator instead */}
            {hasSubtaskTimers && (
              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, isArabic && { flexDirection: 'row-reverse' }]}>
                {anySubtaskRunning && (
                  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warning + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.warning + '30' }, isArabic && { flexDirection: 'row-reverse' }]}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.warning }}>{t.timerRunning}</Text>
                  </View>
                )}
              </View>
            )}

            {(todo.status === 'done' || todo.status === 'not_done') && (
              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, isArabic && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.infoBg }]} onPress={() => moveToStatus('not_started')}>
                  <Ionicons name="refresh" size={18} color={colors.info} />
                </TouchableOpacity>
              </View>
            )}

            <View style={[{ flexDirection: 'row', alignItems: 'center', marginLeft: isArabic ? 0 : 'auto', marginRight: isArabic ? 'auto' : 0, gap: 12 }, isArabic && { flexDirection: 'row-reverse' }]}>
              {hasSubtasks && (
                <TouchableOpacity
                  onPress={toggleSubtasks}
                  style={[homeStyles.actionBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', borderWidth: 1, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                >
                  <Text style={{ color: colors.surfaceText, fontSize: 13, fontWeight: '700' }}>
                    {stats.total} {stats.total === 1 ? t.subtask : t.subtasks} {showSubtasks ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[homeStyles.actionBtn, {
                  paddingHorizontal: hasSubtasks ? 10 : 14,
                  backgroundColor: hasSubtasks ? 'transparent' : colors.primary + '12',
                  borderWidth: hasSubtasks ? 0 : 1,
                  borderColor: colors.primary + '40',
                  borderStyle: 'dashed',
                  flexDirection: isArabic ? 'row-reverse' : 'row'
                }]}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsAddingSub(true); }}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.surfaceText + '60'} />
                {!hasSubtasks && (
                  <Text style={{ color: colors.surfaceText + '90', fontSize: 12, fontWeight: '700' }}>{t.addSubtask}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={[homeStyles.dividerDashed, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />

          {/* ─── Project + Date Row ─── */}
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, isArabic && { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity style={homeStyles.projectRow} onPress={() => onLinkProject(todo._id)}>
              <Ionicons name="link-outline" size={16} color={todo.projectId ? colors.primary : colors.surfaceText + '80'} />
              <Text style={[homeStyles.projectText, { color: colors.surfaceText + '80' }, todo.projectId && { color: colors.surfaceText, fontStyle: 'normal', fontWeight: '700' }, isArabic && { textAlign: 'right' }]}>
                {project?.name || todo.projectId || t.noProject}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              {todo.dueDate && (
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Ionicons name="calendar-outline" size={14} color={isDueSoon ? colors.danger : colors.surfaceText + '80'} />
                  <Text style={[{ fontSize: 12, color: isDueSoon ? colors.danger : colors.surfaceText + '80', fontWeight: '600' }, isArabic && { textAlign: 'right' }]}>
                    {new Date(todo.dueDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                  </Text>
                </View>
              )}

              {todo.date && (
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Ionicons name="calendar-clear-outline" size={14} color={colors.surfaceText + '80'} />
                  <Text style={[{ fontSize: 12, color: colors.surfaceText + '80', fontWeight: '600' }, isArabic && { textAlign: 'right' }]}>
                    {new Date(todo.date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ─── Footer ─── */}
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 15 }, isArabic && { flexDirection: 'row-reverse' }]}>
              {hasSubtasks && (
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Ionicons name="list-outline" size={15} color={colors.surfaceText + '80'} />
                  <Text style={{ fontSize: 12, color: colors.surfaceText + '99', fontWeight: '700' }}>{stats.done}/{stats.total} {isArabic ? 'مهام' : 'Subtasks'}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => { setIsEditing(true); setEditText(todo.text); }}>
                <Ionicons name="create-outline" size={18} color={colors.surfaceText + '99'} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => deleteTodo({ id: todo._id })}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>

          {/* ─── Subtask Section (Moved inside card) ─── */}
          {(isAddingSub || (showSubtasks && hasSubtasks)) && (
            <View style={[{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surfaceText + '10' }, isArabic && { direction: 'rtl' }]}>
              {showSubtasks && hasSubtasks && (
                <View style={{ gap: 8, marginBottom: isAddingSub ? 16 : 0 }}>
                  {subtasks.map((sub: any) => (
                    <SubtaskRow
                      key={sub._id}
                      sub={sub}
                      parentTimerDuration={todo.timerDuration}
                      colors={colors}
                      isDarkMode={isDarkMode}
                      homeStyles={homeStyles}
                      onStartSubtask={handleStartSubtask}
                      onPauseSubtask={handlePauseSubtask}
                      onToggleComplete={handleToggleSubComplete}
                      onDelete={handleDeleteSub}
                      onSetTimer={handleSetSubTimer}
                      onUpdateText={handleUpdateSubText}
                      onUpdateStatus={(id, status) => updateStatus({ id, status })}
                    />
                  ))}
                </View>
              )}

              {isAddingSub && (
                <View style={{ marginBottom: 12 }}>
                  <View style={[{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', padding: 10, backgroundColor: colors.surfaceText + '08', borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '30' }]}>
                    <Ionicons name={isArabic ? "return-down-back" : "return-down-forward"} size={18} color={colors.surfaceText + '60'} style={isArabic ? { marginLeft: 8 } : { marginRight: 8 }} />
                    <TextInput
                      style={[{ flex: 1, color: colors.surfaceText, fontSize: 14, padding: 0 }, isArabic && { textAlign: 'right' }]}
                      placeholder={isArabic ? "...ما هي الخطوة الفرعية؟" : "What's a sub-step?"}
                      placeholderTextColor={colors.surfaceText + '50'}
                      value={newSubText}
                      onChangeText={setNewSubText}
                      autoFocus
                      onSubmitEditing={handleAddSubtask}
                      onBlur={() => { if (!newSubText.trim() && !newSubDuration) { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsAddingSub(false); } }}
                    />
                    <View style={[{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }]}>
                      <TouchableOpacity 
                         onPress={() => setShowNewSubTimerPicker(!showNewSubTimerPicker)}
                         style={newSubDuration ? { backgroundColor: colors.primary + '15', padding: 4, borderRadius: 6 } : {}}
                      >
                        <Ionicons name="timer-outline" size={20} color={newSubDuration ? colors.primary : colors.surfaceText + '40'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleAddSubtask}>
                        <Ionicons name={isArabic ? "arrow-back-circle" : "arrow-up-circle"} size={24} color={newSubText.trim() ? colors.primary : colors.surfaceText + '30'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {showNewSubTimerPicker && (
                    <View style={{ marginTop: 8 }}>
                      <InlineTimerPicker
                        initialMs={newSubDuration}
                        colors={colors}
                        t={t}
                        isArabic={isArabic}
                        onSave={(ms) => {
                          setNewSubDuration(ms);
                          setShowNewSubTimerPicker(false);
                        }}
                        onCancel={() => setShowNewSubTimerPicker(false)}
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
  </>);

  if (isTimelineMode) {
    const isPlaying = todo.status === 'in_progress';
    const progressWidth = isPlaying && todo.timerDuration ? Math.min(100, ((todo.timerDuration - timeLeft) / todo.timerDuration) * 100) : 0;
    
    return (
      <View style={[homeStyles.cardContainer, { marginLeft: depth * 16 }]}>
        <View style={[homeStyles.timelineColumn, { justifyContent: 'flex-start', paddingTop: 24 }]}>
          {isPlaying ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', width: 250, zIndex: 10, transform: [{ translateX: -3 }] }}>
               <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceText, zIndex: 11 }} />
               <View style={{ flex: 1, height: 2, backgroundColor: colors.surfaceText + '30', marginLeft: -4, zIndex: 10 }}>
                 <View style={{ width: `${Math.max(1, progressWidth)}%`, height: '100%', backgroundColor: colors.surfaceText }} />
               </View>
            </View>
          ) : (
            <View style={{ width: 16, height: 2, backgroundColor: colors.border, borderRadius: 1 }} />
          )}
        </View>
        {coreCard}
        <TaskDetailModal 
          visible={isDetailModalVisible}
          onClose={() => setIsDetailModalVisible(false)}
          todoId={todo._id}
        />
      </View>
    );
  }

  return (
    <View style={{ marginLeft: depth * 16 }}>
      {coreCard}
      <TaskDetailModal 
        visible={isDetailModalVisible}
        onClose={() => setIsDetailModalVisible(false)}
        todoId={todo._id}
      />
    </View>
  );
};

export default TodoCard;
