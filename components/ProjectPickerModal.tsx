import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, SectionList } from 'react-native';
import useTheme from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

import { useAuth } from '@/hooks/useAuth';

interface ProjectPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (projectId: string | undefined) => void;
}

const ProjectPickerModal: React.FC<ProjectPickerModalProps> = ({ visible, onClose, onSelect }) => {
  const { colors } = useTheme();
  const { userId } = useAuth();
  
  const [currentLevel, setCurrentLevel] = useState<'categories' | 'categoryDetail' | 'subCategoryProjects'>('categories');
  const [selectedCatId, setSelectedCatId] = useState<Id<'projectCategories'> | null>(null);
  const [selectedCatName, setSelectedCatName] = useState('');
  const [selectedSubId, setSelectedSubId] = useState<Id<'projectSubCategories'> | null>(null);

  // Queries
  const categories = useOfflineQuery<any[]>('projects.getCategories', api.projects.getCategories, userId ? { userId } : "skip");
  const subCategories = useOfflineQuery<any[]>('projects.getSubCategories', api.projects.getSubCategories, 
    selectedCatId ? { categoryId: selectedCatId } : "skip"
  );
  const directProjects = useOfflineQuery<any[]>('projects.getProjectsByCategory', api.projects.getProjectsByCategory,
    selectedCatId ? { categoryId: selectedCatId } : "skip"
  );
  const subProjects = useOfflineQuery<any[]>('projects.getProjectsBySubCategory', api.projects.getProjectsBySubCategory,
    selectedSubId ? { subCategoryId: selectedSubId } : "skip"
  );

  const handleBack = () => {
    if (currentLevel === 'subCategoryProjects') {
      setCurrentLevel('categoryDetail');
      setSelectedSubId(null);
    } else if (currentLevel === 'categoryDetail') {
      setCurrentLevel('categories');
      setSelectedCatId(null);
    }
  };

  const handleClose = () => {
    setCurrentLevel('categories');
    setSelectedCatId(null);
    setSelectedSubId(null);
    onClose();
  };

  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: colors.border }]}
      onPress={() => {
        setSelectedCatId(item._id);
        setSelectedCatName(item.name);
        setCurrentLevel('categoryDetail');
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any || 'folder-outline'} size={20} color={item.color} />
      </View>
      <Text style={[styles.label, { color: colors.text }]}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.border} />
    </TouchableOpacity>
  );

  const renderMixedItem = ({ item, section }: { item: any; section: any }) => {
    const isProject = section.type === 'project';
    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: colors.border }]}
        onPress={() => {
          if (isProject) {
            onSelect(item._id);
            handleClose();
          } else {
            setSelectedSubId(item._id);
            setCurrentLevel('subCategoryProjects');
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: (item.color || colors.primary) + '20' }]}>
          <Ionicons 
            name={item.icon || (isProject ? 'rocket-outline' : 'layers-outline') as any} 
            size={20} 
            color={item.color || colors.primary} 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.text }]}>{item.name}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{isProject ? 'Project' : 'Sub-Category'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.border} />
      </TouchableOpacity>
    );
  };

  const renderProjectItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: colors.border }]}
      onPress={() => {
        onSelect(item._id);
        handleClose();
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any || 'rocket-outline'} size={20} color={item.color} />
      </View>
      <Text style={[styles.label, { color: colors.text }]}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.border} />
    </TouchableOpacity>
  );

  const isLoading = 
    (currentLevel === 'categories' && categories === undefined) ||
    (currentLevel === 'categoryDetail' && (subCategories === undefined || directProjects === undefined)) ||
    (currentLevel === 'subCategoryProjects' && subProjects === undefined);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {currentLevel !== 'categories' && (
                <TouchableOpacity onPress={handleBack} style={{ marginRight: 12 }}>
                  <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
              )}
              <Text style={[styles.title, { color: colors.text }]}>
                {currentLevel === 'categories' ? 'Select Category' : 
                 currentLevel === 'categoryDetail' ? selectedCatName : 'Select Project'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={{ padding: 60, alignItems: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>
          ) : currentLevel === 'categories' ? (
            <>
              <TouchableOpacity
                style={[styles.item, { borderBottomColor: colors.border }]}
                onPress={() => {
                  onSelect(undefined);
                  handleClose();
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.border + '30' }]}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                </View>
                <Text style={[styles.label, { color: colors.textMuted }]}>Unlink / None</Text>
              </TouchableOpacity>
              <FlatList data={categories} keyExtractor={(item) => item._id} renderItem={renderCategoryItem} contentContainerStyle={styles.listContent} />
            </>
          ) : currentLevel === 'categoryDetail' ? (
            <SectionList
              sections={[
                { title: 'Sub-Categories', data: subCategories || [], type: 'subcat' },
                { title: 'Direct Projects', data: directProjects || [], type: 'project' }
              ]}
              keyExtractor={(item) => item._id}
              renderItem={renderMixedItem}
              renderSectionHeader={({ section: { title, data } }) => data.length > 0 ? (
                <View style={[styles.sectionHeader, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
                </View>
              ) : null}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <FlatList data={subProjects} keyExtractor={(item) => item._id} renderItem={renderProjectItem} contentContainerStyle={styles.listContent} />
          )}

          {!isLoading && currentLevel === 'categories' && categories?.length === 0 && (
             <View style={{ padding: 60, alignItems: 'center' }}>
                <Ionicons name="folder-open-outline" size={48} color={colors.border} />
                <Text style={{ color: colors.textMuted, marginTop: 16 }}>No categories found</Text>
             </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 16, maxHeight: '85%', minHeight: '40%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  listContent: { paddingBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  iconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  label: { flex: 1, fontSize: 16, fontWeight: '700' },
  sectionHeader: { paddingHorizontal: 24, paddingVertical: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});

export default ProjectPickerModal;
