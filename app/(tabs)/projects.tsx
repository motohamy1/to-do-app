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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { createProjectsStyles } from '@/assets/styles/projects.styles';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import TodoInput from '@/components/TodoInput';
import TodoCard from '@/components/TodoCard';
import TimerModal from '@/components/TimerModal';
import ProjectPickerModal from '@/components/ProjectPickerModal';
import { createHomeStyles } from '@/assets/styles/home.styles';

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
    default:            return colors.textMuted;
  }
}

// ─── Modals ───────────────────────────────────────────────────────────────────

const AddSubCategoryModal = ({ visible, onClose, colors, styles, onAdd }: {
  visible: boolean; onClose: () => void; colors: any; styles: any;
  onAdd: (name: string, icon: string, color: string) => void;
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(SUB_CATEGORY_ICONS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[2]);
  const handleAdd = () => { if (!name.trim()) return; onAdd(name.trim(), icon, color); setName(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Sub-Category</Text>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Frontend, Cardiology, Sci-Fi..." placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoFocus />
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleAdd}><Text style={styles.modalPrimaryBtnText}>Create Sub-Category</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose}><Text style={styles.modalSecondaryBtnText}>Cancel</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const AddCategoryModal = ({ visible, onClose, colors, styles, onAdd }: {
  visible: boolean; onClose: () => void; colors: any; styles: any;
  onAdd: (name: string, icon: string, color: string) => void;
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[0]);
  const handleAdd = () => { if (!name.trim()) return; onAdd(name.trim(), icon, color); setName(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Category</Text>
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
            <View style={styles.colorPicker}>
              {ACCENT_COLORS.map(c => (
                <TouchableOpacity key={c} style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]} onPress={() => setColor(c)} />
              ))}
            </View>
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleAdd}><Text style={styles.modalPrimaryBtnText}>Create Category</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose}><Text style={styles.modalSecondaryBtnText}>Cancel</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const AddProjectModal = ({ visible, onClose, colors, styles, onAdd }: {
  visible: boolean; onClose: () => void; colors: any; styles: any;
  onAdd: (name: string, desc: string, icon: string, color: string) => void;
}) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [icon, setIcon] = useState(PROJECT_ICONS[0]);
  const [color, setColor] = useState(ACCENT_COLORS[1]);
  const handleAdd = () => { if (!name.trim()) return; onAdd(name.trim(), desc.trim(), icon, color); setName(''); setDesc(''); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Project</Text>
            <Text style={styles.modalLabel}>Project Name</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Todo App, Research Paper…" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoFocus />
            <Text style={styles.modalLabel}>Short Description (optional)</Text>
            <TextInput style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="What is this project about?" placeholderTextColor={colors.textMuted} value={desc} onChangeText={setDesc} multiline />
            <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: color }]} onPress={handleAdd}><Text style={styles.modalPrimaryBtnText}>Create Project</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose}><Text style={styles.modalSecondaryBtnText}>Cancel</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </View>
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
      <View style={styles.modalOverlay}>
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
      </View>
    </Modal>
  );
};

// ─── Layer 1: Categories View (Full Width) ───────────────────────────────────

