import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import useTheme from '@/hooks/useTheme';
import { createNotesStyles } from '@/assets/styles/notes.styles';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';

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

  const todos = useQuery(api.todos.get, userId ? { userId } : 'skip');

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
      return (
        <TouchableOpacity 
          key={item._id}
          style={[styles.card, { backgroundColor: isDarkMode ? colors.surface : colors.bg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/note-detail', params: { isReminder: item._id === 'add_new_rem' ? 'true' : 'false' } })}
        >
          <Ionicons name={item._id === 'add_new_rem' ? 'alarm-outline' : 'document-text-outline'} size={32} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 16, fontWeight: '500' }}>{item._id === 'add_new_rem' ? 'Add Reminder' : 'Add Note'}</Text>
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
      >
        <Text style={[styles.cardTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]} numberOfLines={2}>
          {item.text || 'Untitled'}
        </Text>
        <Text style={[styles.cardDesc, { color: isDarkMode ? '#FFFFFF99' : 'rgba(0,0,0,0.6)' }]} numberOfLines={2}>
          {item.description || '...'}
        </Text>
        {item.dueDate ? (
          <Text style={[styles.cardDate, { color: isDarkMode ? colors.primary : colors.primary }]}>
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
        <Text style={styles.headerTitle}>Notes & Reminders</Text>
      </View>

      <View style={{ flex: 1, paddingBottom: 20 }}>
        {/* Reminders Section */}
        <View style={styles.sectionContainer}>
          <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.sectionTitle}>Reminders</Text>
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

        {/* Notes Section */}
        <View style={styles.sectionContainer}>
          <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.sectionTitle}>Notes</Text>
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
    </SafeAreaView>
  );
}
