import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ScrollView, Text, View, TouchableOpacity, LayoutAnimation, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import useTheme from '@/hooks/useTheme';
import { useTranslation } from '@/utils/i18n';
import { getServerNow } from '@/utils/offlineStorage';
import { pauseUpdate, startUpdate } from '@/utils/timerActions';
import CircularProgress from './CircularProgress';
import LivePress from './LivePress';

export interface KanbanTask {
  _id: Id<'todos'>;
  _creationTime?: number;
  text: string;
  status: string;
  priority?: string;
  dueDate?: number;
  timerDuration?: number;
  timerDirection?: string;
  timerStartTime?: number;
  timerFirstStartTime?: number;
  timeLeftAtPause?: number;
  projectId?: string;
  categoryId?: Id<'projectCategories'>;
  subCategoryId?: Id<'projectSubCategories'>;
  description?: string;
  hashtags?: string[];
}

export interface KanbanColumn {
  key: string;
  title: string;
  color: string;
  tasks: KanbanTask[];
}

interface TaskKanbanProps {
  columns: KanbanColumn[];
  homeStyles: any;
  isArabic?: boolean;
  now: number;
  onOpenDetail: (id: Id<'todos'>, section?: 'subtask') => void;
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatDuration = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const KanbanCard: React.FC<{ 
  task: KanbanTask; 
  homeStyles: any; 
  isArabic: boolean; 
  now: number; 
  onOpenDetail: (id: Id<'todos'>, section?: 'subtask') => void 
}> = ({ task, homeStyles, isArabic, now, onOpenDetail }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(isArabic ? 'ar' : 'en');
  const updateStatus = useOfflineMutation(api.todos.updateStatus, 'todos:updateStatus');
  const setTimerRunState = useOfflineMutation(api.todos.setTimerRunState, 'todos:setTimerRunState');

  // Subtasks & Project Queries
  const subtasks = useOfflineQuery<any[]>('todos.getSubtasks', api.todos.getSubtasks, { parentId: task._id });
  const project = useOfflineQuery<any>('projects.getProjectMetadata', api.projects.getProjectMetadata, task.projectId ? { id: task.projectId } : "skip");

  const [showSubtasks, setShowSubtasks] = useState(false);
  const [timeLeft, setTimeLeft] = useState(task.timerDuration || 0);

  const isTimerSet = !!task.timerDuration || task.timerDirection === 'up';
  const isPastDue = !!task.dueDate && task.dueDate < now && task.status !== 'done';

  // Live Timer Countdown Effect
  useEffect(() => {
    let interval: any;
    if (task.status === 'in_progress' && task.timerStartTime) {
      const tick = () => {
        const elapsed = Math.max(0, getServerNow() - task.timerStartTime!);
        if (task.timerDirection === 'up') {
          setTimeLeft(elapsed);
        } else if (task.timerDuration) {
          setTimeLeft(Math.max(0, task.timerDuration - elapsed));
        }
      };
      tick();
      interval = setInterval(tick, 1000);
    } else if (task.status === 'paused' && task.timeLeftAtPause !== undefined) {
      setTimeLeft(task.timeLeftAtPause);
    } else if (task.status === 'done') {
      setTimeLeft(task.timerDuration || 0);
    } else {
      setTimeLeft(task.timerDuration || 0);
    }
    return () => clearInterval(interval);
  }, [task.status, task.timerStartTime, task.timerDuration, task.timeLeftAtPause, task.timerDirection]);

  // Subtasks Progress Calculation
  const hasSubtasks = !!(subtasks && subtasks.length > 0);
  const completedSubtasks = hasSubtasks ? subtasks.filter((s: any) => s.status === 'done').length : 0;
  const totalSubtasks = hasSubtasks ? subtasks.length : 0;
  const subtaskProgressPercent = hasSubtasks ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // Timer Circular Progress Calculation
  const timerCircularProgress = useMemo(() => {
    if (isTimerSet && task.timerDuration) {
      return Math.min(100, Math.max(0, ((task.timerDuration - timeLeft) / task.timerDuration) * 100));
    }
    if (isTimerSet && task.timerDirection === 'up' && timeLeft > 0) {
      return 100;
    }
    return task.status === 'done' ? 100 : 0;
  }, [isTimerSet, task.timerDuration, task.timerDirection, timeLeft, task.status]);

  const circularProgressColor = task.status === 'done' ? colors.success
    : (task.status === 'not_done' || isPastDue) ? colors.danger
    : task.status === 'in_progress' ? colors.warning
    : task.status === 'paused' ? colors.textMuted
    : colors.primary;

  const timerDisplayLabel = useMemo(() => {
    if (task.status === 'done') return '✓';
    if (timeLeft >= 3600000) return formatDuration(timeLeft);
    return formatTime(timeLeft);
  }, [task.status, timeLeft]);

  // Extract Hashtags from text or properties
  const extractedHashtags = useMemo(() => {
    const tags = new Set<string>(task.hashtags || []);
    const regex = /(#[a-zA-Z0-9_\u0600-\u06FF]+)/g;
    const matches = (task.text + ' ' + (task.description || '')).match(regex);
    if (matches) {
      matches.forEach(tag => tags.add(tag));
    }
    return Array.from(tags);
  }, [task.text, task.description, task.hashtags]);

  // Clean Task Title
  const cleanTitle = task.text;

  // Dedicated Action Handlers for Start, Pause, Resume, Done, Reopen
  const handleStartResume = (e?: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isTimerSet) {
      setTimerRunState({ updates: [startUpdate(task)] });
    } else {
      updateStatus({ id: task._id, status: 'in_progress' });
    }
  };

  const handlePause = (e?: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isTimerSet) {
      const update = pauseUpdate(task);
      if (update) {
        setTimerRunState({ updates: [update] });
        return;
      }
    }
    updateStatus({ id: task._id, status: 'paused' });
  };

