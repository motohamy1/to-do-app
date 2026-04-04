import { createNotesStyles } from '@/assets/styles/notes.styles';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import useTheme from '@/hooks/useTheme';
import { useTranslation } from '@/utils/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Platform, Share, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionModal, { ActionOption } from '@/components/ActionModal';

// Helper to get random pastel colors for cards
const getRandomColor = (index: number, isDarkMode: boolean) => {
  const lightColors = ['#FFE4E1', '#E0FFFF', '#E6E6FA', '#F0FFF0', '#FFF0F5', '#FDF5E6'];
  const darkColors = ['#2C1A1A', '#1A2C2C', '#1A1A2C', '#1B2C1B', '#2C1A24', '#2C2A1A'];
  const arr = isDarkMode ? darkColors : lightColors;
  return arr[index % arr.length];
};

export default function NotesScreen() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const styles = createNotesStyles(colors, isArabic);
  const insets = useSafeAreaInsets();

  const todos = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : 'skip');
  const deleteTodo = useOfflineMutation(api.todos.deleteTodo, "todos:deleteTodo");

  const [isActionModalVisible, setActionModalVisible] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);

  if (todos === undefined) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Filter notes vs reminders
  const reminders = todos.filter(t => t.type === 'reminder' || (!t.type && t.dueDate && t.dueDate > 0 && !t.categoryId && !t.priority && !t.timerDuration));
  const notes = todos.filter(t => t.type === 'note' || (!t.type && (!t.dueDate || t.dueDate === 0) && !t.categoryId && !t.priority && !t.timerDuration && !t.isCompleted));

  const chunkArray = (arr: any[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };

  const remindersChunks = chunkArray(reminders, 2);
  const notesChunks = chunkArray(notes, 2);

  const renderCard = (item: any, globalIndex: number) => {
    if (item.isAdd) {
      const isRem = item._id === 'add_new_rem';
      return (
        <TouchableOpacity
          key={item._id}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderWidth: 0,
              padding: 0,
              borderRadius: 32,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 4
            }
          ]}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/note-detail', params: { isReminder: isRem ? 'true' : 'false' } })}
        >
          <View style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isRem ? colors.bg : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
            overflow: 'hidden'
          }}>
            <Ionicons name={isRem ? 'alarm' : 'add'} size={32} color={colors.primary} />
          </View>
          <Text style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
            fontFamily: Platform.OS === 'ios' ? 'Baskerville' : 'serif'
          }}>
            {isRem ? 'New Reminder' : 'Quick Note'}
          </Text>
        </TouchableOpacity>
      );
    }

    const bgColor = getRandomColor(globalIndex, isDarkMode);

    return (
      <TouchableOpacity
        key={item._id}
        style={[styles.card, { backgroundColor: bgColor }]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/note-detail', params: { id: item._id } })}
        onLongPress={() => {
          setSelectedItem(item);
          setActionModalVisible(true);
        }}
      >
        <Text style={[styles.cardTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]} numberOfLines={2}>
          {item.text || 'Untitled'}
        </Text>
        <Text style={[styles.cardDesc, { color: isDarkMode ? '#FFFFFF99' : 'rgba(0,0,0,0.6)' }]} numberOfLines={2}>
          {item.description || '...'}
        </Text>
        {item.dueDate ? (
          <Text style={[styles.cardDate, { color: colors.primary }]}>
            {new Date(item.dueDate).toLocaleDateString()}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderReminderColumn = ({ item }: { item: any[] }) => (
    <View style={{ gap: 12, marginRight: 0 }}>
      {item.map(n => renderCard(n, reminders.indexOf(n)))}
    </View>
  );

  const renderNoteColumn = ({ item }: { item: any[] }) => (
    <View style={{ gap: 12, marginRight: 0 }}>
      {item.map(n => renderCard(n, notes.indexOf(n)))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { overflow: 'hidden' }]} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, isArabic && { flexDirection: 'row-reverse' }, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={[styles.headerTitle, { fontFamily: Platform.OS === 'ios' ? 'Baskerville' : 'serif', fontSize: 32 }]}>Notes & Reminders</Text>
      </View>

      <View style={{ flex: 1, paddingBottom: 20 }}>
        <View style={styles.sectionContainer}>
          <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.sectionTitle, { fontFamily: Platform.OS === 'ios' ? 'Baskerville' : 'serif' }]}>Reminders</Text>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>{reminders.length}</Text>
          </View>

          <FlatList
            ListHeaderComponent={() => (
              <View style={{ height: '100%', justifyContent: 'center', paddingRight: 4 }}>
                {renderCard({ _id: 'add_new_rem', isAdd: true }, -1)}
              </View>
            )}
            data={remindersChunks}
            keyExtractor={(_, index) => `remChunk_${index}`}
            renderItem={renderReminderColumn}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.listContent, isArabic && { flexDirection: 'row-reverse' }]}
            snapToInterval={(Dimensions.get('window').width * 0.45) + 16}
            decelerationRate="fast"
          />
        </View>

        <View style={styles.sectionContainer}>
          <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.sectionTitle, { fontFamily: Platform.OS === 'ios' ? 'Baskerville' : 'serif' }]}>Notes</Text>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>{notes.length}</Text>
          </View>

          <FlatList
            ListHeaderComponent={() => (
              <View style={{ height: '100%', justifyContent: 'center', paddingRight: 4 }}>
                {renderCard({ _id: 'add_new_note', isAdd: true }, -1)}
              </View>
            )}
            data={notesChunks}
            keyExtractor={(_, index) => `noteChunk_${index}`}
            renderItem={renderNoteColumn}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.listContent, isArabic && { flexDirection: 'row-reverse' }]}
            snapToInterval={(Dimensions.get('window').width * 0.45) + 16}
            decelerationRate="fast"
          />
        </View>
      </View>

      <ActionModal 
        visible={isActionModalVisible}
        onClose={() => { setActionModalVisible(false); setSelectedItem(null); }}
        title={selectedItem?.text || (selectedItem?.type === 'reminder' ? 'Reminder Options' : 'Note Options')}
        isArabic={isArabic}
        options={[
          { 
            label: isArabic ? 'تعديل' : 'Edit', 
            icon: 'create-outline', 
            onPress: () => router.push({ pathname: '/note-detail', params: { id: selectedItem?._id } }) 
          },
          { 
            label: isArabic ? 'مشاركة' : 'Share', 
            icon: 'share-social-outline', 
            onPress: () => Share.share({ message: `${selectedItem?.text || 'Untitled'}\n\n${selectedItem?.description || ''}` }) 
          },
          { 
            label: isArabic ? 'حذف' : 'Delete', 
            icon: 'trash-outline', 
            variant: 'destructive',
            onPress: () => {
              if (selectedItem) {
                deleteTodo({ id: selectedItem._id });
              }
            }
          }
        ]}
      />
    </SafeAreaView>
  );
}
