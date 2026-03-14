import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import useTheme from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

interface ProjectPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (projectId: string) => void;
}

const PROJECTS = [
  { id: 'Personal', icon: 'person-outline', color: '#FF9500' },
  { id: 'Work', icon: 'briefcase-outline', color: '#007AFF' },
  { id: 'Health', icon: 'heart-outline', color: '#FF2D55' },
  { id: 'Finance', icon: 'cash-outline', color: '#34C759' },
  { id: 'Education', icon: 'book-outline', color: '#5856D6' },
];

const ProjectPickerModal: React.FC<ProjectPickerModalProps> = ({ visible, onClose, onSelect }) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Link to Project</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={PROJECTS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.projectItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[styles.projectLabel, { color: colors.text }]}>{item.id}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.border} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 40,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  projectLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProjectPickerModal;
