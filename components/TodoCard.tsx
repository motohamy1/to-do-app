import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import useTheme, { ShadowPreset } from '@/hooks/useTheme';
import { useTranslation } from '@/utils/i18n';
import { getServerNow } from '@/utils/offlineStorage';
import { showTaskCompletedNotification } from '@/utils/notifications';
import { buildPauseUpdates, buildSubtaskPauseUpdates, buildSubtaskStartUpdates, startUpdate } from '@/utils/timerActions';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, LayoutAnimation, Share, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import ActionModal from './ActionModal';
import CircularProgress from './CircularProgress';
import LivePress from './LivePress';
import { SubtaskRow } from './SubtaskRow';
import TaskDetailModal from './TaskDetailModal';

interface TodoCardProps {
  todo: {
    _id: Id<"todos">;
    _creationTime?: number;
    text: string;
    status: string;
    timerDuration?: number;
    timerDirection?: string;
    timerStartTime?: number;
    timerFirstStartTime?: number;
    timeLeftAtPause?: number;
    dueDate?: number;
    completedAt?: number;
    projectId?: string;
    date?: number;
    parentId?: Id<"todos">;
    userId?: Id<"users">;
    description?: string;
    location?: string;
    meetingLink?: string;
    priority?: string;
    categoryId?: Id<"projectCategories">;
    subCategoryId?: Id<"projectSubCategories">;
    goalId?: Id<"yearlyGoals">;
    hashtags?: string[];
  };
  onSetTimer: (id: Id<"todos">) => void;
  onLongPress?: (id: Id<"todos">) => void;
  onLinkProject: (id: Id<"todos">) => void;
  homeStyles: any;
  depth?: number;
  isTimelineMode?: boolean;
  initialShowDetails?: boolean;
  onOpenDetail?: (id: Id<"todos">, section?: 'subtask') => void;
}

// ─── Formatting & Color Helpers ──────────────────────────────────────────
const getLuminance = (hex: string) => {
  if (!hex || hex.length < 6) return 0;
  const c = hex.substring(hex.startsWith('#') ? 1 : 0);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >>  8) & 0xff;
  const b = (rgb >>  0) & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

const getStatusShadow = (colors: any, status: string) => {
  switch (status) {
    case 'in_progress': return colors.shadows.md;
    case 'done': return colors.shadows.sm;
    case 'not_started': return colors.shadows.sm;
    case 'paused': return colors.shadows.sm;
    case 'not_done': return colors.shadows.sm;
    default: return colors.shadows.sm;
  }
};

