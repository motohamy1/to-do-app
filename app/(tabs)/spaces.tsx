import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  Animated,
  Alert,
  Linking,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Share,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import { createProjectsStyles } from '@/assets/styles/projects.styles';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import TodoCard from '@/components/TodoCard';
import ActionModal from '@/components/ActionModal';
import TimerModal from '@/components/TimerModal';
import UniversalLinkPickerModal from '@/components/UniversalLinkPickerModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import { createHomeStyles } from '@/assets/styles/home.styles';
import { useScreenGuide } from '@/hooks/useScreenGuide';
import ScreenGuide from '@/components/ScreenGuide';
import type { GuideTip } from '@/components/ScreenGuide';
import { LIST_TYPE_COLORS, PROJECT_COLORS } from '@/utils/magicColors';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import CategoryCard from '@/components/CategoryCard';
import ProjectFolderCard, { AddProjectFolderCard } from '@/components/ProjectFolderCard';
import AnimatedWavyHeader from '@/components/AnimatedWavyHeader';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS = [
  'code-slash-outline', 'medkit-outline', 'book-outline', 'cash-outline',
  'barbell-outline', 'globe-outline', 'flask-outline', 'school-outline',
  'brush-outline', 'musical-notes-outline', 'airplane-outline', 'home-outline',
];

const SUB_CATEGORY_ICONS = [
  'layers-outline', 'git-network-outline', 'cube-outline', 'grid-outline',
  'construct-outline', 'list-outline', 'apps-outline', 'shapes-outline',
];

const PROJECT_ICONS = [
  'rocket-outline', 'bulb-outline', 'star-outline', 'diamond-outline',
  'film-outline', 'document-text-outline', 'stats-chart-outline', 'map-outline',
  'compass-outline', 'infinite-outline', 'flash-outline', 'shield-outline',
];

const ACCENT_COLORS = PROJECT_COLORS;

const RESOURCE_TYPES: { key: string; label: string; icon: string; color: string }[] = [
  { key: 'file',  label: 'File / Doc',  icon: 'document-text-outline', color: '#3B82F6' },
  { key: 'image', label: 'Photo',       icon: 'image-outline',         color: '#10B981' },
  { key: 'link',  label: 'Web Link',    icon: 'globe-outline',         color: '#A78BFA' },
  { key: 'note',  label: 'Note',        icon: 'reader-outline',        color: '#F59E0B' },
];

function getStatusColor(status: string | undefined, colors: any) {
  switch (status) {
    case 'completed': return { bg: colors.successBg, text: colors.success };
    case 'on_hold':   return { bg: colors.warningBg, text: colors.warning };
    default:          return { bg: colors.primary + '20', text: colors.primary };
  }
}

function getTaskStatusIcon(status: string | undefined) {
  switch (status) {
    case 'done':        return 'checkmark-circle';
    case 'in_progress': return 'play-circle';
    case 'paused':      return 'pause-circle';
    case 'not_done':    return 'close-circle';
    default:            return 'ellipse-outline';
  }
}

function getTaskStatusColor(status: string | undefined, colors: any) {
  switch (status) {
    case 'done':        return colors.success;
    case 'in_progress': return colors.info;
    case 'paused':      return colors.warning;
    case 'not_done':    return colors.danger;
    case 'not_started': return colors.primary;
    default:            return colors.textMuted;
  }
}

// ─── Modals ───────────────────────────────────────────────────────────────────

