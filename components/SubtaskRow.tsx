import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '../convex/_generated/dataModel';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import { getServerNow } from '@/utils/offlineStorage';
import useTheme from '@/hooks/useTheme';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { api } from '../convex/_generated/api';
import CircularProgress from './CircularProgress';
import { InlineTimerPicker } from './InlineTimerPicker';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import UniversalLinkPickerModal, { UniversalLinkSelection } from './UniversalLinkPickerModal';

// Helper to format ms to HH:MM:SS or MM:SS
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDuration = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// Luminance helper
const getLuminance = (hex: string) => {
  if (!hex || hex.length < 6) return 0;
  const c = hex.substring(hex.startsWith('#') ? 1 : 0);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >>  8) & 0xff;
  const b = (rgb >>  0) & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

interface SubtaskRowProps {
  sub: any;
  parentTimerDuration?: number;
  onStartSubtask: (id: Id<"todos">) => void;
  onPauseSubtask: (id: Id<"todos">) => void;
  onToggleComplete: (id: Id<"todos">, currentStatus: string) => void;
  onDelete: (id: Id<"todos">) => void;
  onSetTimer: (id: Id<"todos">, ms: number, direction: string) => void;
  onUpdateText: (id: Id<"todos">, text: string) => void;
  onUpdateStatus: (id: Id<"todos">, status: string) => void;
  onSelect?: (id: Id<"todos">) => void;
}

const localStyles = {
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  linkPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  linkPillText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
};