const getStatusBg = (colors: any, status: string) => {
  switch (status) {
    case 'in_progress': return colors.taskInProgressBg;
    case 'done': return colors.taskDoneBg;
    case 'not_started': return colors.taskNotStartedBg;
    case 'paused': return colors.taskPausedBg;
    case 'not_done': return colors.taskNotDoneBg;
    default: return colors.taskNotStartedBg;
  }
};

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatDuration = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const TodoCard: React.FC<TodoCardProps> = ({ todo, onSetTimer, onLongPress, onLinkProject, homeStyles, depth = 0, isTimelineMode = false, initialShowDetails = false, onOpenDetail }) => {
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const updateStatus = useOfflineMutation(api.todos.updateStatus, "todos:updateStatus");
  const setTimerRunState = useOfflineMutation(api.todos.setTimerRunState, "todos:setTimerRunState");
  const deleteTodo = useOfflineMutation(api.todos.deleteTodo, "todos:deleteTodo");
  const updateTodo = useOfflineMutation(api.todos.updateTodo, "todos:updateTodo");
  const setTimer = useOfflineMutation(api.todos.setTimer, "todos:setTimer");


  const project = useOfflineQuery<any>('projects.getProjectMetadata', api.projects.getProjectMetadata, todo.projectId ? { id: todo.projectId } : "skip");
  const linkedCategory = useOfflineQuery<any>('projects.getCategory', api.projects.getCategory, todo.categoryId ? { id: todo.categoryId } : "skip");
  const linkedSubCategory = useOfflineQuery<any>('projects.getSubCategory', api.projects.getSubCategory, todo.subCategoryId ? { id: todo.subCategoryId } : "skip");
  const linkedGoal = useOfflineQuery<any>('yearlyGoals.getGoal', api.yearlyGoals.getGoal, todo.goalId ? { id: todo.goalId } : "skip");
  const subtasks = useOfflineQuery<any[]>('todos.getSubtasks', api.todos.getSubtasks, { parentId: todo._id });

  const [timeLeft, setTimeLeft] = useState(todo.timerDuration || 0);
  const hasAutoCompletedRef = useRef(false);
  const hasAutoCompletedSubtasksRef = useRef(false);
  // Optimistic status: updates immediately on user action, syncs from server
  const [optimisticStatus, setOptimisticStatus] = useState(todo.status);

  const pulse = useSharedValue(todo.status === 'in_progress' ? 0.35 : 0);
  const titleScale = useSharedValue(1);
  const prevStatusRef = useRef(todo.status);

  useEffect(() => {
    if (todo.status === 'in_progress') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulse.value = withTiming(0, { duration: 250 });
    }
  }, [todo.status, pulse]);

  useEffect(() => {
    if (prevStatusRef.current !== 'done' && todo.status === 'done') {
      titleScale.value = withSequence(
        withDelay(60, withTiming(0.94, { duration: 110 })),
        withSpring(1, { damping: 9, stiffness: 260 })
      );
    }
    prevStatusRef.current = todo.status;
  }, [todo.status, titleScale]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const titleStyle = useAnimatedStyle(() => ({ transform: [{ scale: titleScale.value }] }));

  // Timer tick effect
  useEffect(() => {
    const effectiveStatus = optimisticStatus;
    let interval: any;
    if (effectiveStatus === 'in_progress' && todo.timerStartTime) {
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
    } else if (effectiveStatus === 'paused' && todo.timeLeftAtPause !== undefined) {
      setTimeLeft(todo.timeLeftAtPause);
    } else if (effectiveStatus === 'not_started' || effectiveStatus === 'not_done') {
      if (todo.timerDirection === 'up') {
        setTimeLeft(0);
      } else if (todo.timerDuration) {
        setTimeLeft(todo.timerDuration);
      }
    } else if (effectiveStatus === 'done') {
      if (todo.timerDirection === 'up') {
        setTimeLeft(todo.timeLeftAtPause || 0);
      } else if (todo.timerDuration) {
        setTimeLeft(todo.timerDuration);
      }
    }
    return () => clearInterval(interval);
  }, [optimisticStatus, todo.timerStartTime, todo.timerDuration, todo.timeLeftAtPause, todo.timerDirection]);

  // Keep optimistic status in sync with server (server is source of truth)
  useEffect(() => {
    setOptimisticStatus(todo.status);
  }, [todo.status]);

  const [showSubtasks, setShowSubtasks] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(initialShowDetails);
  const [detailModalSection, setDetailModalSection] = useState<'subtask' | undefined>(undefined);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);

  const openDetail = (section?: 'subtask') => {
    if (onOpenDetail) {
      onOpenDetail(todo._id, section);
    } else {
      setDetailModalSection(section);
      setIsDetailModalVisible(true);
    }
  };

  const hasSubtasks = subtasks && subtasks.length > 0;

  const handleShare = async () => {
    let message = `Task: ${todo.text}`;
    if (todo.description) message += `\n\nDescription: ${todo.description}`;
    if (todo.dueDate) {
      const d = new Date(todo.dueDate);
      message += `\nDue: ${d.toLocaleDateString()}`;
    }
    if (hasSubtasks && subtasks.length > 0) {
      message += `\n\nSubtasks:`;
      subtasks.forEach(s => {
        const check = s.status === 'done' ? '[x]' : '[ ]';
        message += `\n${check} ${s.text}`;
      });
    }
    await Share.share({ message });
  };

  const subtasksWithTimers = useMemo(() => {
    if (!hasSubtasks) return [];
    return subtasks.filter((s: any) => !!s.timerDuration);
  }, [subtasks, hasSubtasks]);
  const hasSubtaskTimers = subtasksWithTimers.length > 0;

  const timerProgress = useMemo(() => {
    if (!hasSubtasks || !todo.timerDuration) return null;
    const completedTimerSum = subtasks
      .filter((s: any) => s.status === 'done' && s.timerDuration)
      .reduce((sum: number, s: any) => sum + (s.timerDuration || 0), 0);
    return Math.min(100, (completedTimerSum / todo.timerDuration) * 100);
  }, [subtasks, todo.timerDuration, hasSubtasks]);

  const countProgress = useMemo(() => {
    if (!hasSubtasks) return 0;
    const done = subtasks.filter((s: any) => s.status === 'done').length;
    return (done / subtasks.length) * 100;
  }, [subtasks, hasSubtasks]);

  // Reset auto-complete guard when status changes away from in_progress
  useEffect(() => {
    if (todo.status !== 'in_progress') {
      hasAutoCompletedRef.current = false;
    }
    if (todo.status !== 'not_started' && todo.status !== 'not_done' && todo.status !== 'in_progress') {
      hasAutoCompletedSubtasksRef.current = false;
    }
  }, [todo.status]);

  // Separate effect for subtask auto-completion to avoid loops with timer
  useEffect(() => {
    if (!hasSubtasks) return;
    const completedSubtasks = subtasks.filter((s: any) => s.status === 'done').length;
    const totalSubtasks = subtasks.length;
    if (totalSubtasks > 0 && completedSubtasks === totalSubtasks && (todo.status === 'not_started' || todo.status === 'not_done' || todo.status === 'in_progress')) {
      if (hasAutoCompletedSubtasksRef.current) return;
      hasAutoCompletedSubtasksRef.current = true;
      updateStatus({ id: todo._id, status: 'done' });
      showTaskCompletedNotification(todo.text, isArabic ? 'ar' : 'en');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtasks?.map((s: any) => s.status).join(','), todo.status, todo._id]);

  const stats = {
    done: subtasks?.filter((s: any) => s.status === 'done').length || 0,
    total: subtasks?.length || 0,
  };

  const handleStartTimer = async () => {
    setOptimisticStatus('in_progress'); // instant UI feedback
    setTimerRunState({ updates: [startUpdate(todo)] });
  };

  const handlePauseTimer = async () => {
    setOptimisticStatus('paused'); // instant UI feedback
    const updates = buildPauseUpdates(todo, (subtasks || []) as any[]);
    if (updates.length === 0) {
      updateStatus({ id: todo._id, status: 'paused' });
      return;
    }
    setTimerRunState({ updates });
  };

  const handleStartSubtask = useCallback((subId: Id<"todos">) => {
    const sub = (subtasks || []).find((s: any) => s._id === subId);
    if (!sub) return;
    setTimerRunState({ updates: buildSubtaskStartUpdates(sub as any, todo as any) });
  }, [setTimerRunState, subtasks, todo]);

  const handlePauseSubtask = useCallback((subId: Id<"todos">) => {
    const sub = (subtasks || []).find((s: any) => s._id === subId);
    if (!sub) return;
    const updates = buildSubtaskPauseUpdates(sub as any, (subtasks || []) as any[], todo as any);
    if (updates.length === 0) return;
    setTimerRunState({ updates });
  }, [setTimerRunState, subtasks, todo]);

  const handleToggleSubComplete = useCallback((subId: Id<"todos">, currentStatus: string) => {
    updateStatus({ id: subId, status: currentStatus === 'done' ? 'not_started' : 'done' });
  }, [updateStatus]);

  const handleDeleteSub = useCallback((subId: Id<"todos">) => {
    deleteTodo({ id: subId });
  }, [deleteTodo]);

  const handleSetSubTimer = useCallback((subId: Id<"todos">, ms: number, direction: string) => {
    setTimer({ id: subId, duration: ms, timerDirection: direction });
  }, [setTimer]);

  const handleUpdateSubText = useCallback((subId: Id<"todos">, text: string) => {
    updateTodo({ id: subId, text });
  }, [updateTodo]);

  const moveToStatus = (status: string) => {
    setOptimisticStatus(status);
    updateStatus({ id: todo._id, status });
    if (status === 'done') {
      showTaskCompletedNotification(todo.text, isArabic ? 'ar' : 'en');
    }
  };

  const toggleSubtasks = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSubtasks(!showSubtasks);
  };

  const isTimerSet = !!todo.timerDuration || todo.timerDirection === 'up';
  const isDueSoon = todo.status === 'not_started' && todo.dueDate && (todo.dueDate - Date.now() < 86400000);
  const dueDateEnd = todo.dueDate ? new Date(todo.dueDate).setHours(23, 59, 59, 999) : 0;
  const isPastDue = todo.status === 'not_started' && todo.dueDate && dueDateEnd < Date.now();

  // Subtask progress calculation
  const subtaskProgressPercent = useMemo(() => {
    if (!hasSubtasks) return 0;
    return Math.round(countProgress);
  }, [hasSubtasks, countProgress]);

  // Timer circular progress calculation
  const timerCircularProgress = useMemo(() => {
    if (isTimerSet && todo.timerDuration) {
      return Math.min(100, Math.max(0, ((todo.timerDuration - timeLeft) / todo.timerDuration) * 100));
    }
    if (isTimerSet && todo.timerDirection === 'up' && timeLeft > 0) {
      return 100;
    }
    return optimisticStatus === 'done' ? 100 : 0;
  }, [isTimerSet, todo.timerDuration, todo.timerDirection, timeLeft, optimisticStatus]);

  const circularProgressColor = optimisticStatus === 'done' ? colors.success
    : (optimisticStatus === 'not_done' || isPastDue) ? colors.danger
    : optimisticStatus === 'in_progress' ? colors.warning
    : optimisticStatus === 'paused' ? colors.textMuted
    : colors.primary;

  const timerText = useMemo(() => {
    if (optimisticStatus === 'done') return t.done;
    if (optimisticStatus === 'not_done' || isPastDue) return '—';
    return formatTime(timeLeft);
  }, [optimisticStatus, isPastDue, timeLeft, t.done]);

  // Subtitle text (description or project or due date)
  const subtitleText = todo.description 
    || project?.name 
    || linkedSubCategory?.name 
    || linkedCategory?.name 
    || (todo.dueDate ? `${isArabic ? 'الموعد: ' : 'Due: '}${new Date(todo.dueDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}` : '');

  // Status configuration matching the 4-color palette
  let statusPillBg = colors.primary; // #dbd4fd
  let statusPillText = '#23173D';
  let statusPillLabel = isArabic ? 'للقيام بها' : 'To Do';

  if (optimisticStatus === 'done') {
    statusPillBg = colors.success; // #e5f19d
    statusPillText = '#16270E';
    statusPillLabel = isArabic ? 'مكتمل' : 'Complete';
  } else if (optimisticStatus === 'in_progress') {
    statusPillBg = colors.warning; // #f6e5c9
    statusPillText = '#2D1E0C';
    statusPillLabel = isArabic ? 'قيد التنفيذ' : 'In Progress';
  } else if (optimisticStatus === 'paused') {
    statusPillBg = isDarkMode ? '#252636' : '#E2E8F0';
    statusPillText = isDarkMode ? '#dbd4fd' : '#0F172A';
    statusPillLabel = isArabic ? 'مؤقت' : 'Paused';
  } else if (optimisticStatus === 'not_done' || isPastDue) {
    statusPillBg = colors.danger;
    statusPillText = '#FFFFFF';
    statusPillLabel = isArabic ? 'متأخر' : 'Overdue';
  }

  // Priority badge text & color
  const priorityLabel = todo.priority || 'Medium';

  const handleToggleNextStatus = () => {
    if (optimisticStatus === 'not_started' || optimisticStatus === 'not_done') {
      if (isTimerSet) {
        handleStartTimer();
      } else {
        moveToStatus('in_progress');
      }
    } else if (optimisticStatus === 'in_progress') {
      if (isTimerSet) {
        handlePauseTimer();
      } else {
        moveToStatus('done');
      }
    } else if (optimisticStatus === 'paused') {
      handleStartTimer();
    } else if (optimisticStatus === 'done') {
      moveToStatus('not_started');
    }
  };

  const coreCard = (
    <>
      <LivePress 
        activeOpacity={0.94}
        onPress={() => openDetail()}
        onLongPress={() => { 
          setIsActionModalVisible(true);
          if (onLongPress) onLongPress(todo._id); 
        }}
        style={[
          homeStyles.card, 
          { 
            overflow: 'hidden', 
            position: 'relative', 
            backgroundColor: isDarkMode ? '#16171E' : '#FFFFFF', 
            borderColor: isDarkMode ? '#252733' : colors.border, 
            borderWidth: 1, 
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingVertical: 16,
            marginBottom: 12,
            ...getStatusShadow(colors, todo.status),
          }
        ]}
      >
        <View style={{ zIndex: 1, flex: 1 }}>
          {/* Row 1: Title & Subtitle (left) + Round Timer & More Menu (right) */}
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }]}>
            <View style={{ flex: 1, paddingEnd: 12 }}>
              <Animated.View style={titleStyle}>
                <Text 
                  style={[
                    homeStyles.cardTitle,
                    {
                      fontSize: 16,
                      fontWeight: '700',
                      color: todo.status === 'done' ? colors.textMuted : colors.text,
                      textDecorationLine: todo.status === 'done' ? 'line-through' : 'none',
                      letterSpacing: -0.2,
                    },
                    isArabic && { textAlign: 'right' },
                  ]} 
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {todo.text}
                </Text>
              </Animated.View>

              {subtitleText ? (
                <Text 
                  style={[{
                    fontSize: 13,
                    fontWeight: '400',
                    color: colors.textMuted,
                    marginTop: 3,
                  }, isArabic && { textAlign: 'right' }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {subtitleText}
                </Text>
              ) : null}
            </View>

            {/* Right Controls: Round Timer (if timer enabled) + More Menu */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isTimerSet && (
                <CircularProgress
                  size={46}
                  strokeWidth={3.5}
                  progress={timerCircularProgress}
                  color={circularProgressColor}
                  unfilledColor={isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
                >
                  <Text style={{ fontSize: 8.5, fontWeight: "800", color: circularProgressColor, textAlign: 'center' }}>
                    {timerText}
                  </Text>
                </CircularProgress>
              )}

              <TouchableOpacity 
                onPress={() => setIsActionModalVisible(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Priority & Status Pills (left) | Subtasks & Completion % (right) */}
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, marginBottom: hasSubtasks ? 10 : 0 }]}>
            {/* Left Badges */}
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              {/* Priority Pill */}
              <View style={{
                backgroundColor: isDarkMode ? '#242634' : '#F1F5F9',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDarkMode ? '#2F3244' : '#E2E8F0',
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: todo.priority === 'High' ? colors.danger : todo.priority === 'Medium' ? colors.warning : (isDarkMode ? '#CBD5E1' : '#475569'),
                }}>
                  {priorityLabel}
                </Text>
              </View>

              {/* Status Pill (Interactive toggle) */}
              <TouchableOpacity 
                activeOpacity={0.85}
                onPress={handleToggleNextStatus}
                style={{
                  backgroundColor: statusPillBg,
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {optimisticStatus === 'in_progress' && (
                  <Ionicons name="play" size={11} color={statusPillText} />
                )}
                {optimisticStatus === 'paused' && (
                  <Ionicons name="pause" size={11} color={statusPillText} />
                )}
                {optimisticStatus === 'done' && (
                  <Ionicons name="checkmark" size={12} color={statusPillText} />
                )}
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: statusPillText,
                }}>
                  {statusPillLabel}
                </Text>
              </TouchableOpacity>

              {/* Goal Pill */}
              {linkedGoal && (
                <View style={{
                  backgroundColor: '#8B5CF620',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#8B5CF640',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  maxWidth: 130,
                }}>
                  <Ionicons name="flag" size={11} color="#8B5CF6" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B5CF6' }} numberOfLines={1}>
                    {linkedGoal.title}
                  </Text>
                </View>
              )}

              {/* Space / Project Pill */}
              {(project || linkedCategory) && (
                <View style={{
                  backgroundColor: (project?.color || colors.primary) + '20',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: (project?.color || colors.primary) + '40',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  maxWidth: 120,
                }}>
                  <Ionicons name="folder-outline" size={11} color={project?.color || colors.primary} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: project?.color || colors.primary }} numberOfLines={1}>
                    {project?.name || linkedCategory?.name}
                  </Text>
                </View>
              )}
            </View>

            {/* Right Info: Subtasks & Progression % */}
            {hasSubtasks && (
              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <TouchableOpacity 
                  onPress={toggleSubtasks}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: isDarkMode ? '#242634' : '#F1F5F9',
                  }}
                >
                  <Ionicons name="list-outline" size={13} color={colors.textMuted} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
                    {stats.done}/{stats.total}
                  </Text>
                  <Ionicons name={showSubtasks ? 'chevron-up' : 'chevron-down'} size={11} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Subtasks Completion % */}
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: subtaskProgressPercent >= 100 ? colors.success : colors.textMuted,
                }}>
                  {subtaskProgressPercent}%
                </Text>
              </View>
            )}
          </View>

          {/* Row 3: Horizontal Subtasks Progress Bar (Displays when task has subtasks) */}
          {hasSubtasks && (
            <View style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: isDarkMode ? '#252733' : '#E2E8F0',
              position: 'relative',
              marginTop: 4,
              justifyContent: 'center',
            }}>
              <View style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: subtaskProgressPercent >= 100 ? colors.success : colors.primary,
                width: `${Math.min(100, Math.max(0, subtaskProgressPercent))}%`,
              }} />

              {/* Glowing Thumb Dot at end of subtask progress */}
              {subtaskProgressPercent > 0 && subtaskProgressPercent < 100 && (
                <View style={{
                  position: 'absolute',
                  start: `${Math.min(97, Math.max(0, subtaskProgressPercent))}%`,
                  width: 9,
                  height: 9,
                  borderRadius: 4.5,
                  backgroundColor: colors.primary,
                  borderWidth: 2,
                  borderColor: isDarkMode ? '#16171E' : '#FFFFFF',
                  transform: [{ translateX: -4.5 }],
                }} />
              )}
            </View>
          )}

          {/* Subtasks Expanded List */}
          {showSubtasks && hasSubtasks && (
            <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDarkMode ? '#252733' : '#E2E8F0', gap: 8 }}>
              {subtasks.map((sub: any) => (
                <SubtaskRow
                  key={sub._id}
                  sub={sub}
                  parentTimerDuration={todo.timerDuration}
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
        </View>
      </LivePress>
    </>
  );

  const actionModal = (
    <ActionModal 
      visible={isActionModalVisible}
      onClose={() => setIsActionModalVisible(false)}
      title={todo.text}
      isArabic={isArabic}
      options={[
        { 
          label: t.edit || 'Edit', 
          icon: 'create-outline', 
          onPress: () => {
            setIsActionModalVisible(false);
            openDetail();
          } 
        },
        {
          label: t.linkProject || 'Link Project',
          icon: 'folder-outline',
          onPress: () => {
            setIsActionModalVisible(false);
            if (onLinkProject) onLinkProject(todo._id);
          }
        },
        { 
          label: t.share || 'Share', 
          icon: 'share-social-outline', 
          onPress: () => {
            setIsActionModalVisible(false);
            handleShare();
          } 
        },
        { 
          label: t.delete || 'Delete', 
          icon: 'trash-outline', 
          variant: 'destructive',
          onPress: () => {
            setIsActionModalVisible(false);
            Alert.alert(
              t.confirmDeleteTitle || "Confirm Delete", 
              t.confirmDeleteTask || "Are you sure you want to delete this task?", 
              [
                { text: t.cancel || "Cancel", style: "cancel" },
                { text: t.delete || "Delete", style: "destructive", onPress: () => deleteTodo({ id: todo._id }) }
              ]
            );
          }
        }
      ]}
    />
  );

  if (isTimelineMode) {
    const isPlaying = todo.status === 'in_progress';
    const isDone = todo.status === 'done';
    const formatTimeShort = (ms: number) => {
      const d = new Date(ms);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    // Top time: first time user ever started the timer; cleared only on reset
    const startTimeStr = todo.timerFirstStartTime ? formatTimeShort(todo.timerFirstStartTime) : '';

    // Bottom time: when task was completed (done status + completedAt), else empty
    const endTimeStr = isDone && todo.completedAt ? formatTimeShort(todo.completedAt) : '';
    
    return (
      <Animated.View
        entering={FadeInDown.duration(300).easing(Easing.out(Easing.cubic))}
        style={[
        homeStyles.cardContainer,
        {
          marginHorizontal: 0,
          marginStart: 24 + (depth * 16),
          marginEnd: 24,
          flexDirection: 'row'
        }
      ]}>
        <View style={[homeStyles.timelineColumn, { justifyContent: 'space-between', paddingVertical: 12, alignItems: 'center' }]}>
          <Text style={[homeStyles.timelineTimeTop, { color: colors.text }]}>{startTimeStr}</Text>
          <View style={{ flex: 1, width: 2, backgroundColor: isPlaying ? colors.primary : colors.border, marginVertical: 8 }} />
          {endTimeStr ? <Text style={[homeStyles.timelineTimeBottom, { color: colors.textMuted }]}>{endTimeStr}</Text> : null}
        </View>
        {coreCard}
        {!onOpenDetail && (
        <TaskDetailModal 
          visible={isDetailModalVisible}
          onClose={() => { setIsDetailModalVisible(false); setDetailModalSection(undefined); }}
          todoId={todo._id}
          initialSection={detailModalSection}
        />
        )}
        {actionModal}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(300).easing(Easing.out(Easing.cubic))} style={{ marginStart: depth * 16 }}>
      {coreCard}
      {!onOpenDetail && (
      <TaskDetailModal 
        visible={isDetailModalVisible}
        onClose={() => { setIsDetailModalVisible(false); setDetailModalSection(undefined); }}
        todoId={todo._id}
        initialSection={detailModalSection}
      />
      )}
      {actionModal}
    </Animated.View>
  );
};

export default TodoCard;