const AddSubCategoryModal = ({ visible, onClose, colors, styles, onAdd, initialData }: {
  visible: boolean; onClose: () => void; colors: any; styles: any;
  onAdd: (name: string, icon: string, color: string) => void;
  initialData?: { name: string; icon: string; color: string; id: Id<'projectSubCategories'> };
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(SUB_CATEGORY_ICONS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[2]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setIcon(initialData.icon);
      setColor(initialData.color);
    } else {
      setName('');
      setIcon(SUB_CATEGORY_ICONS[0]);
      setColor(ACCENT_COLORS[2]);
    }
  }, [initialData, visible]);

  const handleAdd = () => { if (!name.trim()) return; onAdd(name.trim(), icon, color); setName(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        </TouchableWithoutFeedback>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior="padding">
            <ScrollView style={{ maxHeight: '90%' }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{initialData ? 'Edit Sub-Category' : 'New Sub-Category'}</Text>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput style={[styles.modalInput, { minHeight: 40, paddingVertical: Platform.OS === 'ios' ? 8 : 4 }]} placeholder="e.g. Frontend, Cardiology, Sci-Fi..." placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoFocus multiline={true} blurOnSubmit={true} scrollEnabled={false} />
            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.iconPicker}>
              {SUB_CATEGORY_ICONS.map(ic => (
                <TouchableOpacity key={ic} style={[styles.iconOption, icon === ic && styles.iconOptionSelected]} onPress={() => setIcon(ic)}>
                  <Ionicons name={ic as any} size={22} color={icon === ic ? colors.primary : colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPicker}>
              {ACCENT_COLORS.map(c => (
                <TouchableOpacity key={c} style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]} onPress={() => setColor(c)} />
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleAdd}><Text style={styles.modalPrimaryBtnText}>{initialData ? 'Save Changes' : 'Create Sub-Category'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose}><Text style={styles.modalSecondaryBtnText}>Cancel</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const AddCategoryModal = ({ visible, onClose, colors, styles, onAdd, initialData }: {
  visible: boolean; onClose: () => void; colors: any; styles: any;
  onAdd: (name: string, icon: string, color: string, tag: string) => void;
  initialData?: { name: string; icon: string; color: string; tag?: string; id: Id<'projectCategories'> };
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[0]);
  const [tag, setTag] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setIcon(initialData.icon);
      setColor(initialData.color);
      setTag(initialData.tag || '');
    } else {
      setName('');
      setIcon(CATEGORY_ICONS[0]);
      setColor(ACCENT_COLORS[0]);
      setTag('');
    }
  }, [initialData, visible]);

  const handleAdd = () => { if (!name.trim()) return; onAdd(name.trim(), icon, color, tag.trim()); setName(''); setTag(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        </TouchableWithoutFeedback>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior="padding">
            <ScrollView style={{ maxHeight: '90%' }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{initialData ? 'Edit Category' : 'New Category'}</Text>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput style={[styles.modalInput, { minHeight: 40, paddingVertical: Platform.OS === 'ios' ? 8 : 4 }]} placeholder="e.g. Programming, Medicine…" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoFocus multiline={true} blurOnSubmit={true} scrollEnabled={false} />
            <Text style={styles.modalLabel}>Tag / Type (optional)</Text>
            <TextInput style={[styles.modalInput, { minHeight: 40, paddingVertical: Platform.OS === 'ios' ? 8 : 4 }]} placeholder="e.g. #programming, Medicine, Design…" placeholderTextColor={colors.textMuted} value={tag} onChangeText={setTag} multiline={true} blurOnSubmit={true} scrollEnabled={false} />
            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.iconPicker}>
              {CATEGORY_ICONS.map(ic => (
                <TouchableOpacity key={ic} style={[styles.iconOption, icon === ic && styles.iconOptionSelected]} onPress={() => setIcon(ic)}>
                  <Ionicons name={ic as any} size={22} color={icon === ic ? colors.primary : colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPicker}>
              {ACCENT_COLORS.map(c => (
                <TouchableOpacity key={c} style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]} onPress={() => setColor(c)} />
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleAdd}><Text style={styles.modalPrimaryBtnText}>{initialData ? 'Save Changes' : 'Create Category'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose}><Text style={styles.modalSecondaryBtnText}>Cancel</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const AddProjectModal = ({ visible, onClose, colors, styles, onAdd, initialData }: {
  visible: boolean; onClose: () => void; colors: any; styles: any;
  onAdd: (name: string, desc: string, icon: string, color: string) => void;
  initialData?: { name: string; description?: string; icon: string; color: string; id: Id<'projects'> };
}) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [icon, setIcon] = useState(PROJECT_ICONS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[1]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDesc(initialData.description || '');
      setIcon(initialData.icon);
      setColor(initialData.color);
    } else {
      setName('');
      setDesc('');
      setIcon(PROJECT_ICONS[0]);
      setColor(ACCENT_COLORS[1]);
    }
  }, [initialData, visible]);

  const handleAdd = () => { if (!name.trim()) return; onAdd(name.trim(), desc.trim(), icon, color); setName(''); setDesc(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        </TouchableWithoutFeedback>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={{ maxHeight: '90%' }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{initialData ? 'Edit Project' : 'New Project'}</Text>
            <Text style={styles.modalLabel}>Project Name</Text>
            <TextInput style={[styles.modalInput, { minHeight: 40, paddingVertical: Platform.OS === 'ios' ? 8 : 4 }]} placeholder="e.g. Todo App, Research Paper…" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoFocus multiline={true} blurOnSubmit={true} scrollEnabled={false} />
            <Text style={styles.modalLabel}>Short Description (optional)</Text>
            <TextInput style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="What is this project about?" placeholderTextColor={colors.textMuted} value={desc} onChangeText={setDesc} multiline />
            <Text style={styles.modalLabel}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPicker}>
              {ACCENT_COLORS.map(c => (
                <TouchableOpacity key={c} style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]} onPress={() => setColor(c)} />
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: color }]} onPress={handleAdd}><Text style={styles.modalPrimaryBtnText}>{initialData ? 'Save Changes' : 'Create Project'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose}><Text style={styles.modalSecondaryBtnText}>Cancel</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const AddResourceModal = ({ visible, onClose, colors, styles, onAdd }: {
  visible: boolean; onClose: () => void; colors: any; styles: any;
  onAdd: (type: string, title: string, url?: string, note?: string) => void;
}) => {
  const [resType, setResType] = useState('file');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size?: string; uri: string } | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setNote('');
    setSelectedFile(null);
    setResType('file');
  };

  const handlePickDocument = async () => {
    try {
      setIsPicking(true);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: '*/*',
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const formattedSize = asset.size ? `${(asset.size / (1024 * 1024)).toFixed(2)} MB` : undefined;
        setSelectedFile({
          name: asset.name,
          size: formattedSize,
          uri: asset.uri,
        });
        setUrl(asset.uri);
        if (!title.trim()) {
          setTitle(asset.name);
        }
      }
    } catch (err) {
      console.warn('Error picking document', err);
    } finally {
      setIsPicking(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setIsPicking(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `Photo_${Date.now()}.jpg`;
        const formattedSize = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB` : undefined;
        setSelectedFile({
          name: fileName,
          size: formattedSize,
          uri: asset.uri,
        });
        setUrl(asset.uri);
        if (!title.trim()) {
          setTitle(fileName);
        }
      }
    } catch (err) {
      console.warn('Error picking image', err);
    } finally {
      setIsPicking(false);
    }
  };

  const handleAdd = () => {
    const finalTitle = title.trim() || selectedFile?.name || (resType === 'link' ? url.trim() : 'Resource');
    if (!finalTitle) return;
    onAdd(resType, finalTitle, url.trim() || undefined, note.trim() || undefined);
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        </TouchableWithoutFeedback>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={{ maxHeight: '90%' }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Add Resource</Text>
                
                {/* Resource Type Selector */}
                <Text style={styles.modalLabel}>Resource Type</Text>
                <View style={styles.addResourceTypeRow}>
                  {RESOURCE_TYPES.map(rt => {
                    const isSelected = resType === rt.key;
                    return (
                      <TouchableOpacity
                        key={rt.key}
                        style={[
                          styles.resourceTypeBtn,
                          isSelected && [styles.resourceTypeBtnSelected, { borderColor: rt.color, backgroundColor: rt.color + '18' }]
                        ]}
                        onPress={() => {
                          setResType(rt.key);
                          setSelectedFile(null);
                          setUrl('');
                        }}
                      >
                        <Ionicons name={rt.icon as any} size={18} color={isSelected ? rt.color : colors.textMuted} />
                        <Text style={[styles.resourceTypeBtnText, isSelected && { color: rt.color, fontWeight: '800' }]}>
                          {rt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* File Upload from Device */}
                {resType === 'file' && (
                  <View>
                    <Text style={styles.modalLabel}>Document / File from Device</Text>
                    {selectedFile ? (
                      <View style={styles.filePreviewBox}>
                        <Ionicons name="document-attach" size={24} color="#3B82F6" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.filePreviewName} numberOfLines={1}>{selectedFile.name}</Text>
                          {selectedFile.size && <Text style={styles.filePreviewSize}>{selectedFile.size}</Text>}
                        </View>
                        <TouchableOpacity onPress={handlePickDocument}>
                          <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.uploadPickerBox}
                        onPress={handlePickDocument}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="cloud-upload-outline" size={28} color="#3B82F6" />
                        <Text style={[styles.uploadPickerText, { color: '#3B82F6' }]}>
                          {isPicking ? 'Opening Files...' : 'Choose File from Device'}
                        </Text>
                        <Text style={styles.uploadPickerSubtext}>PDF, DOC, ZIP, Audio, or any file</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Photo / Image from Gallery */}
                {resType === 'image' && (
                  <View>
                    <Text style={styles.modalLabel}>Photo from Gallery</Text>
                    {selectedFile ? (
                      <View style={styles.filePreviewBox}>
                        <Ionicons name="image" size={24} color="#10B981" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.filePreviewName} numberOfLines={1}>{selectedFile.name}</Text>
                          {selectedFile.size && <Text style={styles.filePreviewSize}>{selectedFile.size}</Text>}
                        </View>
                        <TouchableOpacity onPress={handlePickImage}>
                          <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.uploadPickerBox}
                        onPress={handlePickImage}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="images-outline" size={28} color="#10B981" />
                        <Text style={[styles.uploadPickerText, { color: '#10B981' }]}>
                          {isPicking ? 'Opening Gallery...' : 'Select Photo / Image'}
                        </Text>
                        <Text style={styles.uploadPickerSubtext}>Upload screenshots, mockups, or photos</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Remote Web Link */}
                {resType === 'link' && (
                  <View>
                    <Text style={styles.modalLabel}>Remote URL / Web Link</Text>
                    <TextInput
                      style={[styles.modalInput, { minHeight: 44 }]}
                      placeholder="https://github.com, figma.com, docs…"
                      placeholderTextColor={colors.textMuted}
                      value={url}
                      onChangeText={setUrl}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                )}

                {/* Title */}
                <Text style={styles.modalLabel}>Title</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 42, paddingVertical: Platform.OS === 'ios' ? 8 : 4 }]}
                  placeholder={resType === 'link' ? "e.g. Design Specs, GitHub Repo…" : "Resource display title…"}
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />

                {/* Notes & Description */}
                <Text style={styles.modalLabel}>{resType === 'note' ? 'Note Content' : 'Note (optional)'}</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: resType === 'note' ? 80 : 50, textAlignVertical: 'top' }]}
                  placeholder={resType === 'note' ? "Write your note, code snippet, or instructions here…" : "Add short description or context…"}
                  placeholderTextColor={colors.textMuted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                />

                <TouchableOpacity
                  style={[
                    styles.modalPrimaryBtn,
                    { backgroundColor: RESOURCE_TYPES.find(r => r.key === resType)?.color || colors.primary }
                  ]}
                  onPress={handleAdd}
                >
                  <Text style={[styles.modalPrimaryBtnText, { color: '#16270E', fontWeight: '800' }]}>Add Resource</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose}>
                  <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Layer 1: Categories View (Full Width) ───────────────────────────────────

const CategoriesView = ({ styles, colors, onSelectCategory, onAddCategory, onEditCategory, onOpenAction, userId, isArabic = false }: {
  styles: any; colors: any;
  onSelectCategory: (id: Id<'projectCategories'>, name: string, color: string) => void;
  onAddCategory: () => void;
  onEditCategory: (cat: any) => void;
  onOpenAction: (config: any) => void;
  userId: Id<'users'> | null;
  isArabic?: boolean;
}) => {
  const categories = useOfflineQuery<any[]>('projects.getCategories', api.projects.getCategories, userId ? { userId } : 'skip');
  const allTodos = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : 'skip');
  const deleteCategory = useOfflineMutation(api.projects.deleteCategory, 'projects:deleteCategory');

  if (!categories) return <View style={styles.emptyContainer}><Ionicons name="hourglass-outline" size={40} color="#8E9AAB" /></View>;

  const getProgress = (catId: string) => {
    if (!allTodos) return 0;
    const linked = allTodos.filter((t: any) => t.categoryId === catId);
    if (linked.length === 0) return 0;
    const done = linked.filter((t: any) => t.status === 'done').length;
    return Math.round((done / linked.length) * 100);
  };

  const getTaskCount = (catId: string) => {
    if (!allTodos) return 0;
    return allTodos.filter((t: any) => t.categoryId === catId).length;
  };

  return (
    <ScrollView contentContainerStyle={styles.categoriesGrid} showsVerticalScrollIndicator={false}>
      {categories.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={48} color="#dbd4fd" />
          <Text style={styles.emptyText}>{isArabic ? 'لا توجد فئات مشاريع بعد' : 'No project categories yet'}</Text>
          <Text style={styles.emptySubText}>
            {isArabic ? 'اضغط أدناه لإنشاء أول مساحة عمل وتنظيم مشاريعك.' : 'Create your first category workspace to organize projects and tasks.'}
          </Text>
          <TouchableOpacity style={[styles.addCategoryBtn, { marginTop: 20, width: '100%' }]} onPress={onAddCategory}>
            <Ionicons name="add" size={20} color={colors.text} />
            <Text style={styles.addCategoryBtnText}>{isArabic ? 'إنشاء فئة جديدة' : 'Create Category'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {categories.map((cat, i) => {
        const progressPct = getProgress(cat._id);
        const taskCount = getTaskCount(cat._id);
        const subtitle = taskCount > 0 
          ? (isArabic ? `${taskCount} مهام مرتبطة` : `${taskCount} task${taskCount !== 1 ? 's' : ''} linked`)
          : (isArabic ? 'مساحة عمل المشروع' : 'Workspace category');
        
        const status = progressPct === 100 
          ? (isArabic ? 'مكتمل' : 'Completed') 
          : (progressPct > 0 ? (isArabic ? 'قيد العمل' : 'Running') : (isArabic ? 'نشط' : 'Active'));

        return (
          <Reanimated.View key={cat._id} entering={FadeInDown.duration(450).delay(i * 60)}>
            <CategoryCard
              id={cat._id}
              name={cat.name}
              icon={cat.icon || 'briefcase-outline'}
              index={i}
              subtitle={subtitle}
              status={cat.tag ? cat.tag : status}
              progressPct={progressPct}
              isArabic={isArabic}
              onPress={() => onSelectCategory(cat._id, cat.name, cat.color)}
              onMenuPress={() => onOpenAction({
                title: cat.name,
                options: [
                  {
                    label: isArabic ? 'تعديل الفئة' : 'Edit Category',
                    icon: 'create-outline',
                    onPress: () => onEditCategory(cat)
                  },
                  {
                    label: isArabic ? 'مشاركة' : 'Share Category',
                    icon: 'share-social-outline',
                    onPress: () => Share.share({ message: `Check out my project category: ${cat.name}` })
                  },
                  {
                    label: isArabic ? 'حذف الفئة' : 'Delete Category',
                    icon: 'trash-outline',
                    variant: 'destructive',
                    onPress: () => deleteCategory({ id: cat._id })
                  }
                ]
              })}
            />
          </Reanimated.View>
        );
      })}

      {categories.length > 0 && (
        <Reanimated.View entering={FadeInDown.duration(450).delay(categories.length * 50)} style={styles.addCategoryCardWrapper}>
          <TouchableOpacity 
            style={styles.addCategoryBtn}
            onPress={onAddCategory}
            activeOpacity={0.82}
          >
            <Ionicons name="add-circle-outline" size={24} color="#8E9AAB" />
            <Text style={styles.addCategoryBtnText}>{isArabic ? 'إضافة فئة جديدة' : 'Add New Category'}</Text>
          </TouchableOpacity>
        </Reanimated.View>
      )}
    </ScrollView>
  );
};

// ─── Layer 2: Category Detail View (Sub-categories & Direct Projects) ────────
// ─── Layer 2: Category Detail View (3D Folder Pockets for Projects) ──────────

const LIST_TYPE_CARDS = [
  { key: 'checklist', label: 'Checklists', icon: 'checkbox-outline', color: LIST_TYPE_COLORS.checklist },
  { key: 'todo', label: 'To-Do Tasks', icon: 'list-outline', color: LIST_TYPE_COLORS.todo },
  { key: 'bullet', label: 'Bullet Points', icon: 'ellipse', color: LIST_TYPE_COLORS.bullet },
  { key: 'toggle', label: 'Toggle Lists', icon: 'albums-outline', color: LIST_TYPE_COLORS.toggle },
];

const CategoryDetailView = ({
  styles,
  colors,
  categoryId,
  categoryName,
  userId,
  onSelectProject,
  onAddProject,
  onEditCategory,
  onEditProject,
  onDeleteCategory,
  onDeleteProject,
  onOpenAction,
  isArabic = false,
}: {
  styles: any;
  colors: any;
  categoryId: Id<'projectCategories'>;
  categoryName: string;
  onSelectProject: (id: Id<'projects'>, name?: string) => void;
  onAddProject: () => void;
  onEditCategory: (cat: any) => void;
  onEditProject: (proj: any) => void;
  onDeleteCategory: (id: Id<'projectCategories'>) => void;
  onDeleteProject: (id: Id<'projects'>) => void;
  onOpenAction: (config: any) => void;
  userId: Id<'users'> | null;
  isArabic?: boolean;
}) => {
  const { t } = useTranslation();
  const category = useOfflineQuery<any>('projects.getCategory', api.projects.getCategory, { id: categoryId });
  const linkedGoal = useOfflineQuery<any>('yearlyGoals.getGoal', api.yearlyGoals.getGoal, category?.goalId ? { id: category.goalId } : 'skip');
  const directProjects = useOfflineQuery<any[]>('projects.getProjectsByCategory', api.projects.getProjectsByCategory, { categoryId });
  const allTodos = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : 'skip');
  const categoryTasks = useOfflineQuery<any[]>('todos.getTasksByCategory', api.todos.getTasksByCategory, userId ? { categoryId } : 'skip') || [];
  
  // Real-time reactive items for this category from Convex
  const toggleItems = useOfflineQuery<any[]>('categoryItems_toggle', api.projects.getCategoryItems, { categoryId, listType: 'toggle' }) || [];
  const checklistItems = useOfflineQuery<any[]>('categoryItems_checklist', api.projects.getCategoryItems, { categoryId, listType: 'checklist' }) || [];

  const updateCategoryMutation = useOfflineMutation(api.projects.updateCategory, 'projects:updateCategory');
  const linkCategoryToGoal = useOfflineMutation(api.projects.linkCategoryToGoal, 'projects:linkCategoryToGoal');
  const addCategoryItemMutation = useOfflineMutation(api.projects.addCategoryItem, 'projects:addCategoryItem');
  const updateCategoryItemMutation = useOfflineMutation(api.projects.updateCategoryItem, 'projects:updateCategoryItem');
  const deleteCategoryItemMutation = useOfflineMutation(api.projects.deleteCategoryItem, 'projects:deleteCategoryItem');
  const updateTodoStatus = useOfflineMutation(api.todos.updateStatus, 'todos:updateStatus');
  const addTodoMutation = useOfflineMutation(api.todos.addTodo, 'todos:addTodo');

  const [isGoalPickerVisible, setIsGoalPickerVisible] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<any | null>(null);
  const [showAddCategoryTask, setShowAddCategoryTask] = useState(false);
  const [newCategoryTaskText, setNewCategoryTaskText] = useState('');

  // Description / Workspace Overview state
  const [editingDesc, setEditingDesc] = useState(false);
  const [descText, setDescText] = useState('');

  useEffect(() => {
    if (category?.description !== undefined) {
      setDescText(category.description || '');
    }
  }, [category?.description]);

  const handleSaveDescription = async () => {
    await updateCategoryMutation({ id: categoryId, description: descText.trim() });
    setEditingDesc(false);
  };

  // Toggle Notes state
  const [showAddToggle, setShowAddToggle] = useState(false);
  const [newToggleTitle, setNewToggleTitle] = useState('');
  const [newToggleContent, setNewToggleContent] = useState('');
  const [expandedToggleIds, setExpandedToggleIds] = useState<Record<string, boolean>>({});

  const toggleExpandItem = (itemId: string) => {
    setExpandedToggleIds(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleAddToggleItem = async () => {
    if (!newToggleTitle.trim() || !userId) return;
    await addCategoryItemMutation({
      userId,
      categoryId,
      listType: 'toggle',
      text: newToggleTitle.trim(),
      content: newToggleContent.trim() || undefined,
    });
    setNewToggleTitle('');
    setNewToggleContent('');
    setShowAddToggle(false);
  };

  // Space Checklist state
  const [showAddCheck, setShowAddCheck] = useState(false);
  const [newCheckText, setNewCheckText] = useState('');

  const handleAddChecklist = async () => {
    if (!newCheckText.trim() || !userId) return;
    await addCategoryItemMutation({
      userId,
      categoryId,
      listType: 'checklist',
      text: newCheckText.trim(),
    });
    setNewCheckText('');
    setShowAddCheck(false);
  };

  if (!directProjects) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="hourglass-outline" size={40} color={colors.border} />
      </View>
    );
  }

  const doneChecklist = checklistItems.filter((item: any) => item.isCompleted).length;
  const totalChecklist = checklistItems.length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingTop: 6 }}>
      {/* ─── Goal Cross-Link Banner ─── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        {linkedGoal ? (
          <View style={{
            flexDirection: isArabic ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#8B5CF618',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: '#8B5CF630',
          }}>
            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="flag" size={18} color="#8B5CF6" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', textAlign: isArabic ? 'right' : 'left' }}>
                  {isArabic ? 'الهدف المرتبط بهذه المساحة' : 'Linked Goal'}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, textAlign: isArabic ? 'right' : 'left' }} numberOfLines={1}>
                  {linkedGoal.title}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity onPress={() => setIsGoalPickerVisible(true)} style={{ padding: 4 }}>
                <Ionicons name="pencil" size={15} color="#8B5CF6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => linkCategoryToGoal({ categoryId, goalId: undefined })} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setIsGoalPickerVisible(true)}
            style={{
              flexDirection: isArabic ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              borderStyle: 'dashed',
              backgroundColor: colors.surface + '60',
            }}
          >
            <Ionicons name="flag-outline" size={15} color={colors.textMuted} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
              {isArabic ? '+ ربط هذه المساحة بهدف (Goal)' : '+ Link this space to a Goal'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── 1. Projects Section (3D Folder Grid) ────────────────────── */}
      <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.sectionLabel, { paddingHorizontal: 0, marginBottom: 0 }]}>
              {isArabic ? 'المشاريع' : 'Projects'}
            </Text>
            <View style={{ backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>{directProjects.length}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onAddProject}
            style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="add-circle" size={18} color={colors.primary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
              {isArabic ? 'مشروع جديد' : 'New Project'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.projectsGrid, { paddingHorizontal: 0 }]}>
          {directProjects.map((project, i) => {
            const linked = allTodos?.filter((t: any) => t.projectId === project._id) || [];
            const doneCount = linked.filter((t: any) => t.status === 'done').length;
            const totalCount = linked.length;
            const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
            const previewItems = linked.slice(0, 3).map((t: any) => ({
              text: t.text,
              isCompleted: t.status === 'done',
            }));

            return (
              <Reanimated.View
                key={project._id}
                entering={FadeInDown.duration(450).delay(i * 50)}
                style={{ width: '48%' }}
              >
                <ProjectFolderCard
                  id={project._id}
                  name={project.name}
                  color={project.color}
                  icon={project.icon || 'folder-outline'}
                  tag={category?.tag || categoryName}
                  itemCount={totalCount}
                  doneCount={doneCount}
                  progressPct={pct}
                  previewItems={previewItems}
                  index={i}
                  isArabic={isArabic}
                  onPress={() => onSelectProject(project._id, project.name)}
                  onMenuPress={() => onOpenAction({
                    title: project.name,
                    options: [
                      { label: isArabic ? 'تعديل المشروع' : 'Edit Project', icon: 'create-outline', onPress: () => onEditProject(project) },
                      { label: isArabic ? 'مشاركة المشروع' : 'Share Project', icon: 'share-social-outline', onPress: () => Share.share({ message: `Project: ${project.name}` }) },
                      {
                        label: t.delete || 'Delete Project',
                        icon: 'trash-outline',
                        variant: 'destructive',
                        onPress: () => {
                          Alert.alert(
                            t.confirmDeleteTitle || "Confirm Delete",
                            isArabic ? "هل أنت متأكد من حذف هذا المشروع؟" : "Are you sure you want to delete this project and unlink its tasks?",
                            [
                              { text: t.cancel || "Cancel", style: "cancel" },
                              { text: t.delete || "Delete", style: "destructive", onPress: () => onDeleteProject(project._id) }
                            ]
                          );
                        }
                      }
                    ]
                  })}
                />
              </Reanimated.View>
            );
          })}

          {/* Ghost "+ Add Project" Folder Card */}
          <Reanimated.View
            entering={FadeInDown.duration(450).delay(directProjects.length * 50)}
            style={{ width: '48%' }}
          >
            <AddProjectFolderCard
              onPress={onAddProject}
              isArabic={isArabic}
            />
          </Reanimated.View>
        </View>
      </View>

      {/* ─── 2. Workspace Overview / Description ───────────────────────── */}
      <View style={styles.workspaceSection}>
        <View style={[styles.sectionHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="document-text-outline" size={17} color={colors.primary} />
            <Text style={styles.workspaceSectionTitle}>
              {isArabic ? 'نظرة عامة على المساحة' : 'Workspace Overview'}
            </Text>
          </View>
          {!editingDesc ? (
            <TouchableOpacity onPress={() => setEditingDesc(true)} style={styles.sectionPillBtn}>
              <Ionicons name="pencil" size={13} color={colors.primary} />
              <Text style={[styles.sectionPillBtnText, { color: colors.primary }]}>
                {isArabic ? 'تعديل' : 'Edit'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => { setEditingDesc(false); setDescText(category?.description || ''); }} style={styles.sectionPillBtn}>
                <Text style={[styles.sectionPillBtnText, { color: colors.textMuted }]}>
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveDescription} style={[styles.sectionPillBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.sectionPillBtnText, { color: '#000' }]}>
                  {isArabic ? 'حفظ' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.workspaceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {editingDesc ? (
            <TextInput
              style={[styles.workspaceDescInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
              value={descText}
              onChangeText={setDescText}
              multiline
              placeholder={isArabic ? 'أضف وصفاً، أهدافاً، أو إرشادات لمساحة العمل هذه...' : 'Add workspace description, goals, or core guidelines...'}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          ) : (
            <TouchableOpacity activeOpacity={0.8} onPress={() => setEditingDesc(true)}>
              {category?.description ? (
                <Text style={[styles.workspaceDescText, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                  {category.description}
                </Text>
              ) : (
                <Text style={[styles.workspaceDescPlaceholder, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                  {isArabic ? '+ اضغط لإضافة وصف أو أهداف لمساحة العمل هذه...' : '+ Tap to add workspace description, goals, or key rules...'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── 3. Toggle Notes & Guidelines ─────────────────────────────── */}
      <View style={styles.workspaceSection}>
        <View style={[styles.sectionHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="albums-outline" size={17} color="#A78BFA" />
            <Text style={styles.workspaceSectionTitle}>
              {isArabic ? 'الملاحظات والقوائم المنسدلة' : 'Toggle Notes & Guidelines'}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>{toggleItems.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddToggle(!showAddToggle)}
            style={[styles.sectionPillBtn, { backgroundColor: showAddToggle ? colors.surface : colors.primary + '18' }]}
          >
            <Ionicons name={showAddToggle ? "close" : "add"} size={14} color={colors.primary} />
            <Text style={[styles.sectionPillBtnText, { color: colors.primary }]}>
              {showAddToggle ? (isArabic ? 'إغلاق' : 'Close') : (isArabic ? 'إضافة ملاحظة' : 'Add Note')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Toggle Item Card */}
        {showAddToggle && (
          <View style={[styles.addFormCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.formLabel, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
              {isArabic ? 'عنوان الملاحظة' : 'Note / Section Title'}
            </Text>
            <TextInput
              style={[styles.formInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border, textAlign: isArabic ? 'right' : 'left' }]}
              placeholder={isArabic ? 'مثال: إرشادات التسليم، روابط هامة...' : 'e.g. Project guidelines, useful links, SOPs...'}
              placeholderTextColor={colors.textMuted}
              value={newToggleTitle}
              onChangeText={setNewToggleTitle}
              autoFocus
            />

            <Text style={[styles.formLabel, { color: colors.textMuted, marginTop: 10, textAlign: isArabic ? 'right' : 'left' }]}>
              {isArabic ? 'المحتوى المنسدل (اختياري)' : 'Expanded Content / Notes (optional)'}
            </Text>
            <TextInput
              style={[styles.formMultilineInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border, textAlign: isArabic ? 'right' : 'left' }]}
              placeholder={isArabic ? 'اكتب التفاصيل والملاحظات هنا...' : 'Write detailed notes, checklists, or links here...'}
              placeholderTextColor={colors.textMuted}
              value={newToggleContent}
              onChangeText={setNewToggleContent}
              multiline
            />

            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowAddToggle(false)} style={styles.formCancelBtn}>
                <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddToggleItem} style={[styles.formSubmitBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#000', fontSize: 13, fontWeight: '700' }}>
                  {isArabic ? 'حفظ الملاحظة' : 'Save Note'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* List of Toggle Items */}
        {toggleItems.length === 0 && !showAddToggle ? (
          <TouchableOpacity
            onPress={() => setShowAddToggle(true)}
            style={[styles.emptyPromptCard, { backgroundColor: colors.surface + '40', borderColor: colors.border }]}
          >
            <Ionicons name="folder-open-outline" size={22} color={colors.textMuted} />
            <Text style={[styles.emptyPromptText, { color: colors.textMuted }]}>
              {isArabic ? '+ أضف أول ملاحظة أو قائمة منسدلة لهذه المساحة' : '+ Create your first toggle note or guideline'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 8 }}>
            {toggleItems.map((item: any) => {
              const isExpanded = expandedToggleIds[item._id] ?? false;
              return (
                <View
                  key={item._id}
                  style={[styles.toggleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <TouchableOpacity
                    onPress={() => toggleExpandItem(item._id)}
                    style={[styles.toggleCardHeader, isArabic && { flexDirection: 'row-reverse' }]}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.toggleIconCircle, { backgroundColor: isExpanded ? colors.primary + '22' : colors.bg }]}>
                      <Ionicons
                        name={isExpanded ? "chevron-down" : (isArabic ? "chevron-back" : "chevron-forward")}
                        size={15}
                        color={isExpanded ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <Text style={[styles.toggleCardTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>
                      {item.text}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          isArabic ? "حذف الملاحظة" : "Delete Note",
                          isArabic ? "هل أنت متأكد من حذف هذه الملاحظة المنسدلة؟" : "Are you sure you want to delete this toggle item?",
                          [
                            { text: isArabic ? "إلغاء" : "Cancel", style: "cancel" },
                            { text: isArabic ? "حذف" : "Delete", style: "destructive", onPress: () => deleteCategoryItemMutation({ id: item._id }) }
                          ]
                        );
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.toggleCardBody, { borderTopColor: colors.border }]}>
                      <Text style={[styles.toggleCardContent, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                        {item.content || (isArabic ? 'لا يوجد محتوى إضافي بعد.' : 'No additional content details added.')}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ─── 4. Space Quick Checklist ─────────────────────────────────── */}
      <View style={styles.workspaceSection}>
        <View style={[styles.sectionHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkbox-outline" size={17} color="#34D399" />
            <Text style={styles.workspaceSectionTitle}>
              {isArabic ? 'قائمة مهام المساحة' : 'Space Checklist & Tasks'}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>{doneChecklist}/{totalChecklist}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddCheck(!showAddCheck)}
            style={[styles.sectionPillBtn, { backgroundColor: showAddCheck ? colors.surface : colors.primary + '18' }]}
          >
            <Ionicons name={showAddCheck ? "close" : "add"} size={14} color={colors.primary} />
            <Text style={[styles.sectionPillBtnText, { color: colors.primary }]}>
              {showAddCheck ? (isArabic ? 'إغلاق' : 'Close') : (isArabic ? 'إضافة مهمة' : 'Add Task')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Checklist Input */}
        {showAddCheck && (
          <View style={[styles.addInlineRow, { backgroundColor: colors.surface, borderColor: colors.border }, isArabic && { flexDirection: 'row-reverse' }]}>
            <TextInput
              style={[styles.inlineInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
              placeholder={isArabic ? 'اكتب مهمة جديدة للمساحة...' : 'Type a space task or checklist item...'}
              placeholderTextColor={colors.textMuted}
              value={newCheckText}
              onChangeText={setNewCheckText}
              autoFocus
              onSubmitEditing={handleAddChecklist}
            />
            <TouchableOpacity onPress={handleAddChecklist} style={[styles.inlineAddBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="arrow-up" size={16} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {/* Checklist Items */}
        {checklistItems.length === 0 && !showAddCheck ? (
          <TouchableOpacity
            onPress={() => setShowAddCheck(true)}
            style={[styles.emptyPromptCard, { backgroundColor: colors.surface + '40', borderColor: colors.border }]}
          >
            <Ionicons name="checkbox-outline" size={22} color={colors.textMuted} />
            <Text style={[styles.emptyPromptText, { color: colors.textMuted }]}>
              {isArabic ? '+ أضف مهمة سريعة إلى قائمة المساحة' : '+ Add a quick action task to this space'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 6 }}>
            {checklistItems.map((item: any) => (
              <View
                key={item._id}
                style={[styles.checklistItemRow, { backgroundColor: colors.surface, borderColor: colors.border }, isArabic && { flexDirection: 'row-reverse' }]}
              >
                <TouchableOpacity
                  onPress={() => updateCategoryItemMutation({ id: item._id, isCompleted: !item.isCompleted })}
                  style={styles.checkboxTouchable}
                >
                  <Ionicons
                    name={item.isCompleted ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={item.isCompleted ? "#34D399" : colors.border}
                  />
                </TouchableOpacity>
                <Text
                  style={[
                    styles.checkItemText,
                    { color: item.isCompleted ? colors.textMuted : colors.text, textAlign: isArabic ? 'right' : 'left' },
                    item.isCompleted && { textDecorationLine: 'line-through' }
                  ]}
                  numberOfLines={2}
                >
                  {item.text}
                </Text>
                <TouchableOpacity
                  onPress={() => deleteCategoryItemMutation({ id: item._id })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={17} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ─── 5. Space Linked Tasks ─────────────────────────────────────── */}
      <View style={[styles.workspaceSection, { marginTop: 16 }]}>
        <View style={[styles.sectionHeaderRow, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="link-outline" size={17} color={colors.primary} />
            <Text style={styles.workspaceSectionTitle}>
              {isArabic ? 'المهام المرتبطة بهذه المساحة' : 'Linked Tasks'}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>
                {categoryTasks.filter((t: any) => t.status === 'done').length}/{categoryTasks.length}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddCategoryTask(!showAddCategoryTask)}
            style={[styles.sectionPillBtn, { backgroundColor: showAddCategoryTask ? colors.surface : colors.primary + '18' }]}
          >
            <Ionicons name={showAddCategoryTask ? "close" : "add"} size={14} color={colors.primary} />
            <Text style={[styles.sectionPillBtnText, { color: colors.primary }]}>
              {showAddCategoryTask ? (isArabic ? 'إغلاق' : 'Close') : (isArabic ? 'إضافة مهمة' : 'Add Task')}
            </Text>
          </TouchableOpacity>
        </View>

        {showAddCategoryTask && (
          <View style={[styles.addInlineRow, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 10 }, isArabic && { flexDirection: 'row-reverse' }]}>
            <TextInput
              style={[styles.inlineInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
              placeholder={isArabic ? 'اكتب مهمة مرتبطة بهذه المساحة...' : 'Task for this space...'}
              placeholderTextColor={colors.textMuted}
              value={newCategoryTaskText}
              onChangeText={setNewCategoryTaskText}
              autoFocus
              onSubmitEditing={async () => {
                if (!newCategoryTaskText.trim() || !userId) return;
                await addTodoMutation({
                  userId,
                  text: newCategoryTaskText.trim(),
                  date: Date.now(),
                  status: 'not_started',
                  categoryId,
                });
                setNewCategoryTaskText('');
                setShowAddCategoryTask(false);
              }}
            />
            <TouchableOpacity
              onPress={async () => {
                if (!newCategoryTaskText.trim() || !userId) return;
                await addTodoMutation({
                  userId,
                  text: newCategoryTaskText.trim(),
                  date: Date.now(),
                  status: 'not_started',
                  categoryId,
                });
                setNewCategoryTaskText('');
                setShowAddCategoryTask(false);
              }}
              style={[styles.inlineAddBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="arrow-up" size={16} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {categoryTasks.length === 0 && !showAddCategoryTask ? (
          <Text style={[styles.emptyText, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left', marginTop: 8 }]}>
            {isArabic ? 'لا توجد مهام مخصصة لهذه المساحة مباشرة.' : 'No tasks linked directly to this space yet.'}
          </Text>
        ) : (
          <View style={{ gap: 6, marginTop: 10 }}>
            {categoryTasks.map((task: any) => {
              const isDone = task.status === 'done';
              return (
                <View
                  key={task._id}
                  style={[
                    styles.checklistItemRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isDone ? colors.success + '40' : colors.border,
                    },
                    isArabic && { flexDirection: 'row-reverse' },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => updateTodoStatus({ id: task._id, status: isDone ? 'not_started' : 'done' })}
                    style={styles.checkboxTouchable}
                  >
                    <Ionicons
                      name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isDone ? '#34D399' : colors.border}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => setSelectedTaskForDetail(task._id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.checkItemText,
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

                  <TouchableOpacity
                    onPress={() => setSelectedTaskForDetail(task._id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <UniversalLinkPickerModal
        visible={isGoalPickerVisible}
        onClose={() => setIsGoalPickerVisible(false)}
        onSelect={(selection) => {
          if (selection.type === 'goal') {
            linkCategoryToGoal({ categoryId, goalId: selection.goalId });
          } else if (selection.type === 'none') {
            linkCategoryToGoal({ categoryId, goalId: undefined });
          }
          setIsGoalPickerVisible(false);
        }}
        currentGoalId={category?.goalId}
      />

      <TaskDetailModal
        visible={!!selectedTaskForDetail}
        onClose={() => setSelectedTaskForDetail(null)}
        todoId={selectedTaskForDetail}
      />
    </ScrollView>
  );
};

// ─── Layer 3: Sub-Category Projects Grid ─────────────────────────────────────

const SubCategoryProjectsView = ({
  styles, colors, subCategoryId, subCategoryName,
  onSelectProject, onAddProject, onEditSubCategory, onEditProject, onDeleteSubCategory, onDeleteProject, onOpenAction, userId
}: {
  styles: any; colors: any;
  subCategoryId: Id<'projectSubCategories'>; subCategoryName: string;
  onSelectProject: (id: Id<'projects'>, name?: string) => void;
  onAddProject: () => void;
  onEditSubCategory: (sub: any) => void;
  onEditProject: (proj: any) => void;
  onDeleteSubCategory: (id: Id<'projectSubCategories'>) => void;
  onDeleteProject: (id: Id<'projects'>) => void;
  onOpenAction: (config: any) => void;
  userId: Id<'users'> | null;
}) => {
  const { t } = useTranslation();
  const projects = useOfflineQuery<any[]>('projects.getProjectsBySubCategory', api.projects.getProjectsBySubCategory, { subCategoryId });
  const allTodos = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : 'skip');
  const sub = useOfflineQuery<any>('projects.getSubCategory', api.projects.getSubCategory, { id: subCategoryId });

  if (!projects) return <View style={styles.emptyContainer}><Ionicons name="hourglass-outline" size={40} color={colors.border} /></View>;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, marginTop: 4 }}>
        <Text style={[styles.sectionLabel, { paddingHorizontal: 0, marginBottom: 0 }]}>Projects in {subCategoryName}</Text>
        <TouchableOpacity
           onPress={() => onOpenAction({
             title: subCategoryName,
             options: [
               {
                 label: t.edit || 'Edit',
                 icon: 'create-outline',
                 onPress: () => sub && onEditSubCategory(sub)
               },
               {
                 label: t.share || 'Share',
                 icon: 'share-social-outline',
                 onPress: () => Share.share({ message: `Sub-Category: ${subCategoryName}` })
               },
               {
                 label: t.delete || 'Delete',
                 icon: 'trash-outline',
                 variant: 'destructive',
                 onPress: () => {
                   Alert.alert(
                     t.confirmDeleteTitle || "Confirm Delete",
                     t.confirmDeleteSubCategory || "Are you sure you want to delete this sub-category and all its child projects?",
                     [
                       { text: t.cancel || "Cancel", style: "cancel" },
                       { text: t.delete || "Delete", style: "destructive", onPress: () => onDeleteSubCategory(subCategoryId) }
                     ]
                   );
                 }
               }
             ]
           })}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={[styles.projectsGrid, { paddingHorizontal: 20 }]}>
        {projects.map((project, i) => {
          const linked = allTodos?.filter((t: any) => t.projectId === project._id) || [];
          const doneCount = linked.filter((t: any) => t.status === 'done').length;
          const totalCount = linked.length;
          const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
          const previewItems = linked.slice(0, 3).map((t: any) => ({
            text: t.text,
            isCompleted: t.status === 'done',
          }));

          return (
            <Reanimated.View key={project._id} entering={FadeInDown.duration(450).delay(i * 50)} style={{ width: '48%' }}>
              <ProjectFolderCard
                id={project._id}
                name={project.name}
                color={project.color}
                icon={project.icon || 'folder-outline'}
                tag={subCategoryName}
                itemCount={totalCount}
                doneCount={doneCount}
                progressPct={pct}
                previewItems={previewItems}
                index={i}
                onPress={() => onSelectProject(project._id, project.name)}
                onMenuPress={() => onOpenAction({
                  title: project.name,
                  options: [
                    { label: t.edit || 'Edit', icon: 'create-outline', onPress: () => onEditProject(project) },
                    { label: t.share || 'Share', icon: 'share-social-outline', onPress: () => Share.share({ message: `Project: ${project.name}` }) },
                    {
                      label: t.delete || 'Delete',
                      icon: 'trash-outline',
                      variant: 'destructive',
                      onPress: () => {
                        Alert.alert(
                          t.confirmDeleteTitle || "Confirm Delete",
                          t.confirmDeleteProject || "Are you sure you want to delete this project and unlink all its tasks?",
                          [
                            { text: t.cancel || "Cancel", style: "cancel" },
                            { text: t.delete || "Delete", style: "destructive", onPress: () => onDeleteProject(project._id) }
                          ]
                        );
                      }
                    }
                  ]
                })}
              />
            </Reanimated.View>
          );
        })}

        <Reanimated.View entering={FadeInDown.duration(450).delay(projects.length * 50)} style={{ width: '48%' }}>
          <AddProjectFolderCard onPress={onAddProject} />
        </Reanimated.View>
      </View>
    </ScrollView>
  );
};

// ─── Layer 4: Project Detail View ───────────────────────────────────────────

const ProjectDetailView = ({ styles, colors, projectId, onDeleteProject, userId, onEditProject }: { styles: any; colors: any; projectId: Id<'projects'>, onDeleteProject: (id: Id<'projects'>) => void, userId: Id<'users'> | null, onEditProject: (proj: any) => void }) => {
  const { language } = useAuth();
  const { isArabic } = useTranslation(language);
  const project = useOfflineQuery<any>('projects.getProject', api.projects.getProject, { id: projectId });
  const linkedGoal = useOfflineQuery<any>('yearlyGoals.getGoal', api.yearlyGoals.getGoal, project?.goalId ? { id: project.goalId } : 'skip');
  const resources = useOfflineQuery<any[]>('projects.getProjectResources', api.projects.getProjectResources, { projectId });
  const checklists = useOfflineQuery<any[]>('projects.getChecklists', api.projects.getChecklists, { projectId });
  const linkedTodos = useOfflineQuery<any[]>('projects.getTodosByProject', api.projects.getTodosByProject, project ? { projectId: project._id } : 'skip');
  
  const addResource = useOfflineMutation(api.projects.addResource, 'projects:addResource');
  const deleteResource = useOfflineMutation(api.projects.deleteResource, 'projects:deleteResource');
  const updateTodoStatus = useOfflineMutation(api.todos.updateStatus, 'todos:updateStatus');
  const updateProject = useOfflineMutation(api.projects.updateProject, 'projects:updateProject');
  const linkProjectToGoal = useOfflineMutation(api.projects.linkProjectToGoal, 'projects:linkProjectToGoal');
  const addCheckItem = useOfflineMutation(api.projects.addChecklistItem, 'projects:addChecklistItem');
  const toggleCheckItem = useOfflineMutation(api.projects.toggleChecklistItem, 'projects:toggleChecklistItem');
  const deleteCheckItem = useOfflineMutation(api.projects.deleteChecklistItem, 'projects:deleteChecklistItem');
  const deleteTodoMutation = useOfflineMutation(api.todos.deleteTodo, 'todos:deleteTodo');
  const addTodoMutation = useOfflineMutation(api.todos.addTodo, 'todos:addTodo');
  const setTimerMutation = useOfflineMutation(api.todos.setTimer, 'todos:setTimer');
  const linkTodoProjectMutation = useOfflineMutation(api.todos.linkTask, 'todos:linkTask');

  const [isGoalPickerVisible, setIsGoalPickerVisible] = useState(false);

  const [tasksOpen, setTasksOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descText, setDescText] = useState('');

  const [newCheckItem, setNewCheckItem] = useState('');
  const [isAddingCheck, setIsAddingCheck] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [isTimerModalVisible, setTimerModalVisible] = useState(false);
  const [isProjectModalVisible, setProjectModalVisible] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<Id<"todos"> | null>(null);

  const [expandedTodoId, setExpandedTodoId] = useState<Id<"todos"> | null>(null);

  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [actionConfig, setActionConfig] = useState<{
    title: string,
    options: any[],
    type?: 'project' | 'task' | 'resource'
  } | null>(null);

  const homeStyles = createHomeStyles(colors);

  // Persist and restore checklist/tasks open state per project
  useEffect(() => {
    if (!projectId) return;
    const loadStates = async () => {
      try {
        const tasksKey = `project_${projectId}_tasksOpen`;
        const checklistKey = `project_${projectId}_checklistOpen`;
        const [tasksVal, checklistVal] = await Promise.all([
          AsyncStorage.getItem(tasksKey),
          AsyncStorage.getItem(checklistKey),
        ]);
        if (tasksVal !== null) setTasksOpen(JSON.parse(tasksVal));
        if (checklistVal !== null) setChecklistOpen(JSON.parse(checklistVal));
      } catch {
        // ignore storage errors, keep defaults (closed)
      }
    };
    loadStates();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    AsyncStorage.setItem(`project_${projectId}_tasksOpen`, JSON.stringify(tasksOpen)).catch(() => {});
  }, [tasksOpen, projectId]);

  useEffect(() => {
    if (!projectId) return;
    AsyncStorage.setItem(`project_${projectId}_checklistOpen`, JSON.stringify(checklistOpen)).catch(() => {});
  }, [checklistOpen, projectId]);

  useEffect(() => {
    if (project?.description) setDescText(project.description);
    else setDescText('');
  }, [project?._id, project?.description]);

  if (!project) return <View style={styles.emptyContainer}><Ionicons name="hourglass-outline" size={40} color={colors.border} /></View>;

  const handleSaveDesc = () => {
    if (!project) return;
    updateProject({ id: project._id, description: descText });
    setEditingDesc(false);
  };

  const handleAddCheckItem = () => {
    if (!newCheckItem.trim() || !userId) return;
    addCheckItem({ userId, projectId, text: newCheckItem.trim() });
    setNewCheckItem('');
    setIsAddingCheck(false);
  };

  const handleAddTask = () => {
    if (!newTaskText.trim() || !userId) return;
    addTodoMutation({
      userId,
      text: newTaskText.trim(),
      date: Date.now(),
      status: 'not_started',
      projectId,
    });
    setNewTaskText('');
    setIsAddingTask(false);
  };

  const todos = linkedTodos || [];
  const items = checklists || [];
  
  const doneTodos = todos.filter(t => t.status === 'done').length;
  const doneItems = items.filter(i => i.isCompleted).length;
  
  const totalWeight = todos.length + items.length;
  const totalDone = doneTodos + doneItems;
  const pct = totalWeight > 0 ? Math.round((totalDone / totalWeight) * 100) : 0;
  
  const sc = getStatusColor(project.status, colors);

  return (
    <>
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.detailHero, { backgroundColor: colors.surface, shadowColor: project.color }]}>
          <View style={styles.detailHeroTop}>
            <View style={[styles.detailIconWrap, { backgroundColor: project.color + '22' }]}><Ionicons name={project.icon as any} size={32} color={project.color} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailHeroTitle}>{project.name}</Text>
              <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <View style={[styles.detailHeroStatus, { backgroundColor: sc.bg }]}><Text style={[styles.detailHeroStatusText, { color: sc.text }]}>{project.status || 'active'}</Text></View>
                
                {linkedGoal ? (
                  <TouchableOpacity
                    onPress={() => setIsGoalPickerVisible(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#8B5CF620',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#8B5CF640',
                    }}
                  >
                    <Ionicons name="flag" size={11} color="#8B5CF6" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B5CF6' }} numberOfLines={1}>
                      {linkedGoal.title}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setIsGoalPickerVisible(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: colors.surface,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderStyle: 'dashed',
                    }}
                  >
                    <Ionicons name="flag-outline" size={11} color={colors.textMuted} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
                      {isArabic ? '+ هدف' : '+ Goal'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setActionConfig({
                  title: project.name,
                  type: 'project',
                  options: [
                    {
                      label: isArabic ? 'تعديل المشروع' : 'Edit Project',
                      icon: 'create-outline',
                      onPress: () => onEditProject(project)
                    },
                    {
                      label: isArabic ? 'تعديل الوصف' : 'Edit Description',
                      icon: 'document-text-outline',
                      onPress: () => setEditingDesc(true)
                    },
                    {
                      label: isArabic ? 'مشاركة المشروع' : 'Share Project',
                      icon: 'share-social-outline',
                      onPress: () => Share.share({ message: `Project: ${project.name}\n${project.description || ''}` })
                    },
                    {
                      label: isArabic ? 'حذف المشروع' : 'Delete Project',
                      icon: 'trash-outline',
                      variant: 'destructive',
                      onPress: () => onDeleteProject(project._id)
                    }
                  ]
                });
                setActionModalVisible(true);
              }}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.detailProgressTrack}><View style={[styles.detailProgressFill, { width: `${pct}%`, backgroundColor: project.color }]} /></View>
          <View style={styles.detailProgressRow}>
            <Text style={styles.detailProgressLabel}>{totalDone} / {totalWeight} units done</Text>
            <Text style={[styles.detailProgressPct, { color: project.color }]}>{pct}%</Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <View style={[styles.detailSectionHeader, { marginBottom: 4 }]}>
            <Text style={[styles.detailSectionTitle, { marginBottom: 0 }]}>Description</Text>
            {!editingDesc ? (
              <TouchableOpacity onPress={() => setEditingDesc(true)}>
                <Text style={styles.detailSectionAction}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleSaveDesc}>
                <Text style={[styles.detailSectionAction, styles.detailSectionActionSuccess]}>Save</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.descriptionBox, { marginTop: 8 }]}>
            {editingDesc ? (
              <TextInput
                style={styles.descriptionInput}
                value={descText}
                onChangeText={setDescText}
                multiline
                autoFocus
                placeholder="Add a description..."
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <Text style={project.description ? styles.descriptionText : styles.descriptionPlaceholder}>
                {project.description || 'No description yet...'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.detailSection}>
           <TouchableOpacity style={styles.tasksToggle} onPress={() => setChecklistOpen(!checklistOpen)}>
              <Text style={styles.tasksToggleText}>Checklist</Text>
              <Ionicons name={checklistOpen ? "chevron-down" : "chevron-forward"} size={20} color={colors.textMuted} />
           </TouchableOpacity>
           {checklistOpen && (
             <View style={styles.checklistContainer}>
                {items.map(item => (
                  <View key={item._id} style={styles.checklistItem}>
                     <TouchableOpacity onPress={() => toggleCheckItem({ id: item._id })}>
                        <Ionicons 
                          name={item.isCompleted ? "checkbox" : "square-outline"} 
                          size={22} 
                          color={item.isCompleted ? colors.success : colors.border} 
                        />
                     </TouchableOpacity>
                     <Text style={[styles.checklistText, item.isCompleted && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                        {item.text}
                     </Text>
                     <TouchableOpacity onPress={() => deleteCheckItem({ id: item._id })}>
                        <Ionicons name="close" size={18} color={colors.danger} />
                     </TouchableOpacity>
                  </View>
                ))}
                {isAddingCheck ? (
                  <View style={styles.checklistAddRow}>
                    <Ionicons name="square-outline" size={20} color={colors.border} />
                    <TextInput 
                      style={styles.checklistInput} 
                      placeholder="Add checklist item..." 
                      placeholderTextColor={colors.textMuted}
                      value={newCheckItem}
                      onChangeText={setNewCheckItem}
                      onSubmitEditing={handleAddCheckItem}
                      autoFocus
                      onBlur={() => {
                        if (!newCheckItem.trim()) setIsAddingCheck(false);
                      }}
                    />
                    <TouchableOpacity onPress={handleAddCheckItem}>
                        <Ionicons name="arrow-up-circle" size={28} color={newCheckItem.trim() ? colors.primary : colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.checklistAddButton} onPress={() => setIsAddingCheck(true)}>
                    <Ionicons name="add" size={20} color={colors.primary} />
                    <Text style={styles.checklistAddButtonText}>Add checklist item</Text>
                  </TouchableOpacity>
                )}
             </View>
           )}
        </View>

        <View style={styles.detailSection}>
           <TouchableOpacity style={styles.tasksToggle} onPress={() => setTasksOpen(!tasksOpen)}>
              <Text style={styles.tasksToggleText}>Tasks</Text>
              <Ionicons name={tasksOpen ? "chevron-down" : "chevron-forward"} size={20} color={colors.textMuted} />
           </TouchableOpacity>
           {tasksOpen && (
             <View style={{ marginTop: 16 }}>
                {todos.map((t) => {
                   const isExpanded = expandedTodoId === t._id;
                   
                   if (isExpanded) {
                     return (
                       <View key={t._id} style={{ marginBottom: 16, width: '92%', alignSelf: 'center' }}>
                         <TodoCard 
                           todo={{ ...t, status: t.status || 'not_started' }} 
                           homeStyles={homeStyles}
                           onSetTimer={(id) => { setSelectedTodoId(id); setTimerModalVisible(true); }} 
                           onLongPress={(id) => {
                              setActionConfig({
                                title: t.taskOptions || (isArabic ? 'خيارات المهمة' : 'Task Options'),
                                type: 'task',
                                options: [
                                  { label: isArabic ? 'تعديل' : 'Edit', icon: 'create-outline', onPress: () => { setSelectedTodoId(t._id); setTimerModalVisible(true); } },
                                  { label: isArabic ? 'مشاركة' : 'Share', icon: 'share-social-outline', onPress: () => Share.share({ message: t.text }) },
                                  { label: isArabic ? 'حذف' : 'Delete', icon: 'trash-outline', variant: 'destructive', onPress: () => deleteTodoMutation({ id: t._id }) }
                                ]
                              });
                              setActionModalVisible(true);
                            }} 
                           onLinkProject={(id) => { setSelectedTodoId(id); setProjectModalVisible(true); }}
                         />
                         <TouchableOpacity 
                           style={{ 
                             alignSelf: 'center', 
                             marginTop: -10, 
                             backgroundColor: colors.surface, 
                             borderRadius: 20, 
                             padding: 4,
                             borderWidth: 1,
                             borderColor: colors.border,
                             zIndex: 10
                           }}
                           onPress={() => setExpandedTodoId(null)}
                         >
                           <Ionicons name="chevron-up" size={18} color={colors.textMuted} />
                         </TouchableOpacity>
                       </View>
                     );
                   }

                   return (
                     <TouchableOpacity 
                       key={t._id} 
                       style={styles.taskItem}
                       onPress={() => setExpandedTodoId(t._id)}
                       activeOpacity={0.7}
                     >
                        <TouchableOpacity 
                          onPress={() => updateTodoStatus({ 
                            id: t._id, 
                            status: t.status === 'done' ? 'not_started' : 'done' 
                          })}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                           <Ionicons 
                             name={t.status === 'done' ? "checkmark-circle" : "ellipse-outline"} 
                             size={22} 
                             color={t.status === 'done' ? colors.success : colors.border} 
                           />
                        </TouchableOpacity>
                        <Text style={[
                          styles.taskItemText, 
                          t.status === 'done' && { textDecorationLine: 'line-through', color: colors.textMuted, opacity: 0.6 }
                        ]}>
                           {t.text}
                        </Text>
                        <Ionicons name="create-outline" size={16} color={colors.textMuted} style={{ opacity: 0.5 }} />
                     </TouchableOpacity>
                   );
                })}
                {isAddingTask ? (
                  <View style={styles.checklistAddRow}>
                    <Ionicons name="ellipse-outline" size={20} color={colors.border} />
                    <TextInput 
                      style={styles.checklistInput} 
                      placeholder="Add a task..." 
                      placeholderTextColor={colors.textMuted}
                      value={newTaskText}
                      onChangeText={setNewTaskText}
                      onSubmitEditing={handleAddTask}
                      autoFocus
                      onBlur={() => {
                        if (!newTaskText.trim()) setIsAddingTask(false);
                      }}
                    />
                    <TouchableOpacity onPress={handleAddTask}>
                      <Ionicons name="arrow-up-circle" size={28} color={newTaskText.trim() ? colors.primary : colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.checklistAddButton} onPress={() => setIsAddingTask(true)}>
                    <Ionicons name="add" size={20} color={colors.primary} />
                    <Text style={styles.checklistAddButtonText}>Add a task</Text>
                  </TouchableOpacity>
                )}
             </View>
           )}
        </View>

        <View style={styles.detailSection}>
          <View style={styles.detailSectionHeader}>
            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="folder-open-outline" size={17} color={colors.primary} />
              <Text style={styles.detailSectionTitle}>
                {isArabic ? 'الموارد والملفات' : 'Resources & Files'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowAddResource(true)}>
              <Text style={styles.detailSectionAction}>
                {isArabic ? '+ إضافة' : '+ Add'}
              </Text>
            </TouchableOpacity>
          </View>

          {(!resources || resources.length === 0) ? (
            <TouchableOpacity
              style={styles.resourceEmptyBox}
              onPress={() => setShowAddResource(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload-outline" size={24} color={colors.textMuted} />
              <Text style={styles.resourceEmptyText}>
                {isArabic ? '+ أضف ملفات، صور، روابط، أو ملاحظات للمشروع' : '+ Add files, photos, web links, or notes'}
              </Text>
            </TouchableOpacity>
          ) : (
            resources.map(res => {
              const type = res.type || 'link';
              let iconName: any = 'globe-outline';
              let typeColor = '#A78BFA';
              let typeBg = 'rgba(167, 139, 250, 0.15)';
              let typeLabel = isArabic ? 'رابط' : 'LINK';

              if (type === 'file') {
                iconName = 'document-text-outline';
                typeColor = '#3B82F6';
                typeBg = 'rgba(59, 130, 246, 0.15)';
                typeLabel = isArabic ? 'ملف' : 'FILE';
              } else if (type === 'image') {
                iconName = 'image-outline';
                typeColor = '#10B981';
                typeBg = 'rgba(16, 185, 129, 0.15)';
                typeLabel = isArabic ? 'صورة' : 'PHOTO';
              } else if (type === 'note') {
                iconName = 'reader-outline';
                typeColor = '#F59E0B';
                typeBg = 'rgba(245, 158, 11, 0.15)';
                typeLabel = isArabic ? 'ملاحظة' : 'NOTE';
              }

              const handleOpenResource = () => {
                if (res.url) {
                  if (res.url.startsWith('http://') || res.url.startsWith('https://')) {
                    WebBrowser.openBrowserAsync(res.url).catch(() => {
                      if (res.url) Linking.openURL(res.url);
                    });
                  } else {
                    Linking.openURL(res.url).catch(() => {
                      Share.share({ url: res.url, message: res.title });
                    });
                  }
                } else if (res.note) {
                  Alert.alert(res.title, res.note);
                }
              };

              return (
                <TouchableOpacity
                  key={res._id}
                  style={styles.resourceCard}
                  onPress={handleOpenResource}
                  activeOpacity={0.78}
                >
                  <View style={[styles.resourceIconBadge, { backgroundColor: typeBg }]}>
                    <Ionicons name={iconName} size={22} color={typeColor} />
                  </View>
                  <View style={styles.resourceInfo}>
                    <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.resourceTypeBadge, { backgroundColor: typeBg }]}>
                        <Text style={[styles.resourceTypeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.resourceTitle} numberOfLines={1}>{res.title}</Text>
                    <Text style={styles.resourceUrl} numberOfLines={1}>
                      {res.url || res.note || (isArabic ? 'لا توجد تفاصيل' : 'No details')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setActionConfig({
                        title: res.title,
                        type: 'resource',
                        options: [
                          {
                            label: isArabic ? 'فتح المورد' : 'Open / View',
                            icon: 'open-outline',
                            onPress: handleOpenResource,
                          },
                          {
                            label: isArabic ? 'مشاركة' : 'Share',
                            icon: 'share-social-outline',
                            onPress: () => Share.share({
                              message: res.url ? `${res.title}\n${res.url}` : `${res.title}\n${res.note || ''}`,
                              url: res.url,
                            }),
                          },
                          {
                            label: isArabic ? 'حذف المورد' : 'Delete',
                            icon: 'trash-outline',
                            variant: 'destructive',
                            onPress: () => deleteResource({ id: res._id }),
                          }
                        ]
                      });
                      setActionModalVisible(true);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
      <AddResourceModal visible={showAddResource} onClose={() => setShowAddResource(false)} colors={colors} styles={styles} onAdd={(type, title, url, note) => userId && addResource({ userId, projectId: project._id, type, title, url, note })} />
      
      <TimerModal 
        visible={isTimerModalVisible}
        onClose={() => { setTimerModalVisible(false); setSelectedTodoId(null); }}
        onSave={(ms, due, dt) => { if (selectedTodoId) setTimerMutation({ id: selectedTodoId, duration: ms, dueDate: due, date: dt }); }}
        initialDate={todos.find(t => t._id === selectedTodoId)?.date}
      />

      <UniversalLinkPickerModal
        visible={isProjectModalVisible}
        onClose={() => { setProjectModalVisible(false); setSelectedTodoId(null); }}
        onSelect={(selection) => { 
          if (!selectedTodoId) return;
          const currentTodo = todos.find(t => t._id === selectedTodoId);
          if (selection.type === 'none') {
            linkTodoProjectMutation({ id: selectedTodoId, categoryId: undefined, subCategoryId: undefined, projectId: undefined, goalId: undefined });
          } else if (selection.type === 'goal') {
            linkTodoProjectMutation({
              id: selectedTodoId,
              goalId: selection.goalId,
              categoryId: currentTodo?.categoryId,
              subCategoryId: currentTodo?.subCategoryId,
              projectId: currentTodo?.projectId,
            });
          } else if (selection.type === 'category') {
            linkTodoProjectMutation({
              id: selectedTodoId,
              categoryId: selection.categoryId,
              subCategoryId: undefined,
              projectId: undefined,
              goalId: currentTodo?.goalId,
            });
          } else if (selection.type === 'subCategory') {
            linkTodoProjectMutation({
              id: selectedTodoId,
              categoryId: selection.categoryId,
              subCategoryId: selection.subCategoryId,
              projectId: undefined,
              goalId: currentTodo?.goalId,
            });
          } else if (selection.type === 'project') {
            linkTodoProjectMutation({
              id: selectedTodoId,
              categoryId: undefined,
              subCategoryId: undefined,
              projectId: selection.projectId,
              goalId: currentTodo?.goalId,
            });
          }
        }}
      />

      <UniversalLinkPickerModal
        visible={isGoalPickerVisible}
        onClose={() => setIsGoalPickerVisible(false)}
        onSelect={(selection) => {
          if (selection.type === 'goal') {
            linkProjectToGoal({ projectId: project._id, goalId: selection.goalId });
          } else if (selection.type === 'none') {
            linkProjectToGoal({ projectId: project._id, goalId: undefined });
          }
          setIsGoalPickerVisible(false);
        }}
        currentGoalId={project?.goalId}
      />

      <ActionModal 
        visible={isActionModalVisible}
        onClose={() => { setActionModalVisible(false); setActionConfig(null); }}
        title={actionConfig?.title || ''}
        isArabic={isArabic}
        options={actionConfig?.options || []}
      />
    </>
  );
};

// ─── Main Projects Screen (4/5-LAYER DYNAMIC) ───────────────────────────────

type Layer = 'categories' | 'categoryDetail' | 'subCategoryProjects' | 'detail';

const Projects: React.FC = () => {
  const { colors } = useTheme();
  const { userId, language } = useAuth();
  const { isArabic } = useTranslation(language);
  const styles = React.useMemo(() => createProjectsStyles(colors, isArabic), [colors, isArabic]);
  const { showGuide, dismissGuide } = useScreenGuide('projects');

  const projectsTips: GuideTip[] = isArabic ? [
    { icon: 'folder-outline', title: 'أنشئ فئة', description: 'اضغط "+ إضافة فئة" لتنظيم مشاريعك في مجموعات.', accentColor: '#dbd4fd' },
    { icon: 'rocket-outline', title: 'أضف مشروع', description: 'ادخل أي فئة واضغط "+ مشروع" لإضافة مشروع جديد.', accentColor: '#defef9' },
    { icon: 'layers-outline', title: 'فئات فرعية', description: 'أضف فئات فرعية لتنظيم أعمق داخل كل فئة.', accentColor: '#f6e5c9' },
  ] : [
    { icon: 'folder-outline', title: 'Create a Category', description: 'Tap "+ Add Category" to organize your projects into groups.', accentColor: '#dbd4fd' },
    { icon: 'rocket-outline', title: 'Add a Project', description: 'Enter any category and tap "+ Add" to create a new project.', accentColor: '#defef9' },
    { icon: 'layers-outline', title: 'Sub-Categories', description: 'Add sub-categories for deeper organization inside each category.', accentColor: '#f6e5c9' },
  ];

  const [layer, setLayer] = useState<Layer>('categories');
  const [selectedCatId, setSelectedCatId] = useState<Id<'projectCategories'> | null>(null);
  const [selectedCatName, setSelectedCatName] = useState('');
  const [selectedSubId, setSelectedSubId] = useState<Id<'projectSubCategories'> | null>(null);
  const [selectedSubName, setSelectedSubName] = useState('');
  const [selectedProjId, setSelectedProjId] = useState<Id<'projects'> | null>(null);
  const [selectedProjName, setSelectedProjName] = useState('');

  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [actionConfig, setActionConfig] = useState<{ title: string, options: any[] } | null>(null);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingSubCategory, setIsAddingSubCategory] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: Id<'projectCategories'>, name: string, icon: string, color: string, tag?: string } | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<{ id: Id<'projectSubCategories'>, name: string, icon: string, color: string } | null>(null);
  const [editingProject, setEditingProject] = useState<{ id: Id<'projects'>, name: string, description?: string, icon: string, color: string } | null>(null);

  const addCategory = useOfflineMutation(api.projects.addCategory, 'projects:addCategory');
  const updateCategory = useOfflineMutation(api.projects.updateCategory, 'projects:updateCategory');
  const deleteCategory = useOfflineMutation(api.projects.deleteCategory, 'projects:deleteCategory');
  const addSubCategory = useOfflineMutation(api.projects.addSubCategory, 'projects:addSubCategory');
  const updateSubCategory = useOfflineMutation(api.projects.updateSubCategory, 'projects:updateSubCategory');
  const deleteSubCategory = useOfflineMutation(api.projects.deleteSubCategory, 'projects:deleteSubCategory');
  const addProject = useOfflineMutation(api.projects.addProject, 'projects:addProject');
  const updateProject = useOfflineMutation(api.projects.updateProject, 'projects:updateProject');
  const deleteProject = useOfflineMutation(api.projects.deleteProject, 'projects:deleteProject');

  const handleBack = () => {
    if (layer === 'detail') {
      setLayer(selectedSubId ? 'subCategoryProjects' : 'categoryDetail');
      setSelectedProjId(null);
      setSelectedProjName('');
      return true;
    } else if (layer === 'subCategoryProjects') {
      setLayer('categoryDetail');
      setSelectedSubId(null);
      return true;
    } else if (layer === 'categoryDetail') {
      setLayer('categories');
      setSelectedCatId(null);
      return true;
    }
    return false;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBack
    );
    return () => backHandler.remove();
  }, [layer, selectedSubId]);

  const getTitle = () => {
    if (layer === 'categories') return 'Spaces';
    if (layer === 'categoryDetail') return selectedCatName;
    if (layer === 'subCategoryProjects') return selectedSubName;
    return selectedProjName || (isArabic ? 'تفاصيل المشروع' : 'Project Details');
  };

  const handleAddCategory = (name: string, icon: string, color: string, tag: string) => {
    if (!userId) return;
    if (editingCategory) updateCategory({ id: editingCategory.id, name, icon, color, tag: tag || undefined });
    else addCategory({ userId, name, icon, color, tag: tag || undefined });
    setIsAddingCategory(false);
    setEditingCategory(null);
  };

  const handleAddSubCategory = (name: string, icon: string, color: string) => {
    if (!userId || !selectedCatId) return;
    if (editingSubCategory) updateSubCategory({ id: editingSubCategory.id, name, icon, color });
    else addSubCategory({ userId, categoryId: selectedCatId, name, icon, color });
    setIsAddingSubCategory(false);
    setEditingSubCategory(null);
  };

  const handleAddProject = (name: string, description: string, icon: string, color: string) => {
    if (!userId) return;
    if (editingProject) updateProject({ id: editingProject.id, name, description, icon, color });
    else if (selectedSubId) addProject({ userId, subCategoryId: selectedSubId, name, description, icon, color });
    else if (selectedCatId) addProject({ userId, categoryId: selectedCatId, name, description, icon, color });
    setIsAddingProject(false);
    setEditingProject(null);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
      <SafeAreaView style={styles.safeArea}>
        <AnimatedWavyHeader backgroundColor={colors.bg} waveHeight={10} contentStyle={{ paddingBottom: 2 }}>
          {layer === 'categories' ? (
            <View style={[styles.header, { paddingBottom: 6 }]}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle} numberOfLines={1}>{getTitle()}</Text>
                <Text style={styles.headerSubtitle}>{isArabic ? 'إدارة مساحات العمل' : 'Manage your workspaces'}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => setIsAddingCategory(true)}>
                  <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.header, { paddingBottom: 6, flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <TouchableOpacity onPress={handleBack} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={22} color={colors.primary} />
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { textAlign: 'center', flex: 1, fontSize: 20, marginHorizontal: 8 }]} numberOfLines={1}>
                {getTitle()}
              </Text>

              {layer === 'categoryDetail' && selectedCatId ? (
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => {
                    setActionConfig({
                      title: selectedCatName,
                      options: [
                        {
                          label: isArabic ? 'تعديل الفئة' : 'Edit Space',
                          icon: 'create-outline',
                          onPress: () => setEditingCategory({ id: selectedCatId, name: selectedCatName, icon: 'briefcase-outline', color: '#dbd4fd' })
                        },
                        {
                          label: isArabic ? 'مشاركة الفئة' : 'Share Space',
                          icon: 'share-social-outline',
                          onPress: () => Share.share({ message: `Space: ${selectedCatName}` })
                        },
                        {
                          label: isArabic ? 'حذف الفئة' : 'Delete Space',
                          icon: 'trash-outline',
                          variant: 'destructive',
                          onPress: () => {
                            Alert.alert(
                              isArabic ? "تأكيد الحذف" : "Confirm Delete",
                              isArabic ? "هل أنت متأكد من حذف هذه المساحة وجميع المشاريع بداخلها؟" : "Are you sure you want to delete this space and all its projects?",
                              [
                                { text: isArabic ? "إلغاء" : "Cancel", style: "cancel" },
                                { text: isArabic ? "حذف" : "Delete", style: "destructive", onPress: () => { deleteCategory({ id: selectedCatId }); setLayer('categories'); setSelectedCatId(null); } }
                              ]
                            );
                          }
                        }
                      ]
                    });
                    setActionModalVisible(true);
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 42, height: 42 }} />
              )}
            </View>
          )}
        </AnimatedWavyHeader>


        {layer === 'categories' && (
          <CategoriesView 
            styles={styles} colors={colors} userId={userId} isArabic={isArabic}
            onAddCategory={() => setIsAddingCategory(true)} 
            onEditCategory={(cat) => { setEditingCategory({ id: cat._id, name: cat.name, icon: cat.icon, color: cat.color, tag: cat.tag }); setIsAddingCategory(true); }}
            onSelectCategory={(id, name) => { setSelectedCatId(id); setSelectedCatName(name); setLayer('categoryDetail'); }} 
            onOpenAction={(config) => { setActionConfig(config); setActionModalVisible(true); }} 
          />
        )}
        
        {layer === 'categoryDetail' && selectedCatId && (
          <CategoryDetailView 
            styles={styles} colors={colors} categoryId={selectedCatId} categoryName={selectedCatName} userId={userId} isArabic={isArabic}
            onSelectProject={(id, name) => { setSelectedProjId(id); setSelectedProjName(name || ''); setLayer('detail'); }}
            onAddProject={() => setIsAddingProject(true)}
            onEditCategory={(cat) => { setEditingCategory({ id: cat._id, name: cat.name, icon: cat.icon, color: cat.color, tag: cat.tag }); setIsAddingCategory(true); }}
            onEditProject={(proj) => { setEditingProject({ id: proj._id, name: proj.name, description: proj.description, icon: proj.icon, color: proj.color }); setIsAddingProject(true); }}
            onDeleteCategory={(id) => {
              deleteCategory({ id });
              setLayer('categories');
              setSelectedCatId(null);
            }}
            onDeleteProject={(id) => {
               deleteProject({ id });
            }}
            onOpenAction={(config) => { setActionConfig(config); setActionModalVisible(true); }}
          />
        )}

        {layer === 'subCategoryProjects' && selectedSubId && (
          <SubCategoryProjectsView 
            styles={styles} colors={colors} subCategoryId={selectedSubId} subCategoryName={selectedSubName} userId={userId}
            onSelectProject={(id, name) => { setSelectedProjId(id); setSelectedProjName(name || ''); setLayer('detail'); }}
            onAddProject={() => setIsAddingProject(true)}
            onEditSubCategory={(sub) => { setEditingSubCategory({ id: sub._id, name: sub.name, icon: sub.icon, color: sub.color }); setIsAddingSubCategory(true); }}
            onEditProject={(proj) => { setEditingProject({ id: proj._id, name: proj.name, description: proj.description, icon: proj.icon, color: proj.color }); setIsAddingProject(true); }}
            onDeleteSubCategory={(id) => {
               deleteSubCategory({ id });
               setLayer('categoryDetail');
               setSelectedSubId(null);
            }}
            onDeleteProject={(id) => {
               deleteProject({ id });
            }}
            onOpenAction={(config) => { setActionConfig(config); setActionModalVisible(true); }}
          />
        )}

        {layer === 'detail' && selectedProjId && (
          <ProjectDetailView 
            styles={styles} colors={colors} projectId={selectedProjId} userId={userId}
            onEditProject={(proj) => { setEditingProject({ id: proj._id, name: proj.name, description: proj.description, icon: proj.icon, color: proj.color }); setIsAddingProject(true); }}
            onDeleteProject={(id) => {
               deleteProject({ id });
               setLayer(selectedSubId ? 'subCategoryProjects' : 'categoryDetail');
               setSelectedProjId(null);
            }}
          />
        )}

      </SafeAreaView>

      <AddCategoryModal 
        visible={isAddingCategory} 
        onClose={() => { setIsAddingCategory(false); setEditingCategory(null); }} 
        colors={colors} styles={styles} 
        onAdd={handleAddCategory} 
        initialData={editingCategory || undefined}
      />
      {selectedCatId && (
        <AddSubCategoryModal 
          visible={isAddingSubCategory} 
          onClose={() => { setIsAddingSubCategory(false); setEditingSubCategory(null); }} 
          colors={colors} styles={styles} 
          onAdd={handleAddSubCategory} 
          initialData={editingSubCategory || undefined}
        />
      )}
      {(selectedCatId || selectedSubId) && (
        <AddProjectModal 
          visible={isAddingProject} 
          onClose={() => { setIsAddingProject(false); setEditingProject(null); }} 
          colors={colors} styles={styles}
          onAdd={handleAddProject}
          initialData={editingProject || undefined}
        />
      )}

      <ActionModal 
        visible={isActionModalVisible}
        onClose={() => { setActionModalVisible(false); setActionConfig(null); }}
        title={actionConfig?.title || ''}
        isArabic={isArabic}
        options={actionConfig?.options || []}
      />

      <ScreenGuide visible={showGuide} tips={projectsTips} onDismiss={dismissGuide} isArabic={isArabic} />
    </KeyboardAvoidingView>
  );
};

export default Projects;