export const SubtaskRow = ({
  sub,
  parentTimerDuration,
  onStartSubtask,
  onPauseSubtask,
  onToggleComplete,
  onDelete,
  onSetTimer,
  onUpdateText,
  onUpdateStatus,
  onSelect,
}: SubtaskRowProps) => {
  const { language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const { colors, isDarkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(sub.text);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [subTimeLeft, setSubTimeLeft] = useState(sub.timerDuration || 0);
  const [isLinkPickerVisible, setIsLinkPickerVisible] = useState(false);

  const linkTask = useOfflineMutation(api.todos.linkTask, "todos:linkTask");

  // Linked metadata queries for subtask independent links
  const subProject = useOfflineQuery<any>(
    'projects.getProjectMetadata',
    api.projects.getProjectMetadata,
    sub.projectId ? { id: sub.projectId } : "skip"
  );
  const subCategory = useOfflineQuery<any>(
    'projects.getCategory',
    api.projects.getCategory,
    sub.categoryId ? { id: sub.categoryId } : "skip"
  );
  const subGoal = useOfflineQuery<any>(
    'yearlyGoals.getGoal',
    api.yearlyGoals.getGoal,
    sub.goalId ? { id: sub.goalId } : "skip"
  );

  const linkedItemName = subProject?.name || subCategory?.name;
  const linkedItemColor = subProject?.color || subCategory?.color || colors.primary;
  const goalItemTitle = subGoal?.text || subGoal?.title;
  const goalItemColor = subGoal?.color || colors.warning;
  const hasLinks = !!linkedItemName || !!goalItemTitle;

  const handleSelectLink = (selection: UniversalLinkSelection) => {
    if (selection.type === 'none') {
      linkTask({
        id: sub._id,
        categoryId: undefined,
        subCategoryId: undefined,
        projectId: undefined,
        goalId: undefined,
      });
    } else if (selection.type === 'goal') {
      linkTask({
        id: sub._id,
        goalId: selection.goalId,
        categoryId: sub.categoryId,
        subCategoryId: sub.subCategoryId,
        projectId: sub.projectId,
      });
    } else if (selection.type === 'category') {
      linkTask({
        id: sub._id,
        categoryId: selection.categoryId,
        subCategoryId: undefined,
        projectId: undefined,
        goalId: sub.goalId,
      });
    } else if (selection.type === 'subCategory') {
      linkTask({
        id: sub._id,
        categoryId: selection.categoryId,
        subCategoryId: selection.subCategoryId,
        projectId: undefined,
        goalId: sub.goalId,
      });
    } else if (selection.type === 'project') {
      linkTask({
        id: sub._id,
        categoryId: undefined,
        subCategoryId: undefined,
        projectId: selection.projectId,
        goalId: sub.goalId,
      });
    }
  };

  // Compute remaining budget for this subtask's timer picker
  const subtasks = useOfflineQuery<any[]>('todos.getSubtasks', api.todos.getSubtasks, sub.parentId ? { parentId: sub.parentId } : "skip");
  const remainingBudget = useMemo(() => {
    if (!parentTimerDuration || !subtasks) return undefined;
    const otherSubsDuration = subtasks
      .filter((s: any) => s._id !== sub._id)
      .reduce((sum: number, s: any) => sum + (s.timerDuration || 0), 0);
    return Math.max(0, parentTimerDuration - otherSubsDuration);
  }, [parentTimerDuration, subtasks, sub._id]);

  // Live countdown for running subtasks
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (sub.status === 'in_progress' && sub.timerStartTime) {
      if (sub.timerDirection === 'up') {
        const calc = () => {
          const elapsed = getServerNow() - sub.timerStartTime!;
          setSubTimeLeft((prev: number) => prev !== elapsed ? elapsed : prev);
        };
        calc();
        interval = setInterval(calc, 1000);
      } else if (sub.timerDuration) {
        const calc = () => {
          const elapsed = getServerNow() - sub.timerStartTime!;
          const remaining = Math.max(0, sub.timerDuration! - elapsed);
          setSubTimeLeft((prev: number) => prev !== remaining ? remaining : prev);
          if (remaining === 0 && sub.status === 'in_progress') {
            onUpdateStatus(sub._id, 'done');
          }
        };
        calc();
        interval = setInterval(calc, 1000);
      }
    } else if (sub.status === 'paused' && sub.timeLeftAtPause !== undefined) {
      setSubTimeLeft(sub.timeLeftAtPause);
    } else if (sub.status === 'done') {
      setSubTimeLeft(sub.timerDirection === 'up' && sub.timeLeftAtPause !== undefined ? sub.timeLeftAtPause : 0);
    } else {
      setSubTimeLeft(sub.timerDirection === 'up' ? 0 : (sub.timerDuration || 0));
    }
    return () => { if (interval) clearInterval(interval); };
    }, [sub.status, sub.timerStartTime, sub.timerDuration, sub.timeLeftAtPause, sub.timerDirection, sub._id, onUpdateStatus]);


  const handleSaveEdit = () => {
    if (editText.trim() && editText !== sub.text) onUpdateText(sub._id, editText.trim());
    setIsEditing(false);
    setShowTimerPicker(false);
  };

  const isDone = sub.status === 'done';
  const isRunning = sub.status === 'in_progress';
  const isPaused = sub.status === 'paused';
  const hasTimer = !!sub.timerDuration;

  const cardBg = isDarkMode ? colors.surfaceHigh : colors.surfaceHigh;
  const contentColor = colors.text;
  const contentMutedColor = colors.textMuted;
  const isBrightBg = false;

  if (isEditing) {
    return (
      <View style={[{ backgroundColor: cardBg, borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: isBrightBg ? colors.text + '20' : colors.border + '40', marginBottom: 8 }]}>
        <Text style={[{ fontSize: 10, fontWeight: '800', color: contentColor, letterSpacing: 0.5, textTransform: 'uppercase' }, isArabic && { textAlign: 'right' }]}>{t.editingSubtask}</Text>

        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <TouchableOpacity onPress={() => onToggleComplete(sub._id, sub.status)}>
            <Ionicons
              name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={isDone ? colors.success : contentMutedColor}
            />
          </TouchableOpacity>
          <TextInput
            style={[{ flex: 1, color: contentColor, fontSize: 16, backgroundColor: isBrightBg ? colors.text + '08' : colors.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: isBrightBg ? colors.text + '40' : '#e5f19d', fontWeight: '600' }, isArabic && { textAlign: 'right' }]}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            onSubmitEditing={handleSaveEdit}
          />
        </View>

        <TouchableOpacity
          style={[localStyles.actionBtn, {
            backgroundColor: hasTimer ? (isBrightBg ? colors.text + '10' : colors.surfaceText + '10') : 'transparent',
            borderColor: isBrightBg ? colors.text + '30' : colors.surfaceText + '30',
            borderWidth: 1,
            alignSelf: isArabic ? 'flex-end' : 'flex-start'
          }]}
          onPress={() => setShowTimerPicker(!showTimerPicker)}
        >
          <Ionicons name="timer-outline" size={16} color={contentColor} />
          <Text style={[localStyles.actionBtnText, { color: contentColor }]}>
            {hasTimer ? formatDuration(sub.timerDuration!) : t.setTimer}
          </Text>
          <Ionicons name={showTimerPicker ? 'chevron-up' : 'chevron-down'} size={13} color={contentColor} />
        </TouchableOpacity>

        {showTimerPicker && (
          <InlineTimerPicker
            initialMs={sub.timerDuration}
            initialDirection={sub.timerDirection}
            maxMs={remainingBudget}
            colors={colors}
            t={t}
            isArabic={isArabic}
            accentColor="#e5f19d"
            onSave={(ms, direction) => {
              onSetTimer(sub._id, ms, direction);
              setShowTimerPicker(false);
            }}
            onCancel={() => setShowTimerPicker(false)}
          />
        )}

        <View style={[{ flexDirection: 'row', gap: 10 }]}>
           <TouchableOpacity
            style={{ flex: 1, backgroundColor: sub.status === 'in_progress' ? colors.warning : '#e5f19d', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
            onPress={handleSaveEdit}
          >
            <Text style={{ color: sub.status === 'in_progress' ? colors.surfaceText : '#101116', fontWeight: '800', fontSize: 14 }}>{t.save}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: isBrightBg ? colors.text + '15' : colors.border, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setIsEditing(false); setShowTimerPicker(false); }}
          >
            <Text style={{ color: contentColor, fontWeight: '700', fontSize: 14 }}>{t.cancel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[{ backgroundColor: cardBg, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: isBrightBg ? colors.text + '10' : colors.border + '20' }]}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', padding: 12 }]}>
        <TouchableOpacity onPress={() => onToggleComplete(sub._id, sub.status)}>
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isDone ? colors.success : contentMutedColor}
            style={{ marginEnd: 12 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => onSelect ? onSelect(sub._id) : (setIsEditing(true), setEditText(sub.text))}
        >
          <Text
            style={[{
              color: isDone ? contentMutedColor : contentColor,
              textDecorationLine: isDone ? 'line-through' : 'none',
              fontSize: 15,
              fontWeight: '600',
            }, isArabic && { textAlign: 'right' }]}
            numberOfLines={2}
          >
            {sub.text}
          </Text>

          {/* Subtask Cross-Link Badges */}
          {(hasLinks || (sub.hashtags && sub.hashtags.length > 0)) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {linkedItemName ? (
                <View style={[localStyles.linkPill, { backgroundColor: linkedItemColor + '20' }]}>
                  <Ionicons name="folder-outline" size={10} color={linkedItemColor} />
                  <Text style={[localStyles.linkPillText, { color: linkedItemColor }]} numberOfLines={1}>
                    {linkedItemName}
                  </Text>
                </View>
              ) : null}

              {goalItemTitle ? (
                <View style={[localStyles.linkPill, { backgroundColor: goalItemColor + '20' }]}>
                  <Ionicons name="flag-outline" size={10} color={goalItemColor} />
                  <Text style={[localStyles.linkPillText, { color: goalItemColor }]} numberOfLines={1}>
                    {goalItemTitle}
                  </Text>
                </View>
              ) : null}

              {sub.hashtags?.map((t: string) => (
                <View key={t} style={[localStyles.linkPill, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[localStyles.linkPillText, { color: colors.primary }]}>
                    #{t}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {hasTimer && !isDone && (
          <TouchableOpacity
            onPress={() => isRunning ? onPauseSubtask(sub._id) : onStartSubtask(sub._id)}
            style={[{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: isRunning ? (isBrightBg ? colors.warning : colors.warning + '15') : isPaused ? (isBrightBg ? colors.text + '10' : colors.surfaceText + '10') : (isBrightBg ? colors.text + '08' : colors.surfaceText + '08'),
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              marginStart: 8,
              borderWidth: 1,
              borderColor: isRunning ? (isBrightBg ? colors.warning : colors.warning + '30') : (isBrightBg ? colors.text + '20' : colors.surfaceText + '20'),
            }]}
          >
            <CircularProgress
              size={24}
              strokeWidth={2}
              progress={sub.timerDuration ? ((sub.timerDuration - subTimeLeft) / sub.timerDuration) * 100 : 0}
              color={isRunning ? (isBrightBg ? colors.surfaceText : colors.warning) : contentColor}
              unfilledColor={isBrightBg ? colors.text + '0D' : colors.surfaceText + '10'}
            >
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={10}
                color={isRunning ? (isBrightBg ? colors.surfaceText : colors.warning) : contentColor}
              />
            </CircularProgress>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                color: isRunning ? (isBrightBg ? colors.surfaceText : colors.warning) : contentColor,
              }}
            >
              {isRunning || isPaused ? formatTime(subTimeLeft) : formatDuration(sub.timerDuration!)}
            </Text>
          </TouchableOpacity>
        )}

        {hasTimer && isDone && (
          <View style={[{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: colors.success + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginStart: 8
          }]}>
            <Ionicons name="checkmark" size={12} color={colors.success} />
            <Text style={{ fontSize: 11, color: colors.success, fontWeight: '800' }}>{t.done}</Text>
          </View>
        )}

        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, marginStart: 8 }]}>
          <TouchableOpacity onPress={() => setIsLinkPickerVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={hasLinks ? "link" : "link-outline"} size={19} color={hasLinks ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => (setIsEditing(true), setEditText(sub.text))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="create-outline" size={19} color={isBrightBg ? colors.text : '#e5f19d'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(sub._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={19} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <UniversalLinkPickerModal
        visible={isLinkPickerVisible}
        onClose={() => setIsLinkPickerVisible(false)}
        onSelect={handleSelectLink}
        currentCategoryId={sub.categoryId}
        currentProjectId={sub.projectId}
        currentGoalId={sub.goalId}
        title={isArabic ? `ربط المهمة الفرعية: ${sub.text}` : `Link Subtask: ${sub.text}`}
      />
    </View>
  );
};