const CategoriesView = ({ styles, colors, onSelectCategory, onAddCategory, userId }: {
  styles: any; colors: any;
  onSelectCategory: (id: Id<'projectCategories'>, name: string, color: string) => void;
  onAddCategory: () => void;
  userId: Id<'users'> | null;
}) => {
  const categories = useQuery(api.projects.getCategories, userId ? { userId } : 'skip');
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
          <TouchableOpacity style={styles.categoryDeleteBtn} onPress={() => deleteCategory({ id: cat._id })}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
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
  styles, colors, categoryId, categoryName,
  onSelectSubCategory, onSelectProject, onAddSubCategory, onAddProject, onDeleteCategory, userId
}: {
  styles: any; colors: any;
  categoryId: Id<'projectCategories'>; categoryName: string;
  onSelectSubCategory: (id: Id<'projectSubCategories'>, name: string) => void;
  onSelectProject: (id: Id<'projects'>) => void;
  onAddSubCategory: () => void;
  onAddProject: () => void;
  onDeleteCategory: (id: Id<'projectCategories'>) => void;
  userId: Id<'users'> | null;
}) => {
  const subCategories = useQuery(api.projects.getSubCategories, { categoryId });
  const directProjects = useQuery(api.projects.getProjectsByCategory, { categoryId });
  const allTodos = useQuery(api.todos.get, userId ? { userId } : 'skip');

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
           style={[styles.headerBtn, { borderColor: colors.danger + '40' }]} 
           onPress={() => {
              Alert.alert(
                "Delete Category?",
                `This will delete "${categoryName}" and all its projects/sub-categories.`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => onDeleteCategory(categoryId) }
                ]
              );
           }}
         >
           <Ionicons name="trash-outline" size={20} color={colors.danger} />
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
          <TouchableOpacity key={sub._id} style={styles.subCategoryCard} onPress={() => onSelectSubCategory(sub._id, sub.name)}>
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
              <TouchableOpacity key={project._id} style={[styles.projectGridCard, { shadowColor: project.color }]} onPress={() => onSelectProject(project._id)}>
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
  onSelectProject, onAddProject, onDeleteSubCategory, userId
}: {
  styles: any; colors: any;
  subCategoryId: Id<'projectSubCategories'>; subCategoryName: string;
  onSelectProject: (id: Id<'projects'>) => void;
  onAddProject: () => void;
  onDeleteSubCategory: (id: Id<'projectSubCategories'>) => void;
  userId: Id<'users'> | null;
}) => {
  const projects = useQuery(api.projects.getProjectsBySubCategory, { subCategoryId });
  const allTodos = useQuery(api.todos.get, userId ? { userId } : 'skip');

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
           onPress={() => {
              Alert.alert(
                "Delete Sub-Category?",
                `Delete "${subCategoryName}" and all its projects?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => onDeleteSubCategory(subCategoryId) }
                ]
              );
           }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
      {projects.map(project => {
        const { pct } = getProgress(project._id);
        return (
          <TouchableOpacity key={project._id} style={[styles.projectGridCard, { shadowColor: project.color }]} onPress={() => onSelectProject(project._id)}>
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

const ProjectDetailView = ({ styles, colors, projectId, onDeleteProject, userId }: { styles: any; colors: any; projectId: Id<'projects'>, onDeleteProject: (id: Id<'projects'>) => void, userId: Id<'users'> | null }) => {
  const project = useQuery(api.projects.getProject, { id: projectId });
  const resources = useQuery(api.projects.getProjectResources, { projectId });
  const checklists = useQuery(api.projects.getChecklists, { projectId });
  const linkedTodos = useQuery(api.projects.getTodosByProject, project ? { projectId: project._id } : 'skip');
  
  const addResource = useMutation(api.projects.addResource);
  const deleteResource = useMutation(api.projects.deleteResource);
  const updateTodoStatus = useMutation(api.todos.updateStatus);
  const updateProject = useMutation(api.projects.updateProject);
  const addCheckItem = useMutation(api.projects.addChecklistItem);
  const toggleCheckItem = useMutation(api.projects.toggleChecklistItem);
  const deleteCheckItem = useMutation(api.projects.deleteChecklistItem);
  const setTimerMutation = useMutation(api.todos.setTimer);
  const linkProjectMutation = useMutation(api.todos.linkProject);
  const deleteTodoMutation = useMutation(api.todos.deleteTodo);

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
                Alert.alert("Delete Project?", `Delete "${project.name}"?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => onDeleteProject(project._id) }
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
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
                           onLongPress={(id) => deleteTodoMutation({ id })} 
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
               <TouchableOpacity onPress={() => deleteResource({ id: res._id })}><Ionicons name="trash-outline" size={16} color={colors.danger} /></TouchableOpacity>
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
        onSelect={(id) => { if (selectedTodoId) linkProjectMutation({ id: selectedTodoId, projectId: id }); }}
      />
    </>
  );
};

// ─── Main Projects Screen (4/5-LAYER DYNAMIC) ───────────────────────────────

type Layer = 'categories' | 'categoryDetail' | 'subCategoryProjects' | 'detail';

const Projects: React.FC = () => {
  const { colors } = useTheme();
  const { userId } = useAuth();
  const styles = createProjectsStyles(colors);

  const [layer, setLayer] = useState<Layer>('categories');
  const [selectedCatId, setSelectedCatId] = useState<Id<'projectCategories'> | null>(null);
  const [selectedCatName, setSelectedCatName] = useState('');
  const [selectedSubId, setSelectedSubId] = useState<Id<'projectSubCategories'> | null>(null);
  const [selectedSubName, setSelectedSubName] = useState('');
  const [selectedProjId, setSelectedProjId] = useState<Id<'projects'> | null>(null);

  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showAddProj, setShowAddProj] = useState(false);

  const addCat = useMutation(api.projects.addCategory);
  const addSub = useMutation(api.projects.addSubCategory);
  const addProj = useMutation(api.projects.addProject);
  const deleteCatMutation = useMutation(api.projects.deleteCategory);
  const deleteSubCatMutation = useMutation(api.projects.deleteSubCategory);
  const deleteProjMutation = useMutation(api.projects.deleteProject);

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
            {layer === 'categories' && <TouchableOpacity style={styles.headerBtn} onPress={() => setShowAddCat(true)}><Ionicons name="add" size={24} color={colors.primary} /></TouchableOpacity>}
          </View>
        </View>


        {layer === 'categories' && <CategoriesView styles={styles} colors={colors} userId={userId} onAddCategory={() => setShowAddCat(true)} onSelectCategory={(id, name) => { setSelectedCatId(id); setSelectedCatName(name); setLayer('categoryDetail'); }} />}
        
        {layer === 'categoryDetail' && selectedCatId && (
          <CategoryDetailView 
            styles={styles} colors={colors} categoryId={selectedCatId} categoryName={selectedCatName} userId={userId}
            onSelectSubCategory={(id, name) => { setSelectedSubId(id); setSelectedSubName(name); setLayer('subCategoryProjects'); }}
            onSelectProject={(id) => { setSelectedProjId(id); setSelectedSubId(null); setLayer('detail'); }}
            onAddSubCategory={() => setShowAddSub(true)}
            onAddProject={() => setShowAddProj(true)}
            onDeleteCategory={(id) => {
              // Note: deleteCategory doesn't strictly need userId for logic, but let's be safe
              deleteCatMutation({ id });
              setLayer('categories');
              setSelectedCatId(null);
            }}
          />
        )}

        {layer === 'subCategoryProjects' && selectedSubId && (
          <SubCategoryProjectsView 
            styles={styles} colors={colors} subCategoryId={selectedSubId} subCategoryName={selectedSubName} userId={userId}
            onSelectProject={(id) => { setSelectedProjId(id); setLayer('detail'); }}
            onAddProject={() => setShowAddProj(true)}
            onDeleteSubCategory={(id) => {
               deleteSubCatMutation({ id });
               setLayer('categoryDetail');
               setSelectedSubId(null);
            }}
          />
        )}

        {layer === 'detail' && selectedProjId && (
          <ProjectDetailView 
            styles={styles} colors={colors} projectId={selectedProjId} userId={userId}
            onDeleteProject={(id) => {
               deleteProjMutation({ id });
               setLayer(selectedSubId ? 'subCategoryProjects' : 'categoryDetail');
               setSelectedProjId(null);
            }}
          />
        )}

      </SafeAreaView>

      <AddCategoryModal visible={showAddCat} onClose={() => setShowAddCat(false)} colors={colors} styles={styles} onAdd={(name, icon, color) => userId && addCat({ userId, name, icon, color })} />
      {selectedCatId && <AddSubCategoryModal visible={showAddSub} onClose={() => setShowAddSub(false)} colors={colors} styles={styles} onAdd={(name, icon, color) => userId && addSub({ userId, categoryId: selectedCatId, name, icon, color })} />}
      {(selectedCatId || selectedSubId) && (
        <AddProjectModal 
          visible={showAddProj} onClose={() => setShowAddProj(false)} colors={colors} styles={styles}
          onAdd={(name, desc, icon, color) => {
            if (!userId) return;
            if (selectedSubId) addProj({ userId, subCategoryId: selectedSubId, name, description: desc, icon, color });
            else if (selectedCatId) addProj({ userId, categoryId: selectedCatId, name, description: desc, icon, color });
          }}
        />
      )}
    </View>
  );
};

export default Projects;
