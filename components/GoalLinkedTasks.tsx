import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';

interface GoalLinkedTasksProps {
  goalId: Id<'yearlyGoals'>;
  goalTitle: string;
  goalColor?: string;
  onOpenTaskDetail?: (todoId: Id<'todos'>) => void;
}

export const GoalLinkedTasks: React.FC<GoalLinkedTasksProps> = ({
  goalId,
  goalTitle,
  goalColor = '#8B5CF6',
  onOpenTaskDetail,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { isArabic } = useTranslation(language);

  const [isExpanded, setIsExpanded] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const linkedTasks = useOfflineQuery<any[]>(
    'todos.getTasksByGoal',
    api.todos.getTasksByGoal,
    userId ? { userId, goalId } : 'skip'
  ) || [];

  const updateStatus = useOfflineMutation(api.todos.updateStatus, 'todos:updateStatus');
  const addTodo = useOfflineMutation(api.todos.addTodo, 'todos:addTodo');

  const completedCount = linkedTasks.filter((t: any) => t.status === 'done').length;
  const totalCount = linkedTasks.length;

  const handleToggleTask = (task: any) => {
    const nextStatus = task.status === 'done' ? 'not_started' : 'done';
    updateStatus({ id: task._id, status: nextStatus });
  };

  const handleCreateTask = async () => {
    const trimmed = newTaskText.trim();
    if (!trimmed || !userId) return;

    try {
      await addTodo({
        userId,
        text: trimmed,
        date: Date.now(),
        status: 'not_started',
        goalId: goalId as any,
      });
      setNewTaskText('');
      setIsAdding(false);
    } catch (e) {
      console.warn('Failed to add linked task to goal', e);
    }
  };

  return (
    <View style={[styles.container, { borderTopColor: isDarkMode ? '#2D2D3E' : '#E5E7EB' }]}>
      {/* Header Pill: toggle task list */}
      <View style={[styles.headerRow, isArabic && styles.rowReverse]}>
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={[
            styles.toggleBtn,
            { backgroundColor: goalColor + '15' },
            isArabic && styles.rowReverse,
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="checkbox" size={13} color={goalColor} />
          <Text style={[styles.toggleBtnText, { color: goalColor }]}>
            {totalCount > 0
              ? `${completedCount}/${totalCount} ${isArabic ? 'مهام مرتبطة' : 'linked tasks'}`
              : isArabic
              ? 'مهام مرتبطة'
              : 'Linked Tasks'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={goalColor}
          />
        </TouchableOpacity>

        {/* Quick Add Button */}
        <TouchableOpacity
          onPress={() => {
            setIsExpanded(true);
            setIsAdding(true);
          }}
          style={[styles.addIconBtn, { backgroundColor: goalColor + '18' }]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="add" size={14} color={goalColor} />
        </TouchableOpacity>
      </View>

      {/* Expanded Task List */}
      {isExpanded && (
        <View style={styles.taskList}>
          {linkedTasks.length === 0 && !isAdding && (
            <Text style={[styles.emptyText, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
              {isArabic ? 'لا توجد مهام مرتبطة بهذا الهدف بعد.' : 'No tasks linked to this goal yet.'}
            </Text>
          )}

          {linkedTasks.map((task: any) => {
            const isDone = task.status === 'done';
            return (
              <View
                key={task._id}
                style={[
                  styles.taskRow,
                  {
                    backgroundColor: isDarkMode ? '#161722' : '#FFFFFF',
                    borderColor: isDone ? colors.success + '40' : isDarkMode ? '#252636' : '#F1F5F9',
                  },
                  isArabic && styles.rowReverse,
                ]}
              >
                <TouchableOpacity
                  onPress={() => handleToggleTask(task)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={isDone ? colors.success : colors.textMuted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => onOpenTaskDetail && onOpenTaskDetail(task._id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.taskText,
                      {
                        color: isDone ? colors.textMuted : colors.text,
                        textDecorationLine: isDone ? 'line-through' : 'none',
                        opacity: isDone ? 0.6 : 1,
                        textAlign: isArabic ? 'right' : 'left',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {task.text}
                  </Text>
                </TouchableOpacity>

                {onOpenTaskDetail && (
                  <TouchableOpacity
                    onPress={() => onOpenTaskDetail(task._id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="open-outline" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Inline Quick Add Input */}
          {isAdding ? (
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: isDarkMode ? '#161722' : '#FFFFFF',
                  borderColor: isDarkMode ? '#2D2D3E' : '#E5E7EB',
                },
                isArabic && styles.rowReverse,
              ]}
            >
              <TextInput
                style={[
                  styles.textInput,
                  { color: colors.text, textAlign: isArabic ? 'right' : 'left' },
                ]}
                placeholder={isArabic ? 'مهمة جديدة لهذا الهدف...' : 'New task for this goal...'}
                placeholderTextColor={colors.textMuted}
                value={newTaskText}
                onChangeText={setNewTaskText}
                onSubmitEditing={handleCreateTask}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleCreateTask}
                style={[styles.inputSubmitBtn, { backgroundColor: goalColor }]}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setNewTaskText('');
                  setIsAdding(false);
                }}
                style={styles.inputCancelBtn}
              >
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsAdding(true)}
              style={[styles.addPromptBtn, isArabic && styles.rowReverse]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color={goalColor} />
              <Text style={[styles.addPromptText, { color: goalColor }]}>
                {isArabic ? 'إضافة مهمة لهذا الهدف' : 'Add task for this goal'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskList: {
    marginTop: 8,
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  taskText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  inputSubmitBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCancelBtn: {
    padding: 2,
  },
  addPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  addPromptText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