  const handleDone = (e?: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateStatus({ id: task._id, status: 'done' });
  };

  const handleReopen = (e?: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateStatus({ id: task._id, status: 'not_started' });
  };

  const toggleSubtasks = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSubtasks(!showSubtasks);
  };

  const priorityColor = task.priority === 'High' || task.priority === 'Urgent' ? colors.danger
    : task.priority === 'Medium' ? colors.warning
    : colors.textMuted;

  return (
    <Animated.View entering={FadeInDown.duration(300).easing(Easing.out(Easing.cubic))}>
      <LivePress
        onPress={() => onOpenDetail(task._id)}
        style={{
          backgroundColor: isDarkMode ? '#16171E' : '#FFFFFF',
          borderWidth: 1,
          borderColor: isDarkMode ? '#252733' : colors.border,
          borderRadius: 18,
          padding: 14,
          marginBottom: 12,
          ...colors.shadows.sm,
        }}
      >
        {/* Header Row: Title & Circular Round Progress Timer */}
        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <Text
            numberOfLines={2}
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: '700',
              color: task.status === 'done' ? colors.textMuted : colors.text,
              textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
              letterSpacing: -0.2,
              textAlign: isArabic ? 'right' : 'left',
            }}
          >
            {cleanTitle}
          </Text>

          {/* Interactive Circular Round Progress Timer (Tap to Toggle Pause/Resume) */}
          {isTimerSet && (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={task.status === 'in_progress' ? handlePause : handleStartResume}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ marginStart: 4 }}
            >
              <CircularProgress
                size={38}
                strokeWidth={3}
                progress={timerCircularProgress}
                color={circularProgressColor}
                unfilledColor={isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
              >
                <Text style={{ fontSize: 9, fontWeight: '800', color: circularProgressColor, textAlign: 'center' }}>
                  {timerDisplayLabel}
                </Text>
              </CircularProgress>
            </TouchableOpacity>
          )}
        </View>

        {/* Project Link & Hashtags Badges */}
        {(project || extractedHashtags.length > 0) && (
          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {/* Linked Project Badge */}
            {project && (
              <View 
                style={{ 
                  flexDirection: isArabic ? 'row-reverse' : 'row', 
                  alignItems: 'center', 
                  gap: 5, 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', 
                  paddingHorizontal: 8, 
                  paddingVertical: 3, 
                  borderRadius: 8 
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: project.color || colors.primary }} />
                <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '700', color: colors.text }}>
                  {project.name}
                </Text>
              </View>
            )}

            {/* Hashtag Chips */}
            {extractedHashtags.map((tag) => (
              <View 
                key={tag} 
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(142, 167, 233, 0.12)' : 'rgba(142, 167, 233, 0.15)', 
                  paddingHorizontal: 7, 
                  paddingVertical: 2.5, 
                  borderRadius: 6 
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Subtasks Section: Horizontal Progress Bar & Toggle Subtasks Button */}
        {hasSubtasks && (
          <View style={{ marginBottom: 10, gap: 5 }}>
            {/* Label & Toggle Button Row */}
            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Toggle Subtasks Button */}
              <TouchableOpacity
                onPress={toggleSubtasks}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={{
                  flexDirection: isArabic ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                }}
              >
                <Ionicons name="list-outline" size={12} color={colors.textMuted} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
                  {completedSubtasks}/{totalSubtasks} {t.subtasks || 'subtasks'}
                </Text>
                <Ionicons name={showSubtasks ? 'chevron-up' : 'chevron-down'} size={11} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Completion Percentage */}
              <Text style={{ fontSize: 11, fontWeight: '700', color: subtaskProgressPercent >= 100 ? colors.success : colors.primary }}>
                {subtaskProgressPercent}%
              </Text>
            </View>

            {/* Horizontal Subtask Progress Bar */}
            <View 
              style={{ 
                height: 4, 
                borderRadius: 2, 
                backgroundColor: isDarkMode ? '#252733' : '#E2E8F0', 
                overflow: 'hidden' 
              }}
            >
              <View 
                style={{ 
                  height: '100%', 
                  width: `${subtaskProgressPercent}%`, 
                  backgroundColor: subtaskProgressPercent >= 100 ? colors.success : colors.primary, 
                  borderRadius: 2 
                }} 
              />
            </View>

            {/* Expanded Interactive Subtasks List */}
            {showSubtasks && (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDarkMode ? '#252733' : '#E2E8F0', gap: 6 }}>
                {subtasks.map((sub: any) => {
                  const isSubDone = sub.status === 'done';
                  return (
                    <View 
                      key={sub._id} 
                      style={{ 
                        flexDirection: isArabic ? 'row-reverse' : 'row', 
                        alignItems: 'center', 
                        gap: 8, 
                        paddingVertical: 2 
                      }}
                    >
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          updateStatus({ id: sub._id, status: isSubDone ? 'not_started' : 'done' });
                        }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 5,
                          borderWidth: 1.5,
                          borderColor: isSubDone ? colors.success : colors.textMuted,
                          backgroundColor: isSubDone ? colors.success : 'transparent',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {isSubDone && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={{ flex: 1 }} 
                        onPress={() => onOpenDetail(sub._id, 'subtask')}
                      >
                        <Text 
                          numberOfLines={1} 
                          style={{
                            fontSize: 12,
                            fontWeight: '500',
                            color: isSubDone ? colors.textMuted : colors.text,
                            textDecorationLine: isSubDone ? 'line-through' : 'none',
                            textAlign: isArabic ? 'right' : 'left',
                          }}
                        >
                          {sub.text}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Bottom Row: Direct Action Controls (Pause / Resume / Start / Done / Reopen) & Priority */}
        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
          {/* Action Control Buttons Group */}
          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            {/* 1. In Progress Status: Pause Button + Done Button */}
            {task.status === 'in_progress' && (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePause}
                  style={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: isDarkMode ? '#333647' : '#E2E8F0',
                    paddingHorizontal: 9,
                    paddingVertical: 4.5,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons name="pause" size={11} color={isDarkMode ? '#FFFFFF' : '#0F172A'} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : '#0F172A' }}>
                    {isArabic ? 'إيقاف' : 'Pause'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDone}
                  style={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: colors.success,
                    paddingHorizontal: 9,
                    paddingVertical: 4.5,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons name="checkmark" size={12} color="#0E0F14" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0E0F14' }}>
                    {isArabic ? 'إتمام' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* 2. Paused Status: Resume Button + Done Button */}
            {task.status === 'paused' && (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleStartResume}
                  style={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: colors.warning,
                    paddingHorizontal: 9,
                    paddingVertical: 4.5,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons name="play" size={11} color="#0E0F14" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0E0F14' }}>
                    {isArabic ? 'استئناف' : 'Resume'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDone}
                  style={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: colors.success,
                    paddingHorizontal: 9,
                    paddingVertical: 4.5,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons name="checkmark" size={12} color="#0E0F14" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0E0F14' }}>
                    {isArabic ? 'إتمام' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* 3. Not Started / Overdue Status: Start Button + Done Check Button */}
            {(task.status === 'not_started' || task.status === 'not_done') && (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleStartResume}
                  style={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: colors.primary,
                    paddingHorizontal: 10,
                    paddingVertical: 4.5,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons name="play" size={11} color={isDarkMode ? '#0E0F14' : '#FFFFFF'} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#0E0F14' : '#FFFFFF' }}>
                    {isArabic ? 'بدء' : 'Start'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDone}
                  style={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#2F3244' : '#E2E8F0',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons name="checkmark" size={12} color={colors.textMuted} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
                    {isArabic ? 'إتمام' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* 4. Done Status: Reopen Button */}
            {task.status === 'done' && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleReopen}
                style={{
                  flexDirection: isArabic ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#2F3244' : '#E2E8F0',
                  paddingHorizontal: 9,
                  paddingVertical: 4.5,
                  borderRadius: 10,
                }}
              >
                <Ionicons name="arrow-undo-outline" size={11} color={colors.textMuted} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
                  {isArabic ? 'إعادة فتح' : 'Reopen'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Priority Tag */}
          {task.priority ? (
            <View 
              style={{ 
                backgroundColor: isDarkMode ? '#242634' : '#F1F5F9', 
                paddingHorizontal: 8, 
                paddingVertical: 3, 
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDarkMode ? '#2F3244' : '#E2E8F0',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: priorityColor }}>
                {task.priority}
              </Text>
            </View>
          ) : null}
        </View>
      </LivePress>
    </Animated.View>
  );
};

export const TaskKanban: React.FC<TaskKanbanProps> = ({ columns, homeStyles, isArabic = false, now, onOpenDetail }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(isArabic ? 'ar' : 'en');
  const { width: screenWidth } = useWindowDimensions();

  const scrollViewRef = React.useRef<ScrollView>(null);
  const [activeColIndex, setActiveColIndex] = useState(0);

  const COLUMN_WIDTH = Math.min(Math.max(screenWidth - 56, 280), 340);
  const COLUMN_GAP = 12;
  const SNAP_INTERVAL = COLUMN_WIDTH + COLUMN_GAP;
  const HORIZONTAL_PADDING = 16;

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SNAP_INTERVAL);
    if (index !== activeColIndex && index >= 0 && index < columns.length) {
      setActiveColIndex(index);
    }
  };

  const handleSelectTab = (index: number) => {
    setActiveColIndex(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: index * SNAP_INTERVAL, animated: true });
    }
  };

  return (
    <View>
      {/* 1. Quick Column Switcher Tabs (All 4 items fully visible across the screen) */}
      <View
        style={{
          flexDirection: isArabic ? 'row-reverse' : 'row',
          paddingHorizontal: 16,
          gap: 6,
          marginBottom: 12,
          width: '100%',
        }}
      >
        {columns.map((col, idx) => {
          const isActive = activeColIndex === idx;
          return (
            <TouchableOpacity
              key={col.key}
              onPress={() => handleSelectTab(idx)}
              activeOpacity={0.75}
              style={{
                flex: 1,
                minWidth: 0,
                flexDirection: isArabic ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingHorizontal: 4,
                paddingVertical: 6.5,
                borderRadius: 14,
                backgroundColor: isActive
                  ? (isDarkMode ? `${col.color}25` : `${col.color}18`)
                  : (isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                borderWidth: 1,
                borderColor: isActive
                  ? col.color
                  : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
              }}
            >
              <View
                style={{
                  width: 5.5,
                  height: 5.5,
                  borderRadius: 3,
                  backgroundColor: col.color,
                  flexShrink: 0,
                }}
              />
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: isActive ? '700' : '600',
                  color: isActive ? (isDarkMode ? '#FFFFFF' : col.color) : colors.textMuted,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {col.title}
              </Text>
              <View
                style={{
                  backgroundColor: isActive ? col.color : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                  paddingHorizontal: 4.5,
                  paddingVertical: 1,
                  borderRadius: 8,
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 9.5,
                    fontWeight: '800',
                    color: isActive ? '#0E0F14' : colors.textMuted,
                  }}
                >
                  {col.tasks.length}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. Snapped Column ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          { 
            flexDirection: isArabic ? 'row-reverse' : 'row', 
            paddingHorizontal: HORIZONTAL_PADDING, 
            gap: COLUMN_GAP, 
            paddingBottom: 16,
            alignItems: 'flex-start',
          }
        ]}
      >
        {columns.map((column) => (
          <View
            key={column.key}
            style={{
              width: COLUMN_WIDTH,
              borderRadius: 20,
              paddingHorizontal: 2,
              paddingTop: 4,
              alignSelf: 'flex-start',
            }}
          >
            <View style={[homeStyles.kanbanColumnHeader, isArabic && { flexDirection: 'row-reverse' }, { marginBottom: column.tasks.length === 0 ? 8 : 12 }]}>
              <View style={[homeStyles.kanbanColumnDot, { backgroundColor: column.color }]} />
              <Text style={homeStyles.kanbanColumnTitle}>{column.title}</Text>
              <Text style={homeStyles.kanbanColumnCount}>{column.tasks.length}</Text>
            </View>

            {column.tasks.length === 0 ? (
              <View style={[homeStyles.kanbanEmpty, { paddingVertical: 14 }]}>
                <Text style={homeStyles.kanbanEmptyText}>{t.noTasksDay}</Text>
              </View>
            ) : (
              column.tasks.map(task => (
                <KanbanCard key={task._id} task={task} homeStyles={homeStyles} isArabic={isArabic} now={now} onOpenDetail={onOpenDetail} />
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default TaskKanban;
