import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  KeyboardEvent,
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
import { scheduleReminderNotification } from '@/utils/notifications';

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
      multiline={true}
      scrollEnabled={false}
    />
    <Text style={[styles.dateSubtitle, isArabic && { textAlign: 'right' }]}>{formattedNoteDate}</Text>
  </View>
));
NoteHeader.displayName = 'NoteHeader';

export default function NoteDetailScreen() {
  const router = useRouter();
  const { id, isReminder } = useLocalSearchParams<{ id: string, isReminder: string }>();
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const styles = useMemo(() => createNotesStyles(colors, isArabic), [colors, isArabic]);
  const insets = useSafeAreaInsets();

  // Note State
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<number>(0);
  const [isScheduleVisible, setScheduleVisible] = useState(isReminder === 'true');
  const [dateTimeConfirmed, setDateTimeConfirmed] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  interface Block {
    id: string;
    type: 'text' | 'todo' | 'h1' | 'h2' | 'h3' | 'bullet';
    content: string;
    checked?: boolean;
    color?: string;
  }
  const [blocks, setBlocks] = useState<Block[]>([{ id: 'first', type: 'text', content: '' }]);
  const blockRefs = useRef<{ [key: string]: TextInput | null }>({});
  const scrollViewRef = useRef<FlatList | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Typography State
  const [activeFontSize, setActiveFontSize] = useState(18);
  const [activeFontFamily, setActiveFontFamily] = useState(Platform.OS === 'ios' ? 'Baskerville' : 'serif');
  const [activeFontColor, setActiveFontColor] = useState(colors.text);
  const [activeFontWeight, setActiveFontWeight] = useState<'normal' | '200' | '600' | 'bold'>('normal');
  const [activeFontStyle, setActiveFontStyle] = useState<'normal' | 'italic'>('normal');

  type ActiveMenuType = 'none' | 'fontFamily' | 'fontSize' | 'color' | 'fontShape';
  const [activeMenu, setActiveMenu] = useState<ActiveMenuType>('none');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

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

  // Custom Calendar State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Custom Exact Time state
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Queries & Mutations
  const existingNote = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : 'skip')?.find((t: any) => t._id === id);
  const addNote = useOfflineMutation(api.todos.addTodo, "todos:addTodo");
  const updateNote = useOfflineMutation(api.todos.updateTodo, "todos:updateTodo");
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
        setScheduleVisible(true);
        setDateTimeConfirmed(true);
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
            dueDate: isScheduleVisible ? (dueDate || Date.now()) : undefined,
            date: isScheduleVisible ? (dueDate || Date.now()) : Date.now(),
            status: 'not_started',
            type: isScheduleVisible ? 'reminder' : 'note',
          });
        } else {
          await updateNote({
            id: id as any,
            text: title.trim() || 'Untitled',
            description: bodyStr.trim(),
            dueDate: isScheduleVisible ? (dueDate || Date.now()) : 0,
            type: isScheduleVisible ? 'reminder' : 'note',
          });
        }
        // Schedule sound notification for reminders with future due dates
        if (isScheduleVisible) {
          const reminderDate = dueDate || Date.now();
          if (reminderDate > Date.now()) {
            await scheduleReminderNotification(
              title.trim() || 'Untitled',
              reminderDate,
              language
            );
          }
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

  const formattedNoteDate = new Date(dueDate || Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Block Manipulation Handlers
  const handleBlockTextChange = useCallback((blockId: string, newContent: string) => {
    // Check if a newline was added somewhere in the content
    if (newContent.includes('\n')) {
      const parts = newContent.split('\n');
      const textBefore = parts[0];
      const textAfter = parts.slice(1).join('\n');

      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === blockId);
        if (idx === -1) return prev;
        
        const currentBlock = prev[idx];
        const newBlocks = [...prev];
        
        // Update current block content
        newBlocks[idx] = { ...currentBlock, content: textBefore };
        
        // Create new block inheriting type if checkbox or bullet
        const newType = (currentBlock.type === 'todo' || currentBlock.type === 'bullet') 
          ? currentBlock.type 
          : 'text';
          
        const newBlock: Block = { 
          id: Math.random().toString(), 
          type: newType, 
          content: textAfter, 
          color: activeFontColor 
        };
        
        newBlocks.splice(idx + 1, 0, newBlock);
        
        setTimeout(() => {
          blockRefs.current[newBlock.id]?.focus();
          // If we inserted in the middle, we might need to scroll
          scrollToBottom();
        }, 50);
        
        return newBlocks;
      });
      return;
    }
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content: newContent } : b));
  }, [activeFontColor]);

  const changeActiveColor = useCallback((color: string) => {
    setActiveFontColor(color);
    if (activeBlockId) {
      setBlocks(prev => prev.map(b => b.id === activeBlockId ? { ...b, color } : b));
    }
  }, [activeBlockId]);

  const toggleTodo = useCallback((blockId: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b));
  }, []);

  const addNewBlock = useCallback((afterBlockId: string, type: Block['type'] = 'text') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterBlockId);
      const newBlock: Block = { id: Math.random().toString(), type, content: '', color: activeFontColor };
      const newBlocks = [...prev];
      newBlocks.splice(idx + 1, 0, newBlock);
      setTimeout(() => {
        blockRefs.current[newBlock.id]?.focus();
        scrollToBottom();
      }, 100);
      return newBlocks;
    });
  }, [scrollToBottom, activeFontColor]);

  const deleteBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(b => b.id === blockId);
      const newBlocks = prev.filter(b => b.id !== blockId);
      const prevBlock = prev[idx - 1];
      if (prevBlock) setTimeout(() => blockRefs.current[prevBlock.id]?.focus(), 100);
      return newBlocks;
    });
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
    if (e.nativeEvent.key === 'Backspace') {
      const block = blocks.find(b => b.id === blockId);
      if (block?.content === '') {
        deleteBlock(blockId);
      }
    }
  }, [blocks, deleteBlock]);

  const renderHeader = useCallback(() => (
    <TouchableOpacity 
      activeOpacity={1} 
      onPress={() => {
        Keyboard.dismiss();
        if (blocks.length > 0) {
          const firstBlock = blocks[0];
          setActiveBlockId(firstBlock.id);
          setTimeout(() => {
            blockRefs.current[firstBlock.id]?.focus();
          }, 100);
        }
      }}
    >
      <NoteHeader 
        title={title}
        setTitle={setTitle}
        formattedNoteDate={formattedNoteDate}
        isArabic={isArabic}
        colors={colors}
        styles={styles}
      />
    </TouchableOpacity>
  ), [title, formattedNoteDate, isArabic, colors, styles, blocks]);

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
            color: item.color || activeFontColor,
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
        onChangeText={txt => handleBlockTextChange(item.id, txt)}
        onFocus={() => setActiveBlockId(item.id)}
        onKeyPress={e => handleKeyPress(e, item.id)}
        onSubmitEditing={() => {
          if (item.type !== 'text') {
            addNewBlock(item.id, 'text');
          }
        }}
        multiline={true}
        blurOnSubmit={false}
      />
    </View>
  ), [activeFontSize, activeFontWeight, activeFontFamily, activeFontColor, activeFontStyle, isArabic, colors.textMuted, styles.checklistContainer, styles.checkbox, styles.checkboxChecked, styles.bodyInput, toggleTodo, handleBlockTextChange, handleKeyPress, addNewBlock]);

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

  return (
    <SafeAreaView style={[styles.detailSafeArea, { flex: 1 }]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={[styles.detailHeader, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity style={styles.detailHeaderBtn} onPress={handleSaveNote}>
            <Ionicons name="chevron-back" size={24} style={styles.detailHeaderBtnIcon} />
          </TouchableOpacity>
          
          <View style={styles.detailHeaderRight}>
            <TouchableOpacity 
              style={[styles.detailHeaderBtn, isScheduleVisible && { backgroundColor: colors.warning + '20' }]} 
              onPress={() => {
                if (isScheduleVisible && dateTimeConfirmed) {
                  // Re-open picker to edit
                  setDateTimeConfirmed(false);
                } else {
                  setScheduleVisible(!isScheduleVisible);
                  setDateTimeConfirmed(false);
                }
              }}
            >
               <Ionicons 
                 name={isScheduleVisible ? "alarm" : "alarm-outline"} 
                 size={22} 
                 color={isScheduleVisible ? colors.warning : colors.text} 
               />
            </TouchableOpacity>
            <TouchableOpacity style={styles.detailHeaderBtn} onPress={handleSaveNote}>
               <Ionicons name="checkmark" size={24} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.detailHeaderBtn} onPress={() => {
               if (id) handleDeleteNote();
               else router.back();
            }}>
               <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef as any}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 60 : 80 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}
          
          {isScheduleVisible && (
            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
              {dateTimeConfirmed ? (
                // Collapsed summary chip
                <TouchableOpacity
                  onPress={() => setDateTimeConfirmed(false)}
                  style={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: colors.warning + '18',
                    borderWidth: 1,
                    borderColor: colors.warning + '50',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Ionicons name="alarm" size={18} color={colors.warning} />
                  <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 14 }}>
                    {new Date(dueDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {'  '}
                    {new Date(dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons name="pencil-outline" size={14} color={colors.warning} />
                </TouchableOpacity>
              ) : (
                // Full picker
                <View style={styles.inlineReminderHeader}>
                  <Text style={[styles.inlineReminderTitle, isArabic && { textAlign: 'right' }]}>
                    {isArabic ? 'موعد التذكير' : 'Reminder Schedule'}
                  </Text>
                  
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

                  <View style={[styles.timePresetsRow, isArabic && { flexDirection: 'row-reverse' }, { alignItems: 'center', marginTop: 16 }]}>
                    {Platform.OS === 'ios' ? (
                      <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        display="spinner"
                        themeVariant={isDarkMode ? 'dark' : 'light'}
                        style={{ flex: 1, height: 100 }}
                        onChange={(e, d) => {
                          if (d) {
                            setSelectedTime(d);
                            const finalDate = new Date(selectedDate);
                            finalDate.setHours(d.getHours(), d.getMinutes(), 0, 0);
                            setDueDate(finalDate.getTime());
                          }
                        }}
                      />
                    ) : (
                      <>
                        <TouchableOpacity 
                          style={[styles.timePresetBtn, { backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 12 }]}
                          onPress={() => setShowTimePicker(true)}
                        >
                          <Ionicons name="time-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
                          <Text style={[styles.timePresetMain, { color: colors.text, fontSize: 18 }]}>
                            {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </TouchableOpacity>
                        {showTimePicker && (
                          <DateTimePicker
                            value={selectedTime}
                            mode="time"
                            display="default"
                            themeVariant={isDarkMode ? 'dark' : 'light'}
                            is24Hour={true}
                            onChange={(e, d) => {
                               setShowTimePicker(false);
                               if (d) {
                                 setSelectedTime(d);
                                 const finalDate = new Date(selectedDate);
                                 finalDate.setHours(d.getHours(), d.getMinutes(), 0, 0);
                                 setDueDate(finalDate.getTime());
                               }
                            }}
                          />
                        )}
                      </>
                    )}
                  </View>

                  {/* Confirm button */}
                  <TouchableOpacity
                    onPress={() => {
                      const finalDate = new Date(selectedDate);
                      finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                      setDueDate(finalDate.getTime());
                      setDateTimeConfirmed(true);
                    }}
                    style={{
                      marginTop: 16,
                      backgroundColor: colors.warning,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>
                      {isArabic ? 'تأكيد الموعد' : 'Confirm Date & Time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {blocks.map((item) => (
            <React.Fragment key={item.id}>
              {renderBlock({ item })}
            </React.Fragment>
          ))}

          <TouchableOpacity 
            style={{ height: 100, padding: 24 }}
            onPress={() => {
              Keyboard.dismiss();
              if (blocks.length > 0) {
                const lastBlock = blocks[blocks.length - 1];
                setActiveBlockId(lastBlock.id);
                setTimeout(() => {
                  blockRefs.current[lastBlock.id]?.focus();
                }, 100);
              }
            }}
            activeOpacity={1}
          >
            <Text style={{ color: colors.textMuted, opacity: 0.5 }}>
              {isArabic ? 'اضغط للإضافة...' : 'Tap to add more...'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
          </View>
        </TouchableWithoutFeedback>
          {/* Toolbar — always anchored above keyboard */}
          <View style={[
            styles.toolbarWrapper,
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: keyboardHeight > 0 ? 25 : insets.bottom,
              backgroundColor: '#1A1A1A',
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderTopWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              zIndex: 100,
            }
          ]}>
            <View style={[
              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
              isArabic && { flexDirection: 'row-reverse' }
            ]}>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <TouchableOpacity style={styles.toolbarIconBtn} onPress={toggleInteractiveHeading}>
                  <Ionicons name="text-outline" size={22} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolbarIconBtn} onPress={toggleInteractiveCheckbox}>
                  <Ionicons name="checkbox-outline" size={22} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolbarIconBtn} onPress={toggleInteractiveBullet}>
                  <Ionicons name="list-outline" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setActiveMenu('fontSize')} style={{ paddingHorizontal: 4 }}>
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>{activeFontSize}pt</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveMenu('color')}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: activeFontColor, borderWidth: 2, borderColor: '#FFF' }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveMenu('fontFamily')}>
                  <Ionicons name="language-outline" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </KeyboardAvoidingView>

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

              {activeMenu === 'color' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, justifyContent: 'space-around' }}>
                  {[colors.text, colors.primary, colors.danger, colors.success, '#FFAB00', '#A020F0', '#00BCD4'].map(c => (
                    <TouchableOpacity 
                      key={c} 
                      onPress={() => { changeActiveColor(c); setActiveMenu('none'); }} 
                      style={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: 28, 
                        backgroundColor: c, 
                        borderWidth: 3, 
                        borderColor: activeFontColor === c ? '#FFF' : 'transparent',
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
