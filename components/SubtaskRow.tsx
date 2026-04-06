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
    if (sub.status === 'in_progress' && sub.timerStartTime) {
      if (sub.timerDirection === 'up') {
        const calc = () => {
          const elapsed = Date.now() - sub.timerStartTime!;
          setSubTimeLeft(elapsed);
        };
        calc();
        const interval = setInterval(calc, 1000);
        return () => clearInterval(interval);
      } else if (sub.timerDuration) {
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
      }
    } else if (sub.status === 'paused' && sub.timeLeftAtPause !== undefined) {
      setSubTimeLeft(sub.timeLeftAtPause);
    } else if (sub.status === 'done') {
      setSubTimeLeft(sub.timerDirection === 'up' && sub.timerStartTime && sub.timeLeftAtPause ? sub.timeLeftAtPause : 0);
    } else {
      setSubTimeLeft(sub.timerDirection === 'up' ? 0 : (sub.timerDuration || 0));
    }
  }, [sub.status, sub.timerStartTime, sub.timerDuration, sub.timeLeftAtPause, sub.timerDirection]);

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
      <View style={[{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border + '40', marginBottom: 8 }, isArabic && { direction: 'rtl' }]}>
        <Text style={[{ fontSize: 10, fontWeight: '800', color: colors.surfaceText, letterSpacing: 0.5, textTransform: 'uppercase' }, isArabic && { textAlign: 'right' }]}>{t.editingSubtask}</Text>

        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={() => onToggleComplete(sub._id, sub.status)}>
            <Ionicons
              name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={isDone ? colors.success : colors.textMuted}
            />
          </TouchableOpacity>
          <TextInput
            style={[{ flex: 1, color: colors.surfaceText, fontSize: 16, backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.primary, fontWeight: '600' }, isArabic && { textAlign: 'right' }]}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            onSubmitEditing={handleSaveEdit}
          />
        </View>

        {/* Timer toggle */}
        <TouchableOpacity
          style={[localStyles.actionBtn, {
            backgroundColor: hasTimer ? colors.surfaceText + '10' : 'transparent',
            borderColor: colors.surfaceText + '30',
            borderWidth: 1,
            alignSelf: isArabic ? 'flex-end' : 'flex-start',
            flexDirection: isArabic ? 'row-reverse' : 'row'
          }]}
          onPress={() => setShowTimerPicker(!showTimerPicker)}
        >
          <Ionicons name="timer-outline" size={16} color={colors.surfaceText} />
          <Text style={[localStyles.actionBtnText, { color: colors.surfaceText }]}>
            {hasTimer ? formatDuration(sub.timerDuration!) : t.setTimer}
          </Text>
          <Ionicons name={showTimerPicker ? 'chevron-up' : 'chevron-down'} size={13} color={colors.surfaceText} />
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

        <View style={[{ flexDirection: 'row', gap: 10 }, isArabic && { flexDirection: 'row-reverse' }]}>
           <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
            onPress={handleSaveEdit}
          >
            <Text style={{ color: isDarkMode ? '#000' : '#FFF', fontWeight: '800', fontSize: 14 }}>{t.save}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: colors.border, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setIsEditing(false); setShowTimerPicker(false); }}
          >
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{t.cancel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border + '20' }, isArabic && { direction: 'rtl' }]}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', padding: 12 }, isArabic && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => onToggleComplete(sub._id, sub.status)}>
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isDone ? colors.success : colors.textMuted}
            style={isArabic ? { marginLeft: 12 } : { marginRight: 12 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => { setIsEditing(true); setEditText(sub.text); }}
        >
          <Text
            style={[{
              color: isDone ? colors.surfaceText + '60' : colors.surfaceText,
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
              flexDirection: isArabic ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: isRunning ? colors.warning + '15' : isPaused ? colors.surfaceText + '10' : colors.surfaceText + '08',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              marginLeft: isArabic ? 0 : 8,
              marginRight: isArabic ? 8 : 0,
              borderWidth: 1,
              borderColor: isRunning ? colors.warning + '30' : colors.surfaceText + '20',
            }]}
          >
            <CircularProgress
              size={24}
              strokeWidth={2}
              progress={sub.timerDuration ? ((sub.timerDuration - subTimeLeft) / sub.timerDuration) * 100 : 0}
              color={isRunning ? colors.warning : colors.surfaceText}
              unfilledColor={colors.surfaceText + '10'}
            >
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={10}
                color={isRunning ? colors.warning : colors.surfaceText}
              />
            </CircularProgress>
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

        {hasTimer && isDone && (
          <View style={[{
            flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 4,
            backgroundColor: colors.success + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: isArabic ? 0 : 8, marginRight: isArabic ? 8 : 0
          }]}>
            <Ionicons name="checkmark" size={12} color={colors.success} />
            <Text style={{ fontSize: 11, color: colors.success, fontWeight: '800' }}>{t.done}</Text>
          </View>
        )}

        <View style={[{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginLeft: isArabic ? 0 : 8, marginRight: isArabic ? 8 : 0 }]}>
           <TouchableOpacity onPress={() => { setIsEditing(true); setEditText(sub.text); }}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(sub._id)}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
