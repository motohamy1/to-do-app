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
  };
  onSetTimer: (id: Id<"todos">) => void;
  onLongPress: (id: Id<"todos">) => void;
  onLinkProject: (id: Id<"todos">) => void;
  homeStyles: any;
  depth?: number;
}

// ─── Inline Timer Picker ─────────────────────────────────────────────────────
const InlineTimerPicker = ({
  initialMs,
  onSave,
  onCancel,
  maxMs,
  colors,
}: {
  initialMs?: number;
  onSave: (ms: number) => void;
  onCancel: () => void;
  maxMs?: number;
  colors: any;
}) => {
  const init = initialMs || 0;
  const [hours, setHours] = useState(String(Math.floor(init / 3600000)));
  const [minutes, setMinutes] = useState(String(Math.floor((init % 3600000) / 60000)));

  const handleSave = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const ms = (h * 3600 + m * 60) * 1000;
    if (ms <= 0) {
      Alert.alert('Invalid Timer', 'Please set a timer greater than 0.');
      return;
    }
    if (maxMs !== undefined && maxMs > 0 && ms > maxMs) {
      const availH = Math.floor(maxMs / 3600000);
      const availM = Math.floor((maxMs % 3600000) / 60000);
      Alert.alert('Timer Too Long', `Timer cannot exceed ${availH > 0 ? availH + 'h ' : ''}${availM}m (available budget).`);
      return;
    }
    onSave(ms);
  };

  return (
    <View style={{ marginTop: 4, padding: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '30', gap: 12 }}>
      {maxMs !== undefined && maxMs > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
          <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
          <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '600' }}>
            Budget: {Math.floor(maxMs / 3600000) > 0 ? Math.floor(maxMs / 3600000) + 'h ' : ''}{Math.floor((maxMs % 3600000) / 60000)}m available
          </Text>
        </View>
      )}
      {/* Duration row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {/* Hours */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.primary + '60', borderRadius: 10, width: 64, height: 52, justifyContent: 'center', alignItems: 'center' }}>
            <TextInput
              style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', width: '100%', padding: 0 }}
              keyboardType="numeric"
              value={hours}
              onChangeText={setHours}
              maxLength={2}
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              underlineColorAndroid="transparent"
            />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>HOURS</Text>
        </View>

        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 24, marginBottom: 18 }}>:</Text>

        {/* Minutes */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.primary + '60', borderRadius: 10, width: 64, height: 52, justifyContent: 'center', alignItems: 'center' }}>
            <TextInput
              style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', width: '100%', padding: 0 }}
              keyboardType="numeric"
              value={minutes}
              onChangeText={setMinutes}
              maxLength={2}
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              underlineColorAndroid="transparent"
            />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>MINUTES</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={handleSave}
          style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ Set Timer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
        >
          <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
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
}) => {
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
      <View style={{ backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden', padding: 10, gap: 8 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 }}>EDITING SUBTASK</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => onToggleComplete(sub._id, sub.status)}>
            <Ionicons
              name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isDone ? colors.success : colors.textMuted}
            />
          </TouchableOpacity>
          <TextInput
            style={{ flex: 1, color: colors.text, fontSize: 14, backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary, fontWeight: '500' }}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            onSubmitEditing={handleSaveEdit}
          />
        </View>

        {/* Timer toggle */}
        <TouchableOpacity
          style={[homeStyles.actionBtn, {
            backgroundColor: hasTimer ? colors.primary + '15' : colors.surface,
            borderColor: colors.primary,
            borderWidth: 1,
            alignSelf: 'flex-start',
          }]}
          onPress={() => setShowTimerPicker(!showTimerPicker)}
        >
          <Ionicons name="timer-outline" size={16} color={colors.primary} />
          <Text style={[homeStyles.actionBtnText, { color: colors.primary }]}>
            {hasTimer ? formatDuration(sub.timerDuration!) : 'Set Timer'}
          </Text>
          <Ionicons name={showTimerPicker ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} />
        </TouchableOpacity>

        {showTimerPicker && (
          <InlineTimerPicker
            initialMs={sub.timerDuration}
            maxMs={remainingBudget}
            colors={colors}
            onSave={(ms) => {
              onSetTimer(sub._id, ms);
              setShowTimerPicker(false);
            }}
            onCancel={() => setShowTimerPicker(false)}
          />
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
            onPress={handleSaveEdit}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.border, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
            onPress={() => { setIsEditing(false); setShowTimerPicker(false); }}
          >
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── COLLAPSED ROW ──
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
        {/* Checkbox */}
        <TouchableOpacity onPress={() => onToggleComplete(sub._id, sub.status)}>
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={isDone ? colors.success : colors.textMuted}
            style={{ marginRight: 10 }}
          />
        </TouchableOpacity>

        {/* Task text - tap to edit */}
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => { setIsEditing(true); setEditText(sub.text); }}
        >
          <Text
            style={{
              color: isDone ? colors.textMuted : colors.text,
              textDecorationLine: isDone ? 'line-through' : 'none',
              fontSize: 14,
              fontWeight: '500',
            }}
            numberOfLines={2}
          >
            {sub.text}
          </Text>
        </TouchableOpacity>

        {/* Timer controls */}
        {hasTimer && !isDone && (
          <TouchableOpacity
            onPress={() => isRunning ? onPauseSubtask(sub._id) : onStartSubtask(sub._id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: isRunning ? colors.warning + '20' : isPaused ? colors.primary + '15' : colors.primary + '12',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              marginLeft: 8,
              borderWidth: 1,
              borderColor: isRunning ? colors.warning + '50' : colors.primary + '30',
            }}
          >
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={12}
              color={isRunning ? colors.warning : colors.primary}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                color: isRunning ? colors.warning : colors.primary,
              }}
            >
              {isRunning || isPaused ? formatTime(subTimeLeft) : formatDuration(sub.timerDuration!)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Done badge for timed subtasks */}
        {hasTimer && isDone && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: colors.success + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8
          }}>
            <Ionicons name="checkmark" size={12} color={colors.success} />
            <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700' }}>Done</Text>
          </View>
        )}

        {/* Delete */}
        <TouchableOpacity style={{ paddingLeft: 12 }} onPress={() => onDelete(sub._id)}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Running indicator bar */}
      {isRunning && (
        <View style={{ height: 2, backgroundColor: colors.warning + '30' }}>
          <View style={{
            height: 2,
            backgroundColor: colors.warning,
            width: sub.timerDuration ? `${Math.min(100, ((sub.timerDuration - subTimeLeft) / sub.timerDuration) * 100)}%` : '0%',
          }} />
        </View>
      )}
    </View>
  );
};

