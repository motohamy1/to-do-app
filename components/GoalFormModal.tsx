import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import LivePress from '@/components/LivePress';
import { useKeyboard } from '@/hooks/useKeyboard';

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { UniversalLinkPickerModal, UniversalLinkSelection } from './UniversalLinkPickerModal';

export interface MilestoneItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface GoalFormData {
  id?: string;
  text: string;
  description?: string;
  category?: string;
  color?: string;
  icon?: string;
  milestones?: MilestoneItem[];
  isCompleted?: boolean;
  _type: 'goal' | 'achievement';
  categoryId?: Id<'projectCategories'>;
  subCategoryId?: Id<'projectSubCategories'>;
  projectId?: string;
}

interface GoalFormModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  item?: any | null;
  initialCategory?: string;
  categories: string[];
  isArabic?: boolean;
  onSave: (formData: GoalFormData) => Promise<void> | void;
  onDelete?: (id: any, type: 'goal' | 'achievement') => Promise<void> | void;
}

const COLOR_OPTIONS = [
  '#EA580C', // Coral Orange
  '#2563EB', // Cobalt Blue
  '#059669', // Emerald Green
  '#7C3AED', // Purple
  '#D97706', // Amber
  '#DB2777', // Rose Pink
  '#0284C7', // Sky Blue
  '#4B5563', // Slate
];

const ICON_OPTIONS = [
  'flag-outline',
  'trophy-outline',
  'fitness-outline',
  'briefcase-outline',
  'book-outline',
  'wallet-outline',
  'rocket-outline',
  'flame-outline',
  'sparkles-outline',
  'heart-outline',
  'laptop-outline',
  'shield-checkmark-outline',
];

