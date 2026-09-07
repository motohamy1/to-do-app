import React, { useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { useTranslation } from '@/utils/i18n';
import { createScrollStackStyles, CARD_ACCENTS, createCardFrame } from '@/assets/styles/scrollStack.styles';
import ProjectPickerModal from '@/components/ProjectPickerModal';
import { useKeyboard } from '@/hooks/useKeyboard';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface CandidateTask {
  _id: Id<'todos'>;
  text: string;
  status?: string;
}

interface ChecklistItemModalProps {
  visible: boolean;
  onClose: () => void;
  itemId: Id<'todos'> | null;
  /** Increment on every open so the form always starts from a clean slate. */
  session: number;
  initialDate?: number;
  candidateTasks: CandidateTask[];
  onOpenTask?: (id: Id<'todos'>) => void;
}

interface LinkSelection {
  type: 'category' | 'subCategory' | 'project';
  categoryId?: string;
  subCategoryId?: string;
  projectId?: string;
}

const selectionFromTodo = (item: any): LinkSelection | null => {
  if (item.projectId) return { type: 'project', projectId: item.projectId };
  if (item.subCategoryId) return { type: 'subCategory', categoryId: item.categoryId, subCategoryId: item.subCategoryId };
  if (item.categoryId) return { type: 'category', categoryId: item.categoryId };
  return null;
};

// The form remounts (via key) for each open, so all state initializes directly
// from props without synchronization effects.
const ChecklistItemForm: React.FC<{
  item: any | null;
  initialChildren: any[];
  initialDate?: number;
  candidateTasks: CandidateTask[];
  onOpenTask?: (id: Id<'todos'>) => void;
  onDone: () => void;
}> = ({ item, initialChildren, initialDate, candidateTasks, onOpenTask, onDone }) => {
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const styles = createScrollStackStyles(colors, isArabic, isDarkMode);
  const frame = createCardFrame(CARD_ACCENTS.rose, isDarkMode, colors.secondaryText);
  const { height: screenHeight } = useWindowDimensions();
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const scrollViewRef = useRef<ScrollView>(null);

  const isEditing = item !== null;
  const itemId: Id<'todos'> | null = item?._id ?? null;

  const addTodo = useOfflineMutation(api.todos.addTodo, 'todos:addTodo');
  const updateTodo = useOfflineMutation(api.todos.updateTodo, 'todos:updateTodo');
  const deleteChecklistItem = useOfflineMutation(api.todos.deleteChecklistItem, 'todos:deleteChecklistItem');

  const [title, setTitle] = useState<string>(item?.text ?? '');
  const [notes, setNotes] = useState<string>(item?.description ?? '');
  const [hashtags, setHashtags] = useState<string[]>(item?.hashtags ?? []);
  const [newHashtag, setNewHashtag] = useState('');
  const [link, setLink] = useState<LinkSelection | null>(item ? selectionFromTodo(item) : null);
  const [linkedIds, setLinkedIds] = useState<string[]>(() => initialChildren.map((c: any) => c._id as string));
  const [originalChildIds] = useState<string[]>(() => initialChildren.map((c: any) => c._id as string));
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resolvedProject = useOfflineQuery<any>(
    'projects.getProjectMetadata',
    api.projects.getProjectMetadata,
    link?.type === 'project' && link.projectId ? { id: link.projectId } : 'skip'
  );
  const resolvedCategory = useOfflineQuery<any>(
    'projects.getCategory',
    api.projects.getCategory,
    (link?.type === 'category' || link?.type === 'subCategory') && link.categoryId ? { id: link.categoryId } : 'skip'
  );
  const resolvedSubCategory = useOfflineQuery<any>(
    'projects.getSubCategory',
    api.projects.getSubCategory,
    link?.type === 'subCategory' && link.subCategoryId ? { id: link.subCategoryId } : 'skip'
  );

  const linkName =
    link?.type === 'project' ? resolvedProject?.name
    : link?.type === 'subCategory' ? resolvedSubCategory?.name
    : link?.type === 'category' ? resolvedCategory?.name
    : undefined;

  const nameById = useMemo(() => {
    const map = new Map<string, { text: string; status?: string }>();
    initialChildren.forEach((c: any) => map.set(c._id as string, { text: c.text, status: c.status }));
    candidateTasks.forEach((task) => map.set(task._id as string, { text: task.text, status: task.status }));
    return map;
  }, [initialChildren, candidateTasks]);

  const availableTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return candidateTasks
      .filter((task) => !linkedIds.includes(task._id as string))
      .filter((task) => (q ? task.text.toLowerCase().includes(q) : true));
  }, [candidateTasks, linkedIds, taskSearch]);

  const addHashtag = (raw: string) => {
    const cleaned = raw.trim().replace(/^#/, '').toLowerCase();
    if (cleaned && !hashtags.includes(cleaned)) setHashtags((prev) => [...prev, cleaned]);
    setNewHashtag('');
  };

  const toggleLinked = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLinkedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const buildLinkFields = () => {
    if (link?.type === 'project') {
      return { projectId: link.projectId, categoryId: undefined, subCategoryId: undefined };
    }
    if (link?.type === 'subCategory') {
      return { projectId: undefined, categoryId: link.categoryId, subCategoryId: link.subCategoryId };
    }
    return { projectId: undefined, categoryId: undefined, subCategoryId: undefined };
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!title.trim()) {
      Alert.alert(t.missingFields, isArabic ? 'يرجى كتابة عنوان العنصر.' : 'Please enter a title for this checklist item.');
      return;
    }
    if (!userId) return;

    setIsSaving(true);
    try {
      const linkFields = buildLinkFields();
      if (itemId) {
        await updateTodo({
          id: itemId,
          userId,
          text: title.trim(),
          description: notes.trim(),
          hashtags,
          ...linkFields,
        });
        const toAdd = linkedIds.filter((id) => !originalChildIds.includes(id));
        const toRemove = originalChildIds.filter((id) => !linkedIds.includes(id));
        for (const id of toAdd) {
          await updateTodo({ id: id as Id<'todos'>, parentId: itemId, userId });
        }
        for (const id of toRemove) {
          await updateTodo({ id: id as Id<'todos'>, parentId: undefined, userId });
        }
      } else {
        const res: any = await addTodo({
          userId,
          text: title.trim(),
          type: 'checklist',
          date: initialDate || Date.now(),
          description: notes.trim(),
          status: 'not_started',
          ...(hashtags.length > 0 ? { hashtags } : {}),
          ...(link?.type === 'project' ? { projectId: link.projectId } : {}),
          ...(link?.type === 'category' || link?.type === 'subCategory' ? { categoryId: link.categoryId as any } : {}),
          ...(link?.type === 'subCategory' ? { subCategoryId: link.subCategoryId as any } : {}),
        });
        const newId = typeof res === 'string' ? res : res?._id;
        if (newId) {
          for (const id of linkedIds) {
            await updateTodo({ id: id as Id<'todos'>, parentId: newId, userId });
          }
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDone();
    } catch (e) {
      console.warn('ChecklistItemModal save error', e);
      Alert.alert(t.error, isArabic ? 'تعذر حفظ عنصر القائمة.' : 'Could not save this checklist item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!itemId) return;
    Alert.alert(
      t.confirmDeleteTitle,
      isArabic
        ? 'سيتم حذف هذا العنصر. المهام المرتبطة به ستبقى كمهام مستقلة.'
        : 'This checklist item will be deleted. Tasks linked beneath it will stay as independent tasks.',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await deleteChecklistItem({ id: itemId });
            onDone();
          },
        },
      ]
    );
  };

  const headerTitle = isEditing
    ? (isArabic ? 'تعديل عنصر القائمة' : 'Edit Checklist Item')
    : (isArabic ? 'عنصر قائمة جديد' : 'New Checklist Item');

  return (
    <View
      style={[
        styles.modalContent,
        {
          marginBottom: keyboardHeight,
          maxHeight: isKeyboardVisible 
            ? Math.max(300, screenHeight - keyboardHeight - (Platform.OS === 'ios' ? 44 : 28)) 
            : '90%',
        }
      ]}
    >
      <View style={styles.modalDragHandle} />

      <View style={styles.modalHeader}>
        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.itemKindBadge, { backgroundColor: frame.badgeBg }]}>
            <Ionicons name="checkbox-outline" size={16} color={frame.badgeFg} />
          </View>
          <Text style={styles.modalTitle}>{headerTitle}</Text>
        </View>
        <TouchableOpacity onPress={onDone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.modalForm}>
          {/* Title */}
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalInputLabel}>{isArabic ? 'العنوان' : 'Title'}</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder={isArabic ? 'ماذا تريد أن تنجز؟...' : 'What needs doing?...'}
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus={!isEditing}
              textAlign={isArabic ? 'right' : 'left'}
            />
          </View>

          {/* Notes */}
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalInputLabel}>{t.itemNotes}</Text>
            <TextInput
              style={styles.modalNotesInput}
              placeholder={isArabic ? 'أضف ملاحظات لهذا العنصر...' : 'Add notes for this item...'}
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              blurOnSubmit={false}
              textAlignVertical="top"
            />
          </View>

          {/* Hashtags */}
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalInputLabel}>{isArabic ? 'الوسوم' : 'Hashtags'}</Text>
            {hashtags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {hashtags.map((tag) => (
                  <View
                    key={tag}
                    style={{
                      flexDirection: isArabic ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      backgroundColor: frame.washBg,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: frame.fg, fontSize: 13, fontWeight: '700' }}>#{tag}</Text>
                    <TouchableOpacity onPress={() => setHashtags((prev) => prev.filter((x) => x !== tag))} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="close" size={14} color={frame.fg} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <View
              style={{
                flexDirection: isArabic ? 'row-reverse' : 'row',
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#1E202E' : '#F8FAFC',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 8,
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '700' }}>#</Text>
              <TextInput
                style={{ flex: 1, fontSize: 14, color: colors.text, padding: 0, textAlign: isArabic ? 'right' : 'left' }}
                placeholder={isArabic ? 'أضف وسمًا...' : 'Add a hashtag...'}
                placeholderTextColor={colors.textMuted}
                value={newHashtag}
                onChangeText={setNewHashtag}
                onFocus={() => {
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
                }}
                onSubmitEditing={() => addHashtag(newHashtag)}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={() => addHashtag(newHashtag)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="add-circle" size={22} color={newHashtag.trim() ? frame.fg : colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Link to project / space */}
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalInputLabel}>{isArabic ? 'ربط بمشروع' : 'Link to Project'}</Text>
            <TouchableOpacity
              style={[styles.linkRow, { borderColor: link ? frame.border : colors.border, backgroundColor: link ? frame.washBg : 'transparent' }]}
              onPress={() => setShowProjectPicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name={link ? 'link' : 'link-outline'} size={18} color={link ? frame.fg : colors.textMuted} />
              <Text style={[styles.linkRowText, { color: link ? colors.text : colors.textMuted }]}>
                {linkName || (isArabic ? 'اربط العنصر بمساحة أو مشروع' : 'Link this item to a space or project')}
              </Text>
              {link ? (
                <TouchableOpacity
                  onPress={() => setLink(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Link tasks (this item becomes their parent) */}
          <View style={styles.modalInputGroup}>
            <Text style={styles.modalInputLabel}>{isArabic ? 'ربط بمهام' : 'Link Tasks'}</Text>
            <TouchableOpacity
              style={[styles.linkRow, { borderColor: linkedIds.length > 0 ? frame.border : colors.border, backgroundColor: linkedIds.length > 0 ? frame.washBg : 'transparent' }]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowTaskPicker((v) => !v);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="git-branch-outline" size={18} color={linkedIds.length > 0 ? frame.fg : colors.textMuted} />
              <Text style={[styles.linkRowText, { color: linkedIds.length > 0 ? colors.text : colors.textMuted }]}>
                {linkedIds.length > 0
                  ? (isArabic
                      ? `${linkedIds.length} ${t.linkedTasksWord}`
                      : `${linkedIds.length} linked task${linkedIds.length === 1 ? '' : 's'}`)
                  : (isArabic ? 'اجعل مهامًا مرتبطة تحت هذا العنصر' : 'Make tasks nested under this item')}
              </Text>
              <Ionicons name={showTaskPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {showTaskPicker && (
              <View style={[styles.taskPickerBox, { borderColor: colors.border }]}>
                <Text style={[styles.taskPickerHint, { color: colors.textMuted }]}>
                  {isArabic ? 'المهام المحددة ستصبح مهامًا فرعية لهذا العنصر.' : 'Selected tasks become subtasks of this checklist item.'}
                </Text>
                <TextInput
                  style={[styles.taskSearchInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder={isArabic ? 'ابحث عن مهمة...' : 'Search tasks...'}
                  placeholderTextColor={colors.textMuted}
                  value={taskSearch}
                  onChangeText={setTaskSearch}
                  textAlign={isArabic ? 'right' : 'left'}
                />
                <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {availableTasks.length === 0 && (
                    <Text style={{ fontSize: 13, color: colors.textMuted, paddingVertical: 12, textAlign: 'center' }}>
                      {isArabic ? 'لا توجد مهام متاحة' : 'No tasks available'}
                    </Text>
                  )}
                  {availableTasks.map((task) => (
                    <TouchableOpacity
                      key={task._id as string}
                      style={styles.taskPickerRow}
                      onPress={() => toggleLinked(task._id as string)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={linkedIds.includes(task._id as string) ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={linkedIds.includes(task._id as string) ? frame.fg : colors.textMuted}
                      />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: isArabic ? 'right' : 'left' }} numberOfLines={1}>
                        {task.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {linkedIds.map((id) => {
              const meta = nameById.get(id);
              if (!meta) return null;
              return (
                <View key={id} style={[styles.linkedTaskRow, { borderColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => onOpenTask?.(id as Id<'todos'>)}
                    style={{ flex: 1, flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="git-commit-outline" size={15} color={frame.fg} />
                    <Text
                      style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.text, textAlign: isArabic ? 'right' : 'left', textDecorationLine: meta.status === 'done' ? 'line-through' : 'none' }}
                      numberOfLines={1}
                    >
                      {meta.text}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleLinked(id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.modalActionRow}>
            {isEditing && (
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={handleDelete} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSave} disabled={isSaving} activeOpacity={0.8}>
              <Text style={styles.modalSaveBtnText}>{isArabic ? 'حفظ' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ProjectPickerModal
        visible={showProjectPicker}
        onClose={() => setShowProjectPicker(false)}
        onSelect={(selection) => {
          if (selection.type === 'none') {
            setLink(null);
          } else {
            setLink({
              type: selection.type as LinkSelection['type'],
              categoryId: selection.categoryId,
              subCategoryId: selection.subCategoryId,
              projectId: selection.projectId,
            });
          }
        }}
      />
    </View>
  );
};

const ChecklistItemModal: React.FC<ChecklistItemModalProps> = ({
  visible,
  onClose,
  itemId,
  session,
  initialDate,
  candidateTasks,
  onOpenTask,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { language } = useAuth();
  const { isArabic } = useTranslation(language);
  const styles = createScrollStackStyles(colors, isArabic, isDarkMode);

  const item = useOfflineQuery<any>('todos.getById', api.todos.getById, itemId ? { id: itemId } : 'skip');
  const children = useOfflineQuery<any[]>('todos.getSubtasks', api.todos.getSubtasks, itemId ? { parentId: itemId } : 'skip');

  // RN Modal unmounts its children once hidden (Android instantly, iOS after
  // the slide-out completes), so the form state reseeds on every open. The
  // session key from the parent covers fast reopens before dismissal ends.
  const isLoading = itemId !== null && (item === undefined || children === undefined);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            {!isLoading ? (
              <ChecklistItemForm
                key={`${String(itemId ?? 'new')}:${session}`}
                item={itemId ? item : null}
                initialChildren={itemId ? (children || []) : []}
                initialDate={initialDate}
                candidateTasks={candidateTasks}
                onOpenTask={onOpenTask}
                onDone={onClose}
              />
            ) : (
              <View style={[styles.modalContent, { alignItems: 'center', justifyContent: 'center', minHeight: 220 }]}>
                <View style={styles.modalDragHandle} />
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ChecklistItemModal;