// ─── Main Card ────────────────────────────────────────────────────────────────
const TodoCard: React.FC<TodoCardProps> = ({ todo, onSetTimer, onLongPress, onLinkProject, homeStyles, depth = 0 }) => {
  const { colors, isDarkMode } = useTheme();
  const { userId } = useAuth();
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

  const [lastNotifId, setLastNotifId] = useState<string | null>(null);

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
      addTodo({ userId, text: newSubText.trim(), parentId: todo._id, projectId: todo.projectId });
      setNewSubText('');
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
  let badgeText = "Not Started";
  let badgeBg = colors.border;
  let badgeColor = colors.text;
  let timerIconColor = colors.primary;
  let timerText = formatTime(timeLeft);
  let cardBg = colors.surface;

  if (todo.status === "in_progress") { badgeText = "In Progress"; badgeBg = colors.primary + '20'; badgeColor = colors.primary; cardBg = colors.taskInProgressBg; }
  else if (todo.status === "paused") { badgeText = "Paused"; badgeBg = colors.border; badgeColor = colors.text; timerIconColor = colors.textMuted; cardBg = colors.taskPausedBg; }
  else if (todo.status === "done") { badgeText = "Done"; badgeBg = colors.success + '20'; badgeColor = colors.success; timerText = "Done"; timerIconColor = colors.textMuted; cardBg = colors.taskDoneBg; }
  else if (todo.status === "not_done") { badgeText = "Not Done"; badgeBg = colors.danger + '20'; badgeColor = colors.danger; timerText = "—"; timerIconColor = colors.danger; cardBg = colors.taskNotDoneBg; }
  else if (todo.status === "not_started") { cardBg = colors.taskNotStartedBg; badgeBg = colors.textMuted + '20'; badgeColor = colors.textMuted; }

  const isTimerSet = !!todo.timerDuration;
  const isDueSoon = todo.dueDate && todo.dueDate < Date.now() + 86400000;
  if (!isTimerSet && hasSubtasks) timerText = `${stats.done}/${stats.total}`;

  // Are any subtasks currently running?
  const anySubtaskRunning = hasSubtasks && subtasks.some((s: any) => s.status === 'in_progress');

  return (
    <View style={{ marginLeft: depth * 16 }}>
      <View style={[homeStyles.card, { overflow: 'hidden', position: 'relative', backgroundColor: cardBg }]}>
        <View style={{ zIndex: 1 }}>

          {/* ─── Header Row: Title + Badge + Circle ─── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              {isEditing ? (
                /* ─── FULL EDIT PANEL ─── */
                <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.primary + '40', marginBottom: 8, gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.5, marginBottom: 4 }}>EDITING TASK</Text>

                  {/* Text edit */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: '600', backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border }}
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
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isTimerSet ? colors.primary + '20' : colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: isTimerSet ? colors.primary + '40' : colors.border, alignSelf: 'flex-start' }}
                    onPress={() => setShowTimerPicker(!showTimerPicker)}
                  >
                    <Ionicons name="timer-outline" size={16} color={isTimerSet ? colors.primary : colors.textMuted} />
                    <Text style={{ color: isTimerSet ? colors.primary : colors.textMuted, fontWeight: '600', fontSize: 13 }}>
                      {isTimerSet ? `Timer: ${formatDuration(todo.timerDuration!)}` : 'Set Timer'}
                    </Text>
                    <Ionicons name={showTimerPicker ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
                  </TouchableOpacity>

                  {showTimerPicker && (
                    <InlineTimerPicker
                      initialMs={todo.timerDuration}
                      colors={colors}
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
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Done Editing</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setIsEditing(true)} onLongPress={() => onLongPress(todo._id)}>
                  <Text style={[homeStyles.cardTitle, { marginBottom: 4 }]} numberOfLines={2}>{todo.text}</Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[homeStyles.badge, { backgroundColor: badgeBg === colors.border ? colors.surface + '80' : badgeBg, alignSelf: 'flex-start' }]}>
                  <Text style={[homeStyles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
                </View>
              </View>
            </View>

            <View style={{ justifyContent: 'center', alignItems: 'center', width: 56 }}>
              <CircularProgress
                size={56} strokeWidth={4} progress={progress}
                color={todo.status === 'paused' ? colors.textMuted : timerIconColor}
                unfilledColor={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: todo.status === 'paused' ? colors.textMuted : timerIconColor, textAlign: 'center' }}>
                  {timerText}
                </Text>
              </CircularProgress>
            </View>
          </View>

          {/* ─── Progress Bar (timer-weighted) ─── */}
          {hasSubtasks && isTimerSet && (
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 }}>
                  Progress
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: progress >= 100 ? colors.success : colors.primary }}>
                  {Math.round(progress)}%
                </Text>
              </View>
              <View style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                overflow: 'hidden',
              }}>
                <View style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${Math.min(100, progress)}%`,
                  backgroundColor: progress >= 100 ? colors.success : progress >= 50 ? colors.primary : colors.warning,
                }} />
              </View>
            </View>
          )}

          {/* ─── Action Row ─── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            {/* Show main task timer controls ONLY when there are NO subtasks with timers */}
            {!hasSubtaskTimers && (
              <>
                {todo.status === 'not_started' && (
                  <View style={homeStyles.actionButtons}>
                    {!isTimerSet ? (
                      <TouchableOpacity style={[homeStyles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]} onPress={() => onSetTimer(todo._id)}>
                        <Ionicons name="timer-outline" size={16} color={colors.primary} />
                        <Text style={[homeStyles.actionBtnText, { color: colors.primary }]}>Set Timer</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[homeStyles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleStartTimer}>
                        <Ionicons name="play" size={16} color="#fff" />
                        <Text style={[homeStyles.actionBtnText, { color: '#fff' }]}>Start Task</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {todo.status === 'in_progress' && (
                  <View style={homeStyles.actionButtons}>
                    <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={handlePauseTimer}>
                      <Ionicons name="pause" size={16} color={colors.text} />
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
                  <View style={homeStyles.actionButtons}>
                    <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.primary }]} onPress={handleStartTimer}>
                      <Ionicons name="play" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* When subtasks have timers, show a status indicator instead */}
            {hasSubtaskTimers && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {anySubtaskRunning && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warning + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.warning + '30' }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning }}>Timer Running</Text>
                  </View>
                )}
              </View>
            )}

            {(todo.status === 'done' || todo.status === 'not_done') && (
              <View style={homeStyles.actionButtons}>
                <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.infoBg }]} onPress={() => moveToStatus('not_started')}>
                  <Ionicons name="refresh" size={18} color={colors.info} />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 12 }}>
              {hasSubtasks && (
                <TouchableOpacity
                  onPress={toggleSubtasks}
                  style={[homeStyles.actionBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', borderWidth: 1 }]}
                >
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                    {subtasks.length} Subtask{subtasks.length > 1 ? 's' : ''} {showSubtasks ? '▼' : '▶'}
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
                }]}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsAddingSub(true); }}
              >
                <Ionicons name="add-circle-outline" size={16} color={hasSubtasks ? colors.textMuted : colors.primary} />
                {!hasSubtasks && (
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Add Subtask</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={[homeStyles.dividerDashed, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />

          {/* ─── Project + Date Row ─── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <TouchableOpacity style={homeStyles.projectRow} onPress={() => onLinkProject(todo._id)}>
              <Ionicons name="link-outline" size={16} color={todo.projectId ? colors.primary : colors.textMuted} />
              <Text style={[homeStyles.projectText, todo.projectId && { color: colors.primary, fontStyle: 'normal', fontWeight: '600' }]}>
                {project?.name || todo.projectId || 'No project'}
              </Text>
            </TouchableOpacity>

            {todo.dueDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="calendar-outline" size={14} color={isDueSoon ? colors.danger : colors.textMuted} />
                <Text style={{ fontSize: 12, color: isDueSoon ? colors.danger : colors.textMuted, fontWeight: '500' }}>
                  {new Date(todo.dueDate).toLocaleDateString()}
                </Text>
              </View>
            )}

            {todo.date && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                <Ionicons name="calendar-clear-outline" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '500' }}>
                  {new Date(todo.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
          </View>

          {/* ─── Footer ─── */}
          <View style={homeStyles.footerRow}>
            <View style={homeStyles.footerStats}>
              {hasSubtasks && (
                <View style={homeStyles.statItem}>
                  <Ionicons name="list-outline" size={15} color={colors.textMuted} />
                  <Text style={homeStyles.statText}>{stats.done}/{stats.total} Subtasks</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => { setIsEditing(true); setEditText(todo.text); }}>
                <Ionicons name="create-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteTodo({ id: todo._id })}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </View>

      {/* ─── Add Subtask Input ─── */}
      {isAddingSub && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '30' }}>
          <Ionicons name="return-down-forward" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, color: colors.text, fontSize: 14 }}
            placeholder="What's a sub-step to complete this?"
            placeholderTextColor={colors.textMuted}
            value={newSubText}
            onChangeText={setNewSubText}
            autoFocus
            onSubmitEditing={handleAddSubtask}
            onBlur={() => { if (!newSubText.trim()) { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsAddingSub(false); } }}
          />
          <TouchableOpacity onPress={handleAddSubtask}>
            <Ionicons name="arrow-up-circle" size={28} color={newSubText.trim() ? colors.primary : colors.border} />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Subtask List ─── */}
      {showSubtasks && hasSubtasks && (
        <View style={{ marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.primary + '40', gap: 8 }}>
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
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default TodoCard;
