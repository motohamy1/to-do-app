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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import { createProjectsStyles } from '@/assets/styles/projects.styles';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import TodoInput from '@/components/TodoInput';
import TodoCard from '@/components/TodoCard';
import ActionModal from '@/components/ActionModal';
import TimerModal from '@/components/TimerModal';
import ProjectPickerModal from '@/components/ProjectPickerModal';
import { createHomeStyles } from '@/assets/styles/home.styles';
import { useScreenGuide } from '@/hooks/useScreenGuide';
import ScreenGuide from '@/components/ScreenGuide';
import type { GuideTip } from '@/components/ScreenGuide';

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

const ACCENT_COLORS = [
  '#7C5CFF', '#FF6B6B', '#4ECDC4', '#FFD93D',
  '#6BCB77', '#FF9500', '#47A3FF', '#FF2D55',
  '#AF52DE', '#00C58E', '#FF6D00', '#007AFF',
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688',
  '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B',
];

const RESOURCE_TYPES: { key: string; label: string; icon: string; color: string }[] = [
  { key: 'link',  label: 'Link',  icon: 'link-outline',          color: '#47A3FF' },
  { key: 'video', label: 'Video', icon: 'videocam-outline',       color: '#FF6B6B' },
  { key: 'image', label: 'Image', icon: 'image-outline',          color: '#00C58E' },
  { key: 'note',  label: 'Note',  icon: 'document-text-outline',  color: '#FFD93D' },
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
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{initialData ? 'Edit Sub-Category' : 'New Sub-Category'}</Text>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Frontend, Cardiology, Sci-Fi..." placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoFocus />
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
    </Modal>
  );
};

const AddCategoryModal = ({ visible, onClose, colors, styles, onAdd, initialData }: {
  visible: boolean; onClose: () => void; colors: any; styles: any;
  onAdd: (name: string, icon: string, color: string) => void;
  initialData?: { name: string; icon: string; color: string; id: Id<'projectCategories'> };
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[0]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setIcon(initialData.icon);
      setColor(initialData.color);
    } else {
      setName('');
      setIcon(CATEGORY_ICONS[0]);
      setColor(ACCENT_COLORS[0]);
    }
  }, [initialData, visible]);

  const handleAdd = () => { if (!name.trim()) return; onAdd(name.trim(), icon, color); setName(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{initialData ? 'Edit Category' : 'New Category'}</Text>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Programming, Medicine…" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoFocus />
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
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{initialData ? 'Edit Project' : 'New Project'}</Text>
            <Text style={styles.modalLabel}>Project Name</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Todo App, Research Paper…" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoFocus />
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
    </Modal>
  );
};

