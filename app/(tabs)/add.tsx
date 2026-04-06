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
import { ActivityIndicator, Alert, Dimensions, FlatList, Platform, Share, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionModal, { ActionOption } from '@/components/ActionModal';
import { useScreenGuide } from '@/hooks/useScreenGuide';
import ScreenGuide from '@/components/ScreenGuide';
import type { GuideTip } from '@/components/ScreenGuide';

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
  const { showGuide, dismissGuide } = useScreenGuide('notes');

  const notesTips: GuideTip[] = isArabic ? [
    { icon: 'document-text-outline', title: 'ملاحظة سريعة', description: 'اضغط "ملاحظة سريعة" لإنشاء ملاحظة غنية بالتنسيق والألوان.', accentColor: '#5CB2FF' },
    { icon: 'notifications-outline', title: 'تذكير جديد', description: 'اضغط "تذكير جديد" لإنشاء تذكير بتاريخ ووقت محدد.', accentColor: '#FF5C77' },
    { icon: 'hand-left-outline', title: 'اضغط مطولاً', description: 'اضغط مطولاً على بطاقة لتعديلها أو مشاركتها أو حذفها.', accentColor: '#FFAB00' },
  ] : [
    { icon: 'document-text-outline', title: 'Quick Note', description: 'Tap "Quick Note" to create a rich note with formatting and colors.', accentColor: '#5CB2FF' },
    { icon: 'notifications-outline', title: 'New Reminder', description: 'Tap "New Reminder" to create a reminder with a specific date and time.', accentColor: '#FF5C77' },
    { icon: 'hand-left-outline', title: 'Long Press', description: 'Long press any card to edit, share, or delete it.', accentColor: '#FFAB00' },
  ];

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



  const renderCard = (item: any, globalIndex: number) => {
    if (item.isAdd) {
      const isRem = item._id === 'add_new_rem';
      return (
        <TouchableOpacity
          key={item._id}
          style={[
            styles.gridCard,
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
          <Text style={[{
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
            fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif-medium'
          }, isArabic && { textAlign: 'right' }]}>
            {isRem ? 'New Reminder' : 'Quick Note'}
          </Text>
        </TouchableOpacity>
      );
    }

    const bgColor = getRandomColor(globalIndex, isDarkMode);

    return (
      <TouchableOpacity
        key={item._id}
        style={[styles.gridCard, { backgroundColor: bgColor }]}
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



  return (
    <SafeAreaView style={[styles.safeArea, { overflow: 'hidden' }]} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, isArabic && { flexDirection: 'row-reverse' }, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={[styles.headerTitle, { fontFamily: Platform.OS === 'ios' ? 'Baskerville' : 'serif', fontSize: 32 }]}>Notes & Reminders</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.sectionContainer}>
          <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.sectionTitle, { fontFamily: Platform.OS === 'ios' ? 'Baskerville' : 'serif' }]}>Reminders</Text>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>{reminders.length}</Text>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 24 }}
          >
            <View style={[{ flexDirection: 'row', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse' }]}>
              {/* Quick Add Reminder - Lone Column, Centered Vertically */}
              <View style={[styles.loneColumnCentered, { marginRight: 12, marginLeft: isArabic ? 12 : 24 }]}>
                {renderCard({ _id: 'add_new_rem', isAdd: true }, -1)}
              </View>
              
              {/* Reminder items - 2 Row Grid */}
              <View style={[styles.horizontalGridContainer, { paddingHorizontal: 0 }, isArabic && { flexDirection: 'column-reverse' }]}>
                {reminders.map((item, index) => renderCard(item, index))}
              </View>
            </View>
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.sectionTitle, { fontFamily: Platform.OS === 'ios' ? 'Baskerville' : 'serif' }]}>Notes</Text>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>{notes.length}</Text>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 24 }}
          >
            <View style={[{ flexDirection: 'row', alignItems: 'center' }, isArabic && { flexDirection: 'row-reverse' }]}>
              {/* Quick Add Note - Lone Column, Centered Vertically */}
              <View style={[styles.loneColumnCentered, { marginRight: 12, marginLeft: isArabic ? 12 : 24 }]}>
                {renderCard({ _id: 'add_new_note', isAdd: true }, -1)}
              </View>

              {/* Note items - 2 Row Grid */}
              <View style={[styles.horizontalGridContainer, { paddingHorizontal: 0 }, isArabic && { flexDirection: 'column-reverse' }]}>
                {notes.map((item, index) => renderCard(item, index))}
              </View>
            </View>
          </ScrollView>
        </View>
      </ScrollView>

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

      <ScreenGuide visible={showGuide} tips={notesTips} onDismiss={dismissGuide} isArabic={isArabic} />
    </SafeAreaView>
  );
}
