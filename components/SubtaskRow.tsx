import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '../convex/_generated/dataModel';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import useTheme from '@/hooks/useTheme';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { api } from '../convex/_generated/api';
import CircularProgress from './CircularProgress';
import { InlineTimerPicker } from './InlineTimerPicker';

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
  }
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
    let interval: NodeJS.Timeout;
    if (sub.status === 'in_progress' && sub.timerStartTime) {
      if (sub.timerDirection === 'up') {
        const calc = () => {
          const elapsed = Date.now() - sub.timerStartTime!;
          setSubTimeLeft((prev: number) => prev !== elapsed ? elapsed : prev);
        };
        calc();
        interval = setInterval(calc, 1000);
      } else if (sub.timerDuration) {
        const calc = () => {
          const elapsed = Date.now() - sub.timerStartTime!;
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

  const cardBg = sub.status === 'in_progress' ? colors.taskInProgressBg 
               : sub.status === 'paused' ? colors.taskPausedBg 
               : sub.status === 'done' ? colors.taskDoneBg 
               : sub.status === 'not_done' ? colors.taskNotDoneBg 
               : colors.taskNotStartedBg;

  const isBrightBg = getLuminance(cardBg) > 170;
  const contentColor = isBrightBg ? '#0D0F1A' : colors.surfaceText;
  const contentMutedColor = isBrightBg ? '#00000080' : colors.surfaceText + '80';

  if (isEditing) {
    return (
      <View style={[{ backgroundColor: cardBg, borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: isBrightBg ? '#00000020' : colors.border + '40', marginBottom: 8 }]}>
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
            style={[{ flex: 1, color: contentColor, fontSize: 16, backgroundColor: isBrightBg ? '#00000008' : colors.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: isBrightBg ? '#00000040' : colors.primary, fontWeight: '600' }, isArabic && { textAlign: 'right' }]}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            onSubmitEditing={handleSaveEdit}
          />
        </View>

        <TouchableOpacity
          style={[localStyles.actionBtn, {
            backgroundColor: hasTimer ? (isBrightBg ? '#00000010' : colors.surfaceText + '10') : 'transparent',
            borderColor: isBrightBg ? '#00000030' : colors.surfaceText + '30',
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
            onSave={(ms, direction) => {
              onSetTimer(sub._id, ms, direction);
              setShowTimerPicker(false);
            }}
            onCancel={() => setShowTimerPicker(false)}
          />
        )}

        <View style={[{ flexDirection: 'row', gap: 10 }]}>
           <TouchableOpacity
            style={{ flex: 1, backgroundColor: sub.status === 'in_progress' ? '#f85d08' : colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
            onPress={handleSaveEdit}
          >
            <Text style={{ color: (sub.status === 'in_progress' || colors.primary === '#f85d08') ? '#FFF' : (isDarkMode ? '#000' : '#FFF'), fontWeight: '800', fontSize: 14 }}>{t.save}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: isBrightBg ? '#00000015' : colors.border, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setIsEditing(false); setShowTimerPicker(false); }}
          >
            <Text style={{ color: contentColor, fontWeight: '700', fontSize: 14 }}>{t.cancel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[{ backgroundColor: cardBg, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: isBrightBg ? '#00000010' : colors.border + '20' }]}>
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
        </TouchableOpacity>

        {hasTimer && !isDone && (
          <TouchableOpacity
            onPress={() => isRunning ? onPauseSubtask(sub._id) : onStartSubtask(sub._id)}
            style={[{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: isRunning ? (isBrightBg ? '#f85d08' : colors.warning + '15') : isPaused ? (isBrightBg ? '#00000010' : colors.surfaceText + '10') : (isBrightBg ? '#00000008' : colors.surfaceText + '08'),
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              marginStart: 8,
              borderWidth: 1,
              borderColor: isRunning ? (isBrightBg ? '#f85d08' : colors.warning + '30') : (isBrightBg ? '#00000020' : colors.surfaceText + '20'),
            }]}
          >
            <CircularProgress
              size={24}
              strokeWidth={2}
              progress={sub.timerDuration ? ((sub.timerDuration - subTimeLeft) / sub.timerDuration) * 100 : 0}
              color={isRunning ? (isBrightBg ? '#FFF' : colors.warning) : contentColor}
              unfilledColor={isBrightBg ? 'rgba(0,0,0,0.05)' : colors.surfaceText + '10'}
            >
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={10}
                color={isRunning ? (isBrightBg ? '#FFF' : colors.warning) : contentColor}
              />
            </CircularProgress>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                color: isRunning ? (isBrightBg ? '#FFF' : colors.warning) : contentColor,
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

        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, marginStart: 8 }]}>
           <TouchableOpacity onPress={() => (setIsEditing(true), setEditText(sub.text))}>
            <Ionicons name="create-outline" size={20} color={isBrightBg ? '#000000' : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(sub._id)}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
