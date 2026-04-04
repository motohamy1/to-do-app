import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View,
  Text, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { api } from '@/convex/_generated/api';
import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import { createNotesStyles } from '@/assets/styles/notes.styles';

const NoteHeader = React.memo(({ 
  title, 
  setTitle, 
  formattedNoteDate, 
  isArabic, 
  colors, 
  styles 
}: { 
  title: string; 
  setTitle: (t: string) => void; 
  formattedNoteDate: string; 
  isArabic: boolean; 
  colors: any; 
  styles: any;
}) => (
  <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
    <TextInput
      style={[styles.titleInput, isArabic && { textAlign: 'right' }]}
      placeholder="Note Title"
      placeholderTextColor={colors.textMuted}
      value={title}
      onChangeText={setTitle}
      blurOnSubmit={true}
    />
    <Text style={[styles.dateSubtitle, isArabic && { textAlign: 'right' }]}>{formattedNoteDate}</Text>
  </View>
));

export default function NoteDetailScreen() {
  const router = useRouter();
  const { id, isReminder } = useLocalSearchParams<{ id: string, isReminder: string }>();
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const styles = createNotesStyles(colors, isArabic);
  const insets = useSafeAreaInsets();

  // Note State
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<number>(0);
  const [showToolbar, setShowToolbar] = useState(true);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  interface Block {
    id: string;
    type: 'text' | 'todo' | 'h1' | 'h2' | 'h3' | 'bullet';
    content: string;
    checked?: boolean;
  }
  const [blocks, setBlocks] = useState<Block[]>([{ id: 'first', type: 'text', content: '' }]);
  const blockRefs = useRef<{ [key: string]: TextInput | null }>({});
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Typography State
  const [activeFontSize, setActiveFontSize] = useState(18);
  const [activeFontFamily, setActiveFontFamily] = useState(Platform.OS === 'ios' ? 'Baskerville' : 'serif');
  const [activeFontColor, setActiveFontColor] = useState(colors.text);
  const [activeFontWeight, setActiveFontWeight] = useState<'normal' | '200' | '600' | 'bold'>('normal');
  const [activeFontStyle, setActiveFontStyle] = useState<'normal' | 'italic'>('normal');

  type ActiveMenuType = 'none' | 'fontFamily' | 'fontSize' | 'color' | 'fontShape';
  const [activeMenu, setActiveMenu] = useState<ActiveMenuType>('none');

  // Parser & Serializer
  const parseMarkdown = (text: string): Block[] => {
    if (!text.trim()) return [{ id: Math.random().toString(), type: 'text', content: '' }];
    return text.split('\n').map((line, idx) => {
      let type: Block['type'] = 'text';
      let content = line;
      let checked = false;

      if (line.startsWith('☐ ')) {
        type = 'todo';
        content = line.substring(2);
        checked = false;
      } else if (line.startsWith('☑ ')) {
        type = 'todo';
        content = line.substring(2);
        checked = true;
      } else if (line.startsWith('### ')) {
        type = 'h3';
        content = line.substring(4);
      } else if (line.startsWith('## ')) {
        type = 'h2';
        content = line.substring(3);
      } else if (line.startsWith('• ')) {
        type = 'bullet';
        content = line.substring(2);
      } else if (line.startsWith('# ')) {
        type = 'h1';
        content = line.substring(2);
      }
      return { id: `block-${idx}-${Date.now()}`, type, content, checked };
    });
  };

  const serializeBlocks = (blocksToSave: Block[]): string => {
    return blocksToSave.map(b => {
      if (b.type === 'todo') return (b.checked ? '☑ ' : '☐ ') + b.content;
      if (b.type === 'h1') return '# ' + b.content;
      if (b.type === 'h2') return '## ' + b.content;
      if (b.type === 'h3') return '### ' + b.content;
      if (b.type === 'bullet') return '• ' + b.content;
      return b.content;
    }).join('\n');
  };

  // Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Reminder Modal State
  const [showReminderModal, setShowReminderModal] = useState(isReminder === 'true');
  const [reminderTitle, setReminderTitle] = useState('');
  
  // Custom Calendar State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Custom Exact Time state
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Queries & Mutations
  const existingNote = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : 'skip')?.find((t: any) => t._id === id);
  const addNote = useOfflineMutation(api.todos.addTodo, "todos:addTodo");
  const deleteNoteMutation = useOfflineMutation(api.todos.deleteTodo, "todos:deleteTodo");
  
  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.text || '');
      setBlocks(parseMarkdown(existingNote.description || ''));
      if (existingNote.dueDate) {
        setDueDate(existingNote.dueDate);
        const d = new Date(existingNote.dueDate);
        setSelectedDate(d);
        setCurrentMonth(d);
        setSelectedTime(d);
      }
    }
  }, [existingNote]);

  const handleSaveNote = async () => {
    const bodyStr = serializeBlocks(blocks);
    if (!title.trim() && !bodyStr.trim()) {
      router.back();
      return;
    }
    
    if (userId) {
      try {
        if (!id) {
          await addNote({
            userId,
            text: title.trim() || 'Untitled',
            description: bodyStr.trim(),
            dueDate: dueDate || undefined,
            date: dueDate || Date.now(),
            status: 'not_started',
            type: isReminder === 'true' ? 'reminder' : 'note',
          });
        }
      } catch (err) {
        console.warn('Failed to save note', err);
      }
    }
    router.back();
  };

  const handleDeleteNote = async () => {
    if (id) {
      try {
        await deleteNoteMutation({ id: id as any });
      } catch (err) {
        console.warn('Failed to delete note', err);
      }
    }
    router.back();
  };

  const handleCreateReminder = async () => {
    const finalDate = new Date(selectedDate);
    finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    const dueDateMs = finalDate.getTime();
    setDueDate(dueDateMs);
    if (reminderTitle.trim()) setTitle(reminderTitle);
    setShowReminderModal(false);
  };

  const formattedNoteDate = new Date(dueDate || Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Block Manipulation Handlers
  const updateBlockContent = useCallback((blockId: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content } : b));
  }, []);

  const toggleTodo = useCallback((blockId: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b));
  }, []);

  const addNewBlock = useCallback((afterBlockId: string, type: Block['type'] = 'text') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterBlockId);
      const newBlock: Block = { id: Math.random().toString(), type, content: '' };
      const newBlocks = [...prev];
      newBlocks.splice(idx + 1, 0, newBlock);
      setTimeout(() => blockRefs.current[newBlock.id]?.focus(), 100);
      return newBlocks;
    });
  }, []);

  const deleteBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(b => b.id === blockId);
      const newBlocks = prev.filter(b => b.id !== blockId);
      const prevBlock = prev[idx - 1];
      if (prevBlock) setTimeout(() => blockRefs.current[prevBlock.id]?.focus(), 100);
      return newBlocks;
    });
  }, [blocks]);

  const changeBlockType = useCallback((blockId: string, type: Block['type']) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, type } : b));
    setTimeout(() => blockRefs.current[blockId]?.focus(), 100);
  }, []);

  const toggleInteractiveCheckbox = useCallback(() => {
    if (!activeBlockId) return;
    setBlocks(prev => {
      const block = prev.find(b => b.id === activeBlockId);
      if (!block) return prev;
      const nextType = block.type === 'todo' ? 'text' : 'todo';
      return prev.map(b => b.id === activeBlockId ? { ...b, type: nextType } : b);
    });
  }, [activeBlockId]);

  const toggleInteractiveHeading = useCallback(() => {
    if (!activeBlockId) return;
    setBlocks(prev => {
      const block = prev.find(b => b.id === activeBlockId);
      if (!block) return prev;
      let nextType: Block['type'] = 'h1';
      if (block.type === 'h1') nextType = 'h2';
      else if (block.type === 'h2') nextType = 'h3';
      else if (block.type === 'h3') nextType = 'text';
      return prev.map(b => b.id === activeBlockId ? { ...b, type: nextType } : b);
    });
  }, [activeBlockId]);

  const toggleInteractiveBullet = useCallback(() => {
    if (!activeBlockId) return;
    setBlocks(prev => {
      const block = prev.find(b => b.id === activeBlockId);
      if (!block) return prev;
      const nextType = block.type === 'bullet' ? 'text' : 'bullet';
      return prev.map(b => b.id === activeBlockId ? { ...b, type: nextType } : b);
    });
  }, [activeBlockId]);

  const handleKeyPress = useCallback((e: any, blockId: string) => {
    if (e.nativeEvent.key === 'Enter') {
      const block = blocks.find(b => b.id === blockId);
      // User requested Enter always adds a regular new line (text) from checkbox/bullets
      if (block?.type !== 'text') {
        addNewBlock(blockId, 'text');
      }
    } else if (e.nativeEvent.key === 'Backspace') {
      const block = blocks.find(b => b.id === blockId);
      if (block?.content === '') {
        deleteBlock(blockId);
      }
    }
  }, [blocks, addNewBlock, deleteBlock]);

  const renderHeader = useCallback(() => (
    <NoteHeader 
      title={title}
      setTitle={setTitle}
      formattedNoteDate={formattedNoteDate}
      isArabic={isArabic}
      colors={colors}
      styles={styles}
    />
  ), [title, formattedNoteDate, isArabic, colors, styles]);

  const renderBlock = useCallback(({ item }: { item: Block }) => (
    <View style={[
      styles.checklistContainer, 
      { paddingHorizontal: 24, alignItems: 'flex-start' },
      (item.type === 'h1' || item.type === 'h2' || item.type === 'h3') && { marginVertical: 8 }
    ]}>
      {item.type === 'todo' && (
        <TouchableOpacity onPress={() => toggleTodo(item.id)} style={[
          styles.checkbox,
          { marginTop: 6 },
          item.checked && styles.checkboxChecked
        ]}>
          {item.checked && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </TouchableOpacity>
      )}

      {item.type === 'bullet' && (
        <View style={{ width: 24, height: 32, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 4 }} />
        </View>
      )}
      
      <TextInput
        ref={el => { blockRefs.current[item.id] = el; }}
        style={[
          styles.bodyInput,
          { 
            paddingBottom: 0, 
            marginVertical: 4,
            fontSize: item.type === 'h1' ? 32 : item.type === 'h2' ? 26 : item.type === 'h3' ? 22 : activeFontSize,
            fontWeight: (item.type === 'h1' || item.type === 'h2' || item.type === 'h3') ? '800' : activeFontWeight,
            fontFamily: activeFontFamily === 'System' ? undefined : activeFontFamily,
            color: activeFontColor,
            fontStyle: activeFontStyle,
            lineHeight: (item.type === 'h1' ? 32 : item.type === 'h2' ? 26 : item.type === 'h3' ? 22 : activeFontSize) * 1.5,
            textDecorationLine: (item.type === 'todo' && item.checked) ? 'line-through' : 'none',
            opacity: (item.type === 'todo' && item.checked) ? 0.6 : 1
          },
          isArabic && { textAlign: 'right' }
        ]}
        placeholder={item.type.startsWith('h') ? `HEADING ${item.type.charAt(1)}` : "Type away..."}
        placeholderTextColor={colors.textMuted + '60'}
        value={item.content}
        onChangeText={txt => updateBlockContent(item.id, txt)}
        onFocus={() => setActiveBlockId(item.id)}
        onKeyPress={e => handleKeyPress(e, item.id)}
        onSubmitEditing={() => {
          if (item.type !== 'text') {
            addNewBlock(item.id, 'text');
          }
        }}
        multiline={item.type === 'text'}
        blurOnSubmit={false}
      />
    </View>
  ), [activeFontSize, activeFontWeight, activeFontFamily, activeFontColor, activeFontStyle, isArabic, colors.textMuted, styles.checklistContainer, styles.checkbox, styles.checkboxChecked, styles.bodyInput, toggleTodo, updateBlockContent, handleKeyPress, addNewBlock]);

  // Calendar Helpers
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  
  const renderCalendarDays = () => {
    const cells = [];
    const isCurrentMonthSelected = selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const isActive = isCurrentMonthSelected && selectedDate.getDate() === i;
        cells.push(
          <TouchableOpacity 
            key={`day-${i}`} 
            style={[styles.dayCell, isActive && styles.dayCellActive]}
            onPress={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i))}
          >
            <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{i}</Text>
          </TouchableOpacity>
        );
    }
    return cells;
  };

  // Menus act as overlays now instead of direct cycling.

  const handleInsertLink = () => {
    if (linkText.trim() && linkUrl.trim()) {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      if (activeBlockId) updateBlockContent(activeBlockId, (blocks.find(b => b.id === activeBlockId)?.content || '') + `[${linkText}](${url})`);
      setLinkText('');
      setLinkUrl('');
      setShowLinkModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.detailSafeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.detailHeader, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={styles.detailHeaderBtn} onPress={handleSaveNote}>
            <Ionicons name="chevron-back" size={24} style={styles.detailHeaderBtnIcon} />
          </TouchableOpacity>
          
          <View style={styles.detailHeaderRight}>
            <TouchableOpacity 
              style={styles.detailHeaderBtn} 
              onPress={() => {
                  setReminderTitle(title);
                  setShowReminderModal(true);
              }}
            >
              <Ionicons name="alarm-outline" size={24} color={dueDate ? colors.primary : colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.detailHeaderBtn} onPress={() => {
               if (id) handleDeleteNote();
               else router.back();
            }}>
               <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={blocks}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderBlock}
          contentContainerStyle={{ paddingBottom: 250 }}
          style={{ flex: 1 }}
        />

        {showToolbar && (
          <View style={[
            styles.toolbarWrapper, 
            { 
              position: 'absolute', 
              bottom: Platform.OS === 'ios' ? 10 : 20, 
              left: 20, 
              right: 20,
              elevation: 5,
              zIndex: 1000
            }
          ]}>
            <View style={styles.toolbarHeader}>
               <TouchableOpacity style={styles.toolbarDismiss} onPress={() => setShowToolbar(false)}>
                  <Ionicons name="close" size={20} color="#AAA" />
               </TouchableOpacity>
            </View>
            
            <View style={[styles.toolbarRow, isArabic && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={styles.toolbarFontSelector} onPress={() => setActiveMenu('fontFamily')}>
                <Text style={styles.toolbarFontText}>
                  {activeFontFamily === 'System' || activeFontFamily === 'sans-serif' ? 'Sans Serif' : activeFontFamily}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarFontSelector} onPress={() => setActiveMenu('fontSize')}>
                <Text style={styles.toolbarFontText}>{activeFontSize}pt</Text>
                <Ionicons name="chevron-down" size={14} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveMenu('color')}>
                <Ionicons name="color-palette" size={24} color={activeFontColor} />
              </TouchableOpacity>
            </View>

            <View style={[styles.toolbarIconRow, isArabic && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={styles.toolbarIconBtn} onPress={toggleInteractiveHeading}>
                <Ionicons name="text-outline" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarIconBtn} onPress={toggleInteractiveCheckbox}>
                <Ionicons name="checkbox-outline" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarIconBtn} onPress={toggleInteractiveBullet}>
                <Ionicons name="list-outline" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarIconBtn} onPress={() => {}}>
                <Ionicons name="chevron-forward" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarIconBtn} onPress={() => {}}>
                <Ionicons name="remove-outline" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarIconBtn} onPress={() => setShowLinkModal(true)}>
                <Ionicons name="link-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Reminder Modal */}
      <Modal
        visible={showReminderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReminderModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isArabic && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowReminderModal(false)}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Reminder</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionLabel, isArabic && { textAlign: 'right' }]}>What do you want to be reminded?</Text>
              <TextInput
                style={[styles.reminderTitleInput, isArabic && { textAlign: 'right' }]}
                placeholder="Enter your title..."
                placeholderTextColor={colors.textMuted}
                value={reminderTitle}
                onChangeText={setReminderTitle}
              />

              <Text style={[styles.sectionLabel, isArabic && { textAlign: 'right' }]}>Select Date</Text>
              <View style={styles.calendarCard}>
                <View style={[styles.calendarHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                  <TouchableOpacity onPress={prevMonth}>
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.calendarTitle}>
                    {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity onPress={nextMonth}>
                    <Ionicons name="chevron-forward" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.weekDaysRow, isArabic && { flexDirection: 'row-reverse' }]}>
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                    <Text key={d} style={styles.weekDayText}>{d}</Text>
                  ))}
                </View>

                <View style={[styles.daysGrid, isArabic && { flexDirection: 'row-reverse' }]}>
                  {renderCalendarDays()}
                </View>
              </View>

              <Text style={[styles.sectionLabel, isArabic && { textAlign: 'right' }]}>Select Exact Time</Text>
              
              <View style={[styles.timePresetsRow, isArabic && { flexDirection: 'row-reverse' }, { alignItems: 'center' }]}>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="spinner"
                    style={{ flex: 1, height: 120 }}
                    onChange={(e, d) => d && setSelectedTime(d)}
                  />
                ) : (
                  <>
                    <TouchableOpacity 
                      style={[styles.timePresetBtn, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', height: 60 }]}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Ionicons name="time-outline" size={24} color={colors.text} style={{ marginRight: 8 }} />
                      <Text style={[styles.timePresetMain, { color: colors.text, fontSize: 24 }]}>
                        {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                    {showTimePicker && (
                      <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        display="default"
                        is24Hour={true}
                        onChange={(e, d) => {
                           setShowTimePicker(false);
                           if (d) setSelectedTime(d);
                        }}
                      />
                    )}
                  </>
                )}
              </View>

              <TouchableOpacity style={styles.createReminderBtn} onPress={handleCreateReminder}>
                <Text style={styles.createReminderText}>Create Reminder</Text>
              </TouchableOpacity>
              
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Link Input Modal */}
      <Modal
        visible={showLinkModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLinkModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto', marginBottom: Platform.OS === 'ios' ? 100 : 50, paddingBottom: 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Insert Link</Text>
              <TouchableOpacity onPress={() => setShowLinkModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.sectionLabel}>Display Text</Text>
            <TextInput
              style={styles.reminderTitleInput}
              placeholder="e.g., My Portfolio"
              placeholderTextColor={colors.textMuted}
              value={linkText}
              onChangeText={setLinkText}
              autoFocus
            />

            <Text style={styles.sectionLabel}>URL</Text>
            <TextInput
              style={styles.reminderTitleInput}
              placeholder="e.g., example.com"
              placeholderTextColor={colors.textMuted}
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              keyboardType="url"
            />

            <TouchableOpacity 
              style={[styles.createReminderBtn, { marginTop: 24 }]} 
              onPress={handleInsertLink}
            >
              <Text style={styles.createReminderText}>Add Link</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action Menu Bottom Sheet */}
      <Modal
        visible={activeMenu !== 'none'}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveMenu('none')}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActiveMenu('none')}
        >
          <View style={[styles.modalContent, { marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeMenu === 'fontFamily' && 'Select Font Family'}
                {activeMenu === 'fontSize' && 'Select Font Size'}
                {activeMenu === 'color' && 'Select Text Color'}
                {activeMenu === 'fontShape' && 'Select Font Style'}
              </Text>
              <TouchableOpacity onPress={() => setActiveMenu('none')}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeMenu === 'fontFamily' && ['System', 'Baskerville', 'Georgia', 'serif', 'sans-serif'].map(f => (
                <TouchableOpacity key={f} onPress={() => { setActiveFontFamily(f); setActiveMenu('none'); }} style={{ padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.text, fontFamily: f === 'System' ? undefined : f, fontSize: 18 }}>{f}</Text>
                </TouchableOpacity>
              ))}

              {activeMenu === 'fontSize' && [16, 18, 20, 24, 28, 32].map(s => (
                <TouchableOpacity key={s} onPress={() => { setActiveFontSize(s); setActiveMenu('none'); }} style={{ padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.text, fontSize: s }}>{s}pt</Text>
                </TouchableOpacity>
              ))}

              {activeMenu === 'fontShape' && [
                { label: 'Normal', weight: 'normal', style: 'normal' },
                { label: 'Thin', weight: '200', style: 'normal' },
                { label: 'Semi-Bold', weight: '600', style: 'normal' },
                { label: 'Bold', weight: 'bold', style: 'normal' },
                { label: 'Italic', weight: 'normal', style: 'italic' }
              ].map(opt => (
                <TouchableOpacity key={opt.label} onPress={() => { setActiveFontWeight(opt.weight as any); setActiveFontStyle(opt.style as any); setActiveMenu('none'); }} style={{ padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: opt.weight as any, fontStyle: opt.style as any }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}

              {activeMenu === 'color' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, justifyContent: 'space-around' }}>
                  {[colors.text, colors.primary, colors.danger, colors.success, '#FFAB00', '#A020F0', '#00BCD4'].map(c => (
                    <TouchableOpacity 
                      key={c} 
                      onPress={() => { setActiveFontColor(c); setActiveMenu('none'); }} 
                      style={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: 28, 
                        backgroundColor: c, 
                        borderWidth: 3, 
                        borderColor: activeFontColor === c ? colors.text : 'transparent',
                        shadowColor: "#000",
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3
                      }} 
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}