export const GoalFormModal: React.FC<GoalFormModalProps> = ({
  visible,
  onClose,
  mode = 'create',
  item = null,
  initialCategory = '',
  categories,
  isArabic = false,
  onSave,
  onDelete,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const scrollViewRef = useRef<ScrollView>(null);

  const isEdit = mode === 'edit' || (item && item._id);
  const [type, setType] = useState<'goal' | 'achievement'>('goal');
  const [text, setText] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [color, setColor] = useState('#EA580C');
  const [icon, setIcon] = useState('flag-outline');
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Linked Space / Project State
  const [linkedCategoryId, setLinkedCategoryId] = useState<Id<'projectCategories'> | undefined>(undefined);
  const [linkedSubCategoryId, setLinkedSubCategoryId] = useState<Id<'projectSubCategories'> | undefined>(undefined);
  const [linkedProjectId, setLinkedProjectId] = useState<string | undefined>(undefined);
  const [isLinkPickerOpen, setIsLinkPickerOpen] = useState(false);

  const linkedProjectMeta = useOfflineQuery<any>('projects.getProjectMetadata', api.projects.getProjectMetadata, linkedProjectId ? { id: linkedProjectId } : 'skip');
  const linkedCategoryMeta = useOfflineQuery<any>('projects.getCategory', api.projects.getCategory, linkedCategoryId ? { id: linkedCategoryId } : 'skip');

  useEffect(() => {
    if (visible) {
      if (item) {
        setType(item._type || 'goal');
        setText(item.text || '');
        setDescription(item.description || '');
        setCategory(item.category || initialCategory || '');
        setColor(item.color || (item._type === 'achievement' ? '#059669' : '#EA580C'));
        setIcon(item.icon || (item._type === 'achievement' ? 'trophy-outline' : 'flag-outline'));
        setMilestones(item.milestones ? [...item.milestones] : []);
        setLinkedCategoryId(item.categoryId);
        setLinkedSubCategoryId(item.subCategoryId);
        setLinkedProjectId(item.projectId);
      } else {
        // Reset for Create Mode
        setType('goal');
        setText('');
        setDescription('');
        setCategory(initialCategory || (categories.length > 0 ? categories[0] : ''));
        setColor('#EA580C');
        setIcon('flag-outline');
        setMilestones([]);
        setLinkedCategoryId(undefined);
        setLinkedSubCategoryId(undefined);
        setLinkedProjectId(undefined);
      }
      setCustomCategoryInput('');
      setIsAddingCustomCategory(false);
      setNewMilestoneText('');
      setIsLinkPickerOpen(false);
    }
  }, [item, initialCategory, visible]);

  // Adjust default color & icon when switching type
  const handleTypeSwitch = (newType: 'goal' | 'achievement') => {
    setType(newType);
    if (!item) {
      if (newType === 'achievement') {
        setColor('#059669');
        setIcon('trophy-outline');
      } else {
        setColor('#EA580C');
        setIcon('flag-outline');
      }
    }
  };

  const handleAddMilestone = () => {
    const trimmed = newMilestoneText.trim();
    if (!trimmed) return;
    setMilestones((prev) => [
      ...prev,
      { id: `ms_${Date.now()}_${Math.random()}`, text: trimmed, isCompleted: false },
    ]);
    setNewMilestoneText('');
  };

  const handleRemoveMilestone = (msId: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== msId));
  };

  const handleToggleMilestone = (msId: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === msId ? { ...m, isCompleted: !m.isCompleted } : m))
    );
  };

  const handleApplyCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (trimmed) {
      setCategory(trimmed);
      setIsAddingCustomCategory(false);
      setCustomCategoryInput('');
    }
  };

  const handleSave = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      Alert.alert(
        isArabic ? 'العنوان مطلوب' : 'Title Required',
        isArabic ? 'يرجى كتابة عنوان للهدف أو الإنجاز.' : 'Please enter a title.'
      );
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        id: item?._id,
        text: trimmedText,
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        color,
        icon,
        milestones: type === 'goal' ? milestones : undefined,
        isCompleted: item?.isCompleted || false,
        _type: type,
        categoryId: linkedCategoryId,
        subCategoryId: linkedSubCategoryId,
        projectId: linkedProjectId,
      });
      onClose();
    } catch (err) {
      console.warn('Save failed:', err);
      Alert.alert(
        isArabic ? 'تعذر الحفظ' : 'Save Failed',
        isArabic
          ? 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.'
          : 'Something went wrong while saving. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!item || !onDelete) return;
    Alert.alert(
      isArabic ? 'تأكيد الحذف' : 'Confirm Delete',
      isArabic ? 'هل أنت متأكد من رغبتك في حذف هذا العنصر؟' : 'Are you sure you want to delete this item?',
      [
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isArabic ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await onDelete(item._id, item._type);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View 
          style={[
            styles.modalSheet, 
            { 
              backgroundColor: colors.surface,
              marginBottom: keyboardHeight,
              maxHeight: isKeyboardVisible 
                ? Math.max(300, screenHeight - keyboardHeight - (Platform.OS === 'ios' ? 44 : 28)) 
                : '90%',
            }
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, isArabic && styles.rowReverse]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isEdit
                ? isArabic
                  ? type === 'goal' ? 'تعديل الهدف' : 'تعديل الإنجاز'
                  : type === 'goal' ? 'Edit Goal' : 'Edit Achievement'
                : isArabic
                ? type === 'goal' ? 'إضافة هدف جديد' : 'إضافة إنجاز جديد'
                : type === 'goal' ? 'New Goal' : 'New Achievement'}
            </Text>

            {isEdit && onDelete ? (
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Type Selector Toggle (Goal vs Achievement) */}
            <View style={[styles.typeToggleContainer, { backgroundColor: isDarkMode ? '#1E1E28' : '#F3F4F6' }]}>
              <TouchableOpacity
                style={[
                  styles.typeToggleBtn,
                  type === 'goal' && [styles.typeToggleBtnActive, { backgroundColor: colors.surface }],
                ]}
                onPress={() => handleTypeSwitch('goal')}
              >
                <Ionicons name="flag" size={15} color={type === 'goal' ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    styles.typeToggleText,
                    { color: type === 'goal' ? colors.text : colors.textMuted },
                  ]}
                >
                  {isArabic ? 'هدف مخطط' : 'Goal'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeToggleBtn,
                  type === 'achievement' && [styles.typeToggleBtnActive, { backgroundColor: colors.surface }],
                ]}
                onPress={() => handleTypeSwitch('achievement')}
              >
                <Ionicons name="trophy" size={15} color={type === 'achievement' ? colors.success : colors.textMuted} />
                <Text
                  style={[
                    styles.typeToggleText,
                    { color: type === 'achievement' ? colors.text : colors.textMuted },
                  ]}
                >
                  {isArabic ? 'إنجاز محقق' : 'Achievement / Win'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <Text style={[styles.inputLabel, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
              {isArabic ? 'العنوان' : 'Title'}
            </Text>
            <TextInput
              style={[
                styles.titleInput,
                {
                  color: colors.text,
                  backgroundColor: isDarkMode ? '#1E1E28' : '#F9FAFB',
                  borderColor: isDarkMode ? '#2D2D3E' : '#E5E7EB',
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
              value={text}
              onChangeText={setText}
              placeholder={
                type === 'goal'
                  ? isArabic ? 'مثال: إنهاء وتدشين النسخة التجريبية...' : 'e.g. Ship MVP version 1.0...'
                  : isArabic ? 'مثال: تم إكمال الدورة بنجاح...' : 'e.g. Finished certification course...'
              }
              placeholderTextColor={colors.textMuted}
              multiline
            />

            {/* Description Input */}
            <Text style={[styles.inputLabel, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left', marginTop: 14 }]}>
              {isArabic ? 'الوصف والتفاصيل (اختياري)' : 'Description (Optional)'}
            </Text>
            <TextInput
              style={[
                styles.descInput,
                {
                  color: colors.text,
                  backgroundColor: isDarkMode ? '#1E1E28' : '#F9FAFB',
                  borderColor: isDarkMode ? '#2D2D3E' : '#E5E7EB',
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder={isArabic ? 'أضف سياقاً أو معايير الإنجاز...' : 'Add context or definition of done...'}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
            />

            {/* Category / Parent Section Selector */}
            <Text style={[styles.inputLabel, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left', marginTop: 14 }]}>
              {isArabic ? 'القسم الرئيسي (Parent Section)' : 'Parent Section / Category'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {categories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? color + '22' : isDarkMode ? '#22222E' : '#F3F4F6',
                        borderColor: isSelected ? color : 'transparent',
                      },
                    ]}
                    onPress={() => setCategory(isSelected ? '' : cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? color : colors.text },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Add Custom Category Chip */}
              {!isAddingCustomCategory ? (
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isDarkMode ? '#22222E' : '#F3F4F6',
                      borderColor: colors.border,
                      borderStyle: 'dashed',
                    },
                  ]}
                  onPress={() => setIsAddingCustomCategory(true)}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={[styles.categoryChipText, { color: colors.primary }]}>
                    {isArabic ? 'قسم جديد' : 'New Section'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>

            {/* Inline Custom Category Creator */}
            {isAddingCustomCategory && (
              <View style={[styles.customCatRow, isArabic && styles.rowReverse]}>
                <TextInput
                  style={[
                    styles.customCatInput,
                    { color: colors.text, textAlign: isArabic ? 'right' : 'left' },
                  ]}
                  placeholder={isArabic ? 'اسم القسم الجديد...' : 'New section name...'}
                  placeholderTextColor={colors.textMuted}
                  value={customCategoryInput}
                  onChangeText={setCustomCategoryInput}
                  onSubmitEditing={handleApplyCustomCategory}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.customCatApplyBtn, { backgroundColor: color }]}
                  onPress={handleApplyCustomCategory}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.customCatCancelBtn}
                  onPress={() => setIsAddingCustomCategory(false)}
                >
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Color & Icon Pickers */}
            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 16 }}>
              {/* Color Picker */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                  {isArabic ? 'اللون المميز' : 'Accent Color'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {COLOR_OPTIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        color === c && styles.selectedColorDot,
                      ]}
                      onPress={() => setColor(c)}
                    >
                      {color === c && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Icon Picker */}
              <View style={{ flex: 1, paddingLeft: isArabic ? 0 : 16, paddingRight: isArabic ? 16 : 0 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                  {isArabic ? 'الأيقونة' : 'Icon'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 6 }}>
                  {ICON_OPTIONS.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      style={[
                        styles.iconOptionBox,
                        {
                          backgroundColor: icon === ic ? color + '25' : isDarkMode ? '#22222E' : '#F3F4F6',
                          borderColor: icon === ic ? color : 'transparent',
                        },
                      ]}
                      onPress={() => setIcon(ic)}
                    >
                      <Ionicons name={ic as any} size={18} color={icon === ic ? color : colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* ─── Link to Space / Project ─── */}
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.inputLabel, { color: colors.text, fontWeight: '800', textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'الارتباط بمساحة أو مشروع' : 'Linked Space / Project'}
              </Text>

              {linkedProjectId || linkedCategoryId ? (
                <View style={{
                  flexDirection: isArabic ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: color + '15',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: color + '30',
                  marginTop: 8,
                }}>
                  <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons name="folder-open-outline" size={20} color={color} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', textAlign: isArabic ? 'right' : 'left' }}>
                        {isArabic ? 'المساحة أو المشروع المرتبط' : 'Connected Context'}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, textAlign: isArabic ? 'right' : 'left' }} numberOfLines={1}>
                        {linkedProjectMeta?.name || linkedCategoryMeta?.name || 'Linked Item'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={() => setIsLinkPickerOpen(true)} style={{ padding: 4 }}>
                      <Ionicons name="pencil" size={16} color={color} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      setLinkedCategoryId(undefined);
                      setLinkedSubCategoryId(undefined);
                      setLinkedProjectId(undefined);
                    }} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setIsLinkPickerOpen(true)}
                  style={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderStyle: 'dashed',
                    backgroundColor: isDarkMode ? '#1E1E28' : '#F9FAFB',
                    marginTop: 8,
                  }}
                >
                  <Ionicons name="link-outline" size={18} color={colors.textMuted} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>
                    {isArabic ? '+ ربط بمساحة أو مشروع' : '+ Connect to Space or Project'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Sub-Milestones Checklist (Only for Goals) */}
            {type === 'goal' && (
              <View style={{ marginTop: 20 }}>
                <View style={[styles.milestonesHeaderRow, isArabic && styles.rowReverse]}>
                  <Text style={[styles.inputLabel, { color: colors.text, fontWeight: '800' }]}>
                    {isArabic ? 'قائمة المهام والمراحل الفرعية (Checklist)' : 'Checklist / Sub-Milestones'}
                  </Text>
                  {milestones.length > 0 && (
                    <Text style={[styles.msCountBadge, { color: color }]}>
                      {milestones.filter((m) => m.isCompleted).length}/{milestones.length}
                    </Text>
                  )}
                </View>

                {/* Milestone list */}
                {milestones.map((ms) => (
                  <View
                    key={ms.id}
                    style={[
                      styles.msRow,
                      {
                        backgroundColor: isDarkMode ? '#1E1E28' : '#F9FAFB',
                        borderColor: isDarkMode ? '#2D2D3E' : '#E5E7EB',
                      },
                      isArabic && styles.rowReverse,
                    ]}
                  >
                    <TouchableOpacity onPress={() => handleToggleMilestone(ms.id)}>
                      <Ionicons
                        name={ms.isCompleted ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={ms.isCompleted ? colors.success : colors.textMuted}
                      />
                    </TouchableOpacity>

                    <Text
                      style={[
                        styles.msText,
                        {
                          color: ms.isCompleted ? colors.textMuted : colors.text,
                          textDecorationLine: ms.isCompleted ? 'line-through' : 'none',
                          textAlign: isArabic ? 'right' : 'left',
                        },
                      ]}
                    >
                      {ms.text}
                    </Text>

                    <TouchableOpacity onPress={() => handleRemoveMilestone(ms.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add new milestone input */}
                <View
                  style={[
                    styles.addMsInputRow,
                    {
                      backgroundColor: isDarkMode ? '#1E1E28' : '#F9FAFB',
                      borderColor: isDarkMode ? '#2D2D3E' : '#E5E7EB',
                    },
                    isArabic && styles.rowReverse,
                  ]}
                >
                  <TextInput
                    style={[
                      styles.addMsInput,
                      { color: colors.text, textAlign: isArabic ? 'right' : 'left' },
                    ]}
                    placeholder={isArabic ? '+ أضف مهمة فرعية جديدة...' : '+ Add sub-milestone...'}
                    placeholderTextColor={colors.textMuted}
                    value={newMilestoneText}
                    onChangeText={setNewMilestoneText}
                    onFocus={() => {
                      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
                    }}
                    onSubmitEditing={handleAddMilestone}
                  />
                  {newMilestoneText.trim().length > 0 && (
                    <TouchableOpacity onPress={handleAddMilestone} style={[styles.addMsSubmitBtn, { backgroundColor: color }]}>
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Bottom Action Row */}
          <View
            style={[
              styles.bottomActionRow,
              { borderTopColor: isDarkMode ? '#282836' : '#E5E7EB' },
              isArabic && styles.rowReverse,
            ]}
          >
            <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {isArabic ? 'إلغاء' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <LivePress
              style={[styles.saveBtn, { backgroundColor: color }]}
              onPress={handleSave}
              disabled={isSaving}
              pressScale={0.97}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name={isEdit ? 'checkmark-circle' : 'add-circle'} size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {isEdit
                      ? isArabic ? 'حفظ التعديلات' : 'Save Changes'
                      : isArabic
                      ? type === 'goal' ? 'إضافة الهدف' : 'إضافة الإنجاز'
                      : type === 'goal' ? 'Create Goal' : 'Create Achievement'}
                  </Text>
                </>
              )}
            </LivePress>
          </View>

          <UniversalLinkPickerModal
            visible={isLinkPickerOpen}
            onClose={() => setIsLinkPickerOpen(false)}
            onSelect={(selection) => {
              if (selection.type === 'category') {
                setLinkedCategoryId(selection.categoryId);
                setLinkedSubCategoryId(undefined);
                setLinkedProjectId(undefined);
              } else if (selection.type === 'subCategory') {
                setLinkedCategoryId(selection.categoryId);
                setLinkedSubCategoryId(selection.subCategoryId);
                setLinkedProjectId(undefined);
              } else if (selection.type === 'project') {
                setLinkedProjectId(selection.projectId);
                setLinkedCategoryId(undefined);
                setLinkedSubCategoryId(undefined);
              } else if (selection.type === 'none') {
                setLinkedCategoryId(undefined);
                setLinkedSubCategoryId(undefined);
                setLinkedProjectId(undefined);
              }
            }}
            currentCategoryId={linkedCategoryId}
            currentProjectId={linkedProjectId}
          />
        </View>
      </View>
    </Modal>
  );
};

export const EditGoalModal = GoalFormModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingVertical: 14,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
  },
  typeToggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  titleInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 50,
  },
  descInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '500',
    minHeight: 60,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  customCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  customCatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  customCatApplyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customCatCancelBtn: {
    padding: 6,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorDot: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
  },
  iconOptionBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestonesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  msCountBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  msRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  msText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  addMsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  addMsInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 6,
  },
  addMsSubmitBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomActionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