const AddResourceModal = ({ visible, onClose, colors, styles, onAdd }: {
  visible: boolean; onClose: () => void; colors: any; styles: any;
  onAdd: (type: string, title: string, url?: string, note?: string) => void;
}) => {
  const [resType, setResType] = useState('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const handleAdd = () => { if (!title.trim()) return; onAdd(resType, title.trim(), url.trim() || undefined, note.trim() || undefined); setTitle(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Resource</Text>
            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.addResourceTypeRow}>
              {RESOURCE_TYPES.map(rt => (
                <TouchableOpacity key={rt.key} style={[styles.resourceTypeBtn, resType === rt.key && styles.resourceTypeBtnSelected]} onPress={() => setResType(rt.key)}>
                  <Ionicons name={rt.icon as any} size={20} color={resType === rt.key ? colors.primary : colors.textMuted} />
                  <Text style={[styles.resourceTypeBtnText, resType === rt.key && styles.resourceTypeBtnTextSelected]}>{rt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Title</Text>
            <TextInput style={styles.modalInput} placeholder="Resource title…" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleAdd}><Text style={styles.modalPrimaryBtnText}>Add Resource</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose}><Text style={styles.modalSecondaryBtnText}>Cancel</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Layer 1: Categories View (Full Width) ───────────────────────────────────

const CategoriesView = ({ styles, colors, onSelectCategory, onAddCategory, onEditCategory, onOpenAction, userId }: {
  styles: any; colors: any;
  onSelectCategory: (id: Id<'projectCategories'>, name: string, color: string) => void;
  onAddCategory: () => void;
  onEditCategory: (cat: any) => void;
  onOpenAction: (config: any) => void;
  userId: Id<'users'> | null;
}) => {
  const categories = useOfflineQuery<any[]>('projects.getCategories', api.projects.getCategories, userId ? { userId } : 'skip');
  const deleteCategory = useMutation(api.projects.deleteCategory);
  if (!categories) return <View style={styles.emptyContainer}><Ionicons name="hourglass-outline" size={40} color={colors.border} /></View>;
  return (
    <ScrollView contentContainerStyle={styles.categoriesGrid} showsVerticalScrollIndicator={false}>
      {categories.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={52} color={colors.border} />
          <Text style={styles.emptyText}>No categories yet</Text>
          <Text style={styles.emptySubText}>Tap + to create your first category</Text>
        </View>
      )}
      {categories.map(cat => (
        <TouchableOpacity key={cat._id} style={[styles.categoryCard, { shadowColor: cat.color }]} onPress={() => onSelectCategory(cat._id, cat.name, cat.color)} activeOpacity={0.82}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[styles.categoryIconWrap, { backgroundColor: cat.color + '20' }]}>
              <Ionicons name={cat.icon as any} size={28} color={cat.color} />
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryCardName}>{cat.name}</Text>
              <Text style={styles.categoryCardCount}>Tap to explore</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.categoryDeleteBtn} 
            onPress={() => onOpenAction({
              title: cat.name,
              options: [
                {
                  label: 'Edit Category',
                  icon: 'create-outline',
                  onPress: () => onEditCategory(cat)
                },
                {
                  label: 'Share Category',
                  icon: 'share-social-outline',
                  onPress: () => Share.share({ message: `Check out my project category: ${cat.name}` })
                },
                {
                  label: 'Delete Category',
                  icon: 'trash-outline',
                  variant: 'destructive',
                  onPress: () => deleteCategory({ id: cat._id })
                }
              ]
            })}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
      <TouchableOpacity 
        style={[styles.categoryCard, { borderStyle: 'dashed', backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 }]} 
        onPress={onAddCategory}
      >
        <Ionicons name="add-circle-outline" size={28} color={colors.textMuted} />
        <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: '700', color: colors.textMuted }}>Add New Category</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Layer 2: Category Detail View (Sub-categories & Direct Projects) ────────

const CategoryDetailView = ({ 
  styles, colors, categoryId, categoryName, userId, onSelectSubCategory, onSelectProject, onAddSubCategory, onAddProject, onEditCategory, onEditSubCategory, onEditProject, onDeleteCategory, onDeleteSubCategory, onDeleteProject, onOpenAction 
}: { 
  styles: any; 
  colors: any; 
  categoryId: Id<'projectCategories'>; 
  categoryName: string; 
  onSelectSubCategory: (id: Id<'projectSubCategories'>, name: string) => void;
  onSelectProject: (id: Id<'projects'>) => void;
  onAddSubCategory: () => void;
  onAddProject: () => void;
  onEditCategory: (cat: any) => void;
  onEditSubCategory: (sub: any) => void;
  onEditProject: (proj: any) => void;
  onDeleteCategory: (id: Id<'projectCategories'>) => void;
  onDeleteSubCategory: (id: Id<'projectSubCategories'>) => void;
  onDeleteProject: (id: Id<'projects'>) => void;
  onOpenAction: (config: any) => void;
  userId: Id<'users'> | null;
}) => {
  const { t } = useTranslation();
  const subCategories = useOfflineQuery<any[]>('projects.getSubCategories', api.projects.getSubCategories, { categoryId });
  const directProjects = useOfflineQuery<any[]>('projects.getProjectsByCategory', api.projects.getProjectsByCategory, { categoryId });
  const allTodos = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : 'skip');

  const getProgress = (projectId: string) => {
    if (!allTodos) return { done: 0, total: 0, pct: 0 };
    const linked = allTodos.filter(t => t.projectId === projectId);
    const done = linked.filter(t => t.status === 'done').length;
    const total = linked.length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  if (!subCategories || !directProjects) return <View style={styles.emptyContainer}><Ionicons name="hourglass-outline" size={40} color={colors.border} /></View>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Category Header Actions */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
         <TouchableOpacity 
           style={[styles.headerBtn, { borderColor: colors.border }]} 
           onPress={() => onOpenAction({
             title: categoryName,
             options: [
               {
                 label: 'Edit Category',
                 icon: 'create-outline',
                 onPress: () => onEditCategory({ _id: categoryId, name: categoryName })
               },
               {
                 label: 'Share Category',
                 icon: 'share-social-outline',
                 onPress: () => Share.share({ message: `Category: ${categoryName}` })
               },
               {
                 label: t.delete || 'Delete Category',
                 icon: 'trash-outline',
                 variant: 'destructive',
                 onPress: () => {
                   Alert.alert(
                     t.confirmDeleteTitle || "Confirm Delete", 
                     "Are you sure you want to delete this category and all its contents?", 
                     [
                       { text: t.cancel || "Cancel", style: "cancel" },
                       { text: t.delete || "Delete", style: "destructive", onPress: () => onDeleteCategory(categoryId) }
                     ]
                   );
                 }
               }
             ]
           })}
         >
           <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
         </TouchableOpacity>
      </View>
      {/* Sub-categories Section */}
      <View style={styles.subCategoriesList}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.sectionLabel, { paddingHorizontal: 0, marginBottom: 0 }]}>Sub-Categories</Text>
          <TouchableOpacity onPress={onAddSubCategory}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>+ New</Text></TouchableOpacity>
        </View>
        
        {subCategories.length === 0 && (
          <View style={[styles.emptyContainer, { paddingVertical: 20 }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>No sub-categories</Text>
          </View>
        )}

        {subCategories.map(sub => (
          <TouchableOpacity 
            key={sub._id} style={styles.subCategoryCard} 
            onPress={() => onSelectSubCategory(sub._id, sub.name)}
            onLongPress={() => onOpenAction({
              title: sub.name,
              options: [
                { label: t.edit || 'Edit', icon: 'create-outline', onPress: () => onEditSubCategory(sub) },
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
                        { text: t.delete || "Delete", style: "destructive", onPress: () => onDeleteSubCategory(sub._id) }
                      ]
                    );
                  } 
                }
              ]
            })}
          >
            <View style={[styles.subCategoryIconWrap, { backgroundColor: colors.primary + '15' }]}><Ionicons name="layers-outline" size={18} color={colors.primary} /></View>
            <Text style={styles.subCategoryName}>{sub.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Direct Projects Section */}
      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.sectionLabel, { paddingHorizontal: 0, marginBottom: 0 }]}>Direct Projects</Text>
          <TouchableOpacity onPress={onAddProject}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>+ Add</Text></TouchableOpacity>
        </View>

        <View style={[styles.projectsGrid, { paddingHorizontal: 0 }]}>
          {directProjects.length === 0 && (
            <View style={[styles.emptyContainer, { width: '100%', paddingVertical: 40 }]}>
               <Text style={{ color: colors.textMuted, fontSize: 13 }}>No direct projects</Text>
            </View>
          )}

          {directProjects.map(project => {
            const { pct } = getProgress(project._id);
            return (
              <TouchableOpacity 
                key={project._id} style={[styles.projectGridCard, { shadowColor: project.color }]} 
                onPress={() => onSelectProject(project._id)}
                onLongPress={() => onOpenAction({
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
              >
                <View style={[styles.projectGridIcon, { backgroundColor: project.color + '20' }]}><Ionicons name={project.icon as any} size={24} color={project.color} /></View>
                <Text style={styles.projectGridName} numberOfLines={1}>{project.name}</Text>
                <View style={styles.projectGridFooter}>
                   <View style={styles.gridProgressBarTrack}><View style={[styles.gridProgressBarFill, { width: `${pct}%`, backgroundColor: project.color }]} /></View>
                   <Text style={styles.gridProgressText}>{pct}%</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.projectGridCard, { borderStyle: 'dashed', backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0, justifyContent: 'center', alignItems: 'center' }]}
            onPress={onAddProject}
          >
            <Ionicons name="add" size={28} color={colors.textMuted} />
            <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', color: colors.textMuted }}>Add Project</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  onSelectProject: (id: Id<'projects'>) => void;
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

  const getProgress = (projectId: string) => {
    if (!allTodos) return { pct: 0 };
    const linked = allTodos.filter(t => t.projectId === projectId);
    const done = linked.filter(t => t.status === 'done').length;
    const total = linked.length;
    return { pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  if (!projects) return <View style={styles.emptyContainer}><Ionicons name="hourglass-outline" size={40} color={colors.border} /></View>;

  return (
    <ScrollView contentContainerStyle={styles.projectsGrid} showsVerticalScrollIndicator={false}>
      <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, marginBottom: 8 }}>
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
      {projects.map(project => {
        const { pct } = getProgress(project._id);
        return (
          <TouchableOpacity 
            key={project._id} 
            style={[styles.projectGridCard, { shadowColor: project.color }]} 
            onPress={() => onSelectProject(project._id)}
            onLongPress={() => onOpenAction({
              title: project.name,
              options: [
                {
                  label: t.edit || 'Edit',
                  icon: 'create-outline',
                  onPress: () => onEditProject(project)
                },
                {
                  label: t.share || 'Share',
                  icon: 'share-social-outline',
                  onPress: () => Share.share({ message: `Project: ${project.name}` })
                },
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
          >
            <View style={[styles.projectGridIcon, { backgroundColor: project.color + '20' }]}><Ionicons name={project.icon as any} size={24} color={project.color} /></View>
            <Text style={styles.projectGridName} numberOfLines={2}>{project.name}</Text>
            <View style={styles.projectGridFooter}>
               <View style={styles.gridProgressBarTrack}><View style={[styles.gridProgressBarFill, { width: `${pct}%`, backgroundColor: project.color }]} /></View>
               <Text style={styles.gridProgressText}>{pct}% Complete</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={[styles.projectGridCard, { borderStyle: 'dashed', backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0, justifyContent: 'center', alignItems: 'center' }]} onPress={onAddProject}>
        <Ionicons name="add-circle-outline" size={32} color={colors.textMuted} /><Text style={{ marginTop: 8, fontSize: 13, fontWeight: '600', color: colors.textMuted }}>Add Project</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Layer 4: Project Detail View ───────────────────────────────────────────

const ProjectDetailView = ({ styles, colors, projectId, onDeleteProject, userId, onEditProject }: { styles: any; colors: any; projectId: Id<'projects'>, onDeleteProject: (id: Id<'projects'>) => void, userId: Id<'users'> | null, onEditProject: (proj: any) => void }) => {
  const { language } = useAuth();
  const { isArabic } = useTranslation(language);
  const project = useOfflineQuery<any>('projects.getProject', api.projects.getProject, { id: projectId });
  const resources = useOfflineQuery<any[]>('projects.getProjectResources', api.projects.getProjectResources, { projectId });
  const checklists = useOfflineQuery<any[]>('projects.getChecklists', api.projects.getChecklists, { projectId });
  const linkedTodos = useOfflineQuery<any[]>('projects.getTodosByProject', api.projects.getTodosByProject, project ? { projectId: project._id } : 'skip');
  
  const addResource = useMutation(api.projects.addResource);
  const deleteResource = useMutation(api.projects.deleteResource);
  const updateTodoStatus = useMutation(api.todos.updateStatus);
  const updateProject = useMutation(api.projects.updateProject);
  const addCheckItem = useMutation(api.projects.addChecklistItem);
  const toggleCheckItem = useMutation(api.projects.toggleChecklistItem);
  const deleteCheckItem = useMutation(api.projects.deleteChecklistItem);
  const deleteTodoMutation = useMutation(api.todos.deleteTodo);
  const setTimerMutation = useMutation(api.todos.setTimer);
  const linkTodoProjectMutation = useMutation(api.todos.linkProject);

  const [tasksOpen, setTasksOpen] = useState(true);
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descText, setDescText] = useState('');
  
  const [newCheckItem, setNewCheckItem] = useState('');
  const [isAddingCheck, setIsAddingCheck] = useState(false);
  
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
              <View style={[styles.detailHeroStatus, { backgroundColor: sc.bg }]}><Text style={[styles.detailHeroStatusText, { color: sc.text }]}>{project.status || 'active'}</Text></View>
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
                <View style={{ width: '92%', alignSelf: 'center', marginTop: 8 }}>
                   <TodoInput projectId={project._id} />
                </View>
             </View>
           )}
        </View>

        <View style={styles.detailSection}>
           <View style={styles.detailSectionHeader}>
             <Text style={styles.detailSectionTitle}>Resources</Text>
             <TouchableOpacity onPress={() => setShowAddResource(true)}><Text style={styles.detailSectionAction}>+ Add</Text></TouchableOpacity>
           </View>
           {resources?.map(res => (
             <View key={res._id} style={styles.resourceCard}>
               <Ionicons name="link" size={20} color={colors.primary} />
               <View style={styles.resourceInfo}><Text style={styles.resourceTitle}>{res.title}</Text><Text style={styles.resourceUrl} numberOfLines={1}>{res.url || res.note}</Text></View>
               <TouchableOpacity onPress={() => {
                  setActionConfig({
                    title: res.title,
                    type: 'resource',
                    options: [
                      { label: isArabic ? 'فتح الرابط' : 'Open Link', icon: 'open-outline', onPress: () => res.url && Linking.openURL(res.url) },
                      { label: isArabic ? 'حذف' : 'Delete', icon: 'trash-outline', variant: 'destructive', onPress: () => deleteResource({ id: res._id }) }
                    ]
                  });
                  setActionModalVisible(true);
                }}><Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} /></TouchableOpacity>
             </View>
           ))}
        </View>
      </ScrollView>
      <AddResourceModal visible={showAddResource} onClose={() => setShowAddResource(false)} colors={colors} styles={styles} onAdd={(type, title, url, note) => userId && addResource({ userId, projectId: project._id, type, title, url, note })} />
      
      <TimerModal 
        visible={isTimerModalVisible}
        onClose={() => { setTimerModalVisible(false); setSelectedTodoId(null); }}
        onSave={(ms, due, dt) => { if (selectedTodoId) setTimerMutation({ id: selectedTodoId, duration: ms, dueDate: due, date: dt }); }}
        initialDate={todos.find(t => t._id === selectedTodoId)?.date}
      />

      <ProjectPickerModal
        visible={isProjectModalVisible}
        onClose={() => { setProjectModalVisible(false); setSelectedTodoId(null); }}
        onSelect={(id) => { if (selectedTodoId) linkTodoProjectMutation({ id: selectedTodoId, projectId: id }); }}
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
  const { userId } = useAuth();
  const { language } = useAuth();
  const { isArabic } = useTranslation(language);
  const styles = createProjectsStyles(colors);
  const { showGuide, dismissGuide } = useScreenGuide('projects');

  const projectsTips: GuideTip[] = isArabic ? [
    { icon: 'folder-outline', title: 'أنشئ فئة', description: 'اضغط "+ إضافة فئة" لتنظيم مشاريعك في مجموعات.', accentColor: '#7C5CFF' },
    { icon: 'rocket-outline', title: 'أضف مشروع', description: 'ادخل أي فئة واضغط "+ مشروع" لإضافة مشروع جديد.', accentColor: '#00E096' },
    { icon: 'layers-outline', title: 'فئات فرعية', description: 'أضف فئات فرعية لتنظيم أعمق داخل كل فئة.', accentColor: '#FFAB00' },
  ] : [
    { icon: 'folder-outline', title: 'Create a Category', description: 'Tap "+ Add Category" to organize your projects into groups.', accentColor: '#7C5CFF' },
    { icon: 'rocket-outline', title: 'Add a Project', description: 'Enter any category and tap "+ Add" to create a new project.', accentColor: '#00E096' },
    { icon: 'layers-outline', title: 'Sub-Categories', description: 'Add sub-categories for deeper organization inside each category.', accentColor: '#FFAB00' },
  ];

  const [layer, setLayer] = useState<Layer>('categories');
  const [selectedCatId, setSelectedCatId] = useState<Id<'projectCategories'> | null>(null);
  const [selectedCatName, setSelectedCatName] = useState('');
  const [selectedSubId, setSelectedSubId] = useState<Id<'projectSubCategories'> | null>(null);
  const [selectedSubName, setSelectedSubName] = useState('');
  const [selectedProjId, setSelectedProjId] = useState<Id<'projects'> | null>(null);

  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [actionConfig, setActionConfig] = useState<{ title: string, options: any[] } | null>(null);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingSubCategory, setIsAddingSubCategory] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: Id<'projectCategories'>, name: string, icon: string, color: string } | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<{ id: Id<'projectSubCategories'>, name: string, icon: string, color: string } | null>(null);
  const [editingProject, setEditingProject] = useState<{ id: Id<'projects'>, name: string, description?: string, icon: string, color: string } | null>(null);

  const addCategory = useMutation(api.projects.addCategory);
  const updateCategory = useMutation(api.projects.updateCategory);
  const deleteCategory = useMutation(api.projects.deleteCategory);
  const addSubCategory = useMutation(api.projects.addSubCategory);
  const updateSubCategory = useMutation(api.projects.updateSubCategory);
  const deleteSubCategory = useMutation(api.projects.deleteSubCategory);
  const addProject = useMutation(api.projects.addProject);
  const updateProject = useMutation(api.projects.updateProject);
  const deleteProject = useMutation(api.projects.deleteProject);

  const handleBack = () => {
    if (layer === 'detail') {
      setLayer(selectedSubId ? 'subCategoryProjects' : 'categoryDetail');
      setSelectedProjId(null);
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
    if (layer === 'categories') return 'Projects';
    if (layer === 'categoryDetail') return selectedCatName;
    if (layer === 'subCategoryProjects') return selectedSubName;
    return 'Project Details';
  };

  const handleAddCategory = (name: string, icon: string, color: string) => {
    if (!userId) return;
    if (editingCategory) updateCategory({ id: editingCategory.id, name, icon, color });
    else addCategory({ userId, name, icon, color });
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
    <View style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle} numberOfLines={1}>{getTitle()}</Text>
            <Text style={styles.headerSubtitle}>{layer === 'categories' ? 'Manage your workspaces' : 'Exploring paths'}</Text>
          </View>
          <View style={styles.headerActions}>
            {layer === 'categories' && <TouchableOpacity style={styles.headerBtn} onPress={() => setIsAddingCategory(true)}><Ionicons name="add" size={24} color={colors.primary} /></TouchableOpacity>}
          </View>
        </View>


        {layer === 'categories' && (
          <CategoriesView 
            styles={styles} colors={colors} userId={userId} 
            onAddCategory={() => setIsAddingCategory(true)} 
            onEditCategory={(cat) => { setEditingCategory({ id: cat._id, name: cat.name, icon: cat.icon, color: cat.color }); setIsAddingCategory(true); }}
            onSelectCategory={(id, name) => { setSelectedCatId(id); setSelectedCatName(name); setLayer('categoryDetail'); }} 
            onOpenAction={(config) => { setActionConfig(config); setActionModalVisible(true); }} 
          />
        )}
        
        {layer === 'categoryDetail' && selectedCatId && (
          <CategoryDetailView 
            styles={styles} colors={colors} categoryId={selectedCatId} categoryName={selectedCatName} userId={userId}
            onSelectSubCategory={(id, name) => { setSelectedSubId(id); setSelectedSubName(name); setLayer('subCategoryProjects'); }}
            onSelectProject={(id) => { setSelectedProjId(id); setSelectedSubId(null); setLayer('detail'); }}
            onAddSubCategory={() => setIsAddingSubCategory(true)}
            onAddProject={() => setIsAddingProject(true)}
            onEditCategory={(cat) => { setEditingCategory({ id: cat._id, name: cat.name, icon: cat.icon, color: cat.color }); setIsAddingCategory(true); }}
            onEditSubCategory={(sub) => { setEditingSubCategory({ id: sub._id, name: sub.name, icon: sub.icon, color: sub.color }); setIsAddingSubCategory(true); }}
            onEditProject={(proj) => { setEditingProject({ id: proj._id, name: proj.name, description: proj.description, icon: proj.icon, color: proj.color }); setIsAddingProject(true); }}
            onDeleteCategory={(id) => {
              deleteCategory({ id });
              setLayer('categories');
              setSelectedCatId(null);
            }}
            onDeleteSubCategory={(id) => {
               deleteSubCategory({ id });
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
            onSelectProject={(id) => { setSelectedProjId(id); setLayer('detail'); }}
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
    </View>
  );
};

export default Projects;
