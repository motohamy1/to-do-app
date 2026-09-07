import { createNotesStyles } from '@/assets/styles/notes.styles';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import useTheme from '@/hooks/useTheme';
import { useTranslation } from '@/utils/i18n';
import { scheduleReminderNotification } from '@/utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  StyleSheet,
} from 'react-native';
import { useMutation, useAction, useQuery } from 'convex/react';
import { AudioPlayerCard } from '@/components/AudioPlayerCard';
import { VoiceWaveform } from '@/components/VoiceWaveform';
import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';
import NoteAIChatSheet from '@/components/NoteAIChatSheet';
import NoteAIResultModal, { AIResultData, ExtractedTaskItem } from '@/components/NoteAIResultModal';
import NoteBodyEditor, {
  ActiveBlockInfo,
  NoteBodyEditorHandle,
} from '@/components/NoteBodyEditor';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { AIChatMessage } from '@/types/voiceNote';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboard } from '@/hooks/useKeyboard';

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
}) => {
  const [titleHeight, setTitleHeight] = React.useState(0);
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
      <TextInput
        style={[styles.titleInput, isArabic && { textAlign: 'right' }, { height: Math.max(44, titleHeight) }]}
        placeholder={isArabic ? 'عنوان الملاحظة' : 'Note Title'}
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
        blurOnSubmit={true}
        multiline={true}
        scrollEnabled={false}
        onContentSizeChange={(e) => setTitleHeight(e.nativeEvent.contentSize.height)}
      />
      <Text style={[styles.dateSubtitle, isArabic && { textAlign: 'right' }]}>{formattedNoteDate}</Text>
    </View>
  );
});
NoteHeader.displayName = 'NoteHeader';

export default function NoteDetailScreen() {
  const router = useRouter();
  const { id, isReminder, tag } = useLocalSearchParams<{ id: string; isReminder: string; tag?: string }>();
  const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(id);
  const { colors, isDarkMode } = useTheme();
  const isDark = isDarkMode;
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);
  const styles = useMemo(() => createNotesStyles(colors, isArabic, isDark), [colors, isArabic, isDark]);
  const insets = useSafeAreaInsets();

  // Note State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const cursorPosRef = useRef<number>(0);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [localChatHistory, setLocalChatHistory] = useState<AIChatMessage[]>([]);
  const [noteTag, setNoteTag] = useState<string>(tag || '#work');
  const [dueDate, setDueDate] = useState<number>(0);
  const [isScheduleVisible, setScheduleVisible] = useState(isReminder === 'true');
  const [dateTimeConfirmed, setDateTimeConfirmed] = useState(false);

  const bodyEditorRef = useRef<NoteBodyEditorHandle>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const activeLineYRef = useRef<{ y: number; h: number } | null>(null);
  const editorTopRef = useRef(0);

  const scrollToBottom = () => {
    setTimeout(() => {
      (scrollViewRef.current as any)?.scrollToEnd?.({ animated: true });
    }, 100);
  };

  // Typography & Active Block State
  const [activeFontSize, setActiveFontSize] = useState(17);
  const [activeFontFamily, setActiveFontFamily] = useState(Platform.OS === 'ios' ? 'System' : 'sans-serif');
  const [activeFontColor, setActiveFontColor] = useState(colors.text);
  const [activeFontWeight, setActiveFontWeight] = useState<'normal' | 'bold'>('normal');
  const [activeFontStyle, setActiveFontStyle] = useState<'normal' | 'italic'>('normal');

  const [activeBlockInfo, setActiveBlockInfo] = useState<ActiveBlockInfo>({
    blockType: 'normal',
    isChecked: false,
    hasSelection: false,
    selectedText: '',
    isBold: false,
    isItalic: false,
    isStrike: false,
  });

  const isH1Active = activeBlockInfo.blockType === 'h1';
  const isH2Active = activeBlockInfo.blockType === 'h2';
  const isH3Active = activeBlockInfo.blockType === 'h3';
  const isChecklistActive = activeBlockInfo.blockType === 'checkbox';
  const isBulletActive = activeBlockInfo.blockType === 'bullet';
  const isNumberActive = activeBlockInfo.blockType === 'number';
  const isQuoteActive = activeBlockInfo.blockType === 'quote';
  const isBoldActive = activeBlockInfo.isBold;
  const isItalicActive = activeBlockInfo.isItalic;
  const isStrikeActive = activeBlockInfo.isStrike;

  type ActiveMenuType = 'none' | 'typography' | 'fontFamily' | 'fontSize' | 'color';
  const [activeMenu, setActiveMenu] = useState<ActiveMenuType>('none');
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();

  const keepCaretVisible = useCallback((y: number | null) => {
    if (y === null && activeLineYRef.current) y = activeLineYRef.current.y;
    if (y === null || y === undefined) return;
    const editorTop = editorTopRef.current;
    const target = Math.max(0, editorTop + y - 120);
    requestAnimationFrame(() =>
      scrollViewRef.current?.scrollTo({ y: target, animated: true })
    );
  }, []);

  const handleActiveLineMove = useCallback((y: number, h: number) => {
    activeLineYRef.current = { y, h };
    keepCaretVisible(y);
  }, [keepCaretVisible]);

  useEffect(() => {
    if (activeLineYRef.current && isKeyboardVisible) {
      const timer = setTimeout(() => {
        if (activeLineYRef.current) {
          keepCaretVisible(activeLineYRef.current.y);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isKeyboardVisible, keyboardHeight, keepCaretVisible]);

  // Custom Calendar State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Voice & AI State
  const [isAIChatVisible, setAIChatVisible] = useState(false);
  const [isAIResultVisible, setAIResultVisible] = useState(false);
  const [aiResultData, setAiResultData] = useState<AIResultData | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const {
    isRecording,
    duration: recordingDuration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Queries & Mutations
  const existingNote = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : 'skip')?.find((t: any) => t._id === id);
  const addNote = useOfflineMutation(api.todos.addTodo, 'todos:addTodo');
  const updateNote = useOfflineMutation(api.todos.updateTodo, 'todos:updateTodo');
  const deleteNoteMutation = useOfflineMutation(api.todos.deleteTodo, 'todos:deleteTodo');

  const generateAudioUploadUrl = useMutation(api.audio.generateAudioUploadUrl);
  const attachAudioToNote = useMutation(api.audio.attachAudioToNote);
  const removeAudioFromNote = useMutation(api.audio.removeAudioFromNote);
  const transcribeAudioAction = useAction(api.audio.transcribeAudio);
  const generateNoteSummaryAction = useAction(api.aiNotes.generateNoteSummary);
  const extractActionItemsAction = useAction(api.aiNotes.extractActionItems);
  const chatWithNoteAction = useAction(api.aiNotes.chatWithNote);
  const convertActionItemsToTasks = useMutation(api.aiNotes.convertActionItemsToTasks);
  const clearNoteChatHistoryMutation = useMutation(api.aiNotes.clearNoteChatHistory);

  const audioUrl = useQuery(
    api.audio.getAudioUrl,
    existingNote?.audioStorageId ? { storageId: existingNote.audioStorageId } : 'skip'
  );
  const lastLoadedNoteIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setCurrentNoteId(id);
    if (id !== lastLoadedNoteIdRef.current) {
      // Switched note ID or brand new note -> immediately reset chat state
      lastLoadedNoteIdRef.current = id;
      setLocalChatHistory([]);
    }

    if (existingNote && existingNote._id === id) {
      setTitle(existingNote.text || '');
      setBody(existingNote.description || '');
      if (existingNote.hashtags && existingNote.hashtags.length > 0) {
        setNoteTag(existingNote.hashtags[0]);
      } else {
        setNoteTag(tag || '#work');
      }
      setLocalChatHistory(existingNote.aiChatHistory || []);
      setCurrentTranscript(existingNote.transcript || '');
      if (existingNote.dueDate) {
        setDueDate(existingNote.dueDate);
        const d = new Date(existingNote.dueDate);
        setSelectedDate(d);
        setCurrentMonth(d);
        setSelectedTime(d);
        setScheduleVisible(true);
        setDateTimeConfirmed(true);
      } else {
        setDueDate(0);
        setScheduleVisible(isReminder === 'true');
        setDateTimeConfirmed(false);
      }
    } else {
      setTitle('');
      setBody('');
      setNoteTag(tag || '#work');
      setLocalChatHistory([]);
      setCurrentTranscript('');
      setDueDate(0);
      setScheduleVisible(isReminder === 'true');
      setDateTimeConfirmed(false);
    }
  }, [id, existingNote, tag, isReminder]);

  const isSavingRef = useRef(false);

  const handleSaveNote = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    const bodyStr = body.trim();
    if (!title.trim() && !bodyStr) {
      router.back();
      return;
    }
    
    if (userId) {
      try {
        if (!id) {
          await addNote({
            userId,
            text: title.trim() || 'Untitled',
            description: bodyStr,
            dueDate: isScheduleVisible ? (dueDate || Date.now()) : undefined,
            date: isScheduleVisible ? (dueDate || Date.now()) : Date.now(),
            status: 'not_started',
            type: isScheduleVisible ? 'reminder' : 'note',
            hashtags: [noteTag || '#work'],
          });
        } else {
          await updateNote({
            id: id as any,
            text: title.trim() || 'Untitled',
            description: bodyStr,
            dueDate: isScheduleVisible ? (dueDate || Date.now()) : 0,
            type: isScheduleVisible ? 'reminder' : 'note',
            hashtags: [noteTag || '#work'],
          });
        }
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

  const handleClearAIChat = async () => {
    setLocalChatHistory([]);
    const targetId = currentNoteId || id;
    if (targetId) {
      try {
        await clearNoteChatHistoryMutation({ noteId: targetId as any });
      } catch (err) {
        console.warn('Could not clear remote chat history:', err);
      }
    }
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
    year: 'numeric',
  });

  const handleToggleRecording = async () => {
    if (isRecording) {
      const result = await stopRecording();
      if (result) {
        await handleVoiceRecordingFinished(result);
      }
    } else {
      await startRecording();
    }
  };

  const handleVoiceRecordingFinished = async (result: { uri: string; duration: number }) => {
    let targetId = currentNoteId || id;
    if (!targetId && userId) {
      try {
        const newId = await addNote({
          userId,
          text: title.trim() || (isArabic ? 'ملاحظة صوتية جديدة' : 'New Voice Note'),
          type: 'note',
          description: body,
        });
        if (newId) {
          targetId = newId;
          setCurrentNoteId(newId);
        }
      } catch (createErr) {
        console.warn('Could not auto-create note for audio recording:', createErr);
      }
    }

    try {
      setIsTranscribing(true);

      const uploadUrl = await generateAudioUploadUrl();
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, result.uri, {
        httpMethod: 'POST',
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': 'audio/m4a',
        },
      });

      if (uploadResult.status !== 200) {
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }

      const { storageId } = JSON.parse(uploadResult.body);

      if (targetId) {
        try {
          await attachAudioToNote({
            noteId: targetId as any,
            storageId,
            duration: Math.round(result.duration),
          });
        } catch (attachErr) {
          console.warn('Could not attach audio metadata:', attachErr);
        }
      }

      const transcribeRes = await transcribeAudioAction({
        noteId: targetId ? (targetId as any) : undefined,
        storageId,
        languageHint: isArabic ? 'ar' : 'en',
      });

      if (transcribeRes?.transcript) {
        const transText = transcribeRes.transcript.trim();
        setCurrentTranscript(transText);

        const insertPos = cursorPosRef.current ?? body.length;
        const before = body.slice(0, insertPos);
        const after = body.slice(insertPos);
        const needsSpace = before.length > 0 && !before.endsWith('\n') && !before.endsWith(' ');
        const inserted = (needsSpace ? ' ' : '') + transText;
        const newBody = before + inserted + after;
        setBody(newBody);

        const newPos = insertPos + inserted.length;
        cursorPosRef.current = newPos;
        setSelection({ start: newPos, end: newPos });
      }
    } catch (err) {
      console.warn('Failed to upload/transcribe audio:', err);
      Alert.alert(t.audioUploadError || 'Audio Error', t.audioUploadErrorDesc || 'Failed to upload or transcribe audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDeleteAudio = async () => {
    if (!id) return;
    try {
      await removeAudioFromNote({ noteId: id as any });
      setCurrentTranscript('');
    } catch (err) {
      console.warn('Failed to remove audio from note:', err);
    }
  };

  const handleRetryTranscribe = async () => {
    if (!existingNote?.audioStorageId) return;
    try {
      setIsTranscribing(true);
      const transcribeRes = await transcribeAudioAction({
        noteId: id ? (id as any) : undefined,
        storageId: existingNote.audioStorageId,
        languageHint: isArabic ? 'ar' : 'en',
      });
      if (transcribeRes?.transcript) {
        const transText = transcribeRes.transcript.trim();
        setCurrentTranscript(transText);
        
        const insertPos = cursorPosRef.current ?? body.length;
        const before = body.slice(0, insertPos);
        const after = body.slice(insertPos);
        const needsSpace = before.length > 0 && !before.endsWith('\n') && !before.endsWith(' ');
        const inserted = (needsSpace ? ' ' : '') + transText;
        setBody(before + inserted + after);
      }
    } catch (err) {
      console.warn('Error retrying transcription:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // AI Quick Actions
  const handleSummarizeNote = async () => {
    try {
      setAiResultData({
        type: 'summary',
        summary: '',
        keyTakeaways: [],
      });
      setAIResultVisible(true);
      setIsAILoading(true);

      const res = await generateNoteSummaryAction({
        noteId: id ? (id as any) : undefined,
        title: title.trim() || 'Untitled Note',
        content: body,
        transcript: currentTranscript || existingNote?.transcript || '',
        language: isArabic ? 'ar' : 'en',
      });

      if (res?.summary) {
        setAiResultData({
          type: 'summary',
          summary: res.summary,
          keyTakeaways: res.keyTakeaways || [],
        });
      } else {
        setAIResultVisible(false);
        Alert.alert('AI Notice', isArabic ? 'لم يتم العثور على محتوى كافٍ لإنشاء ملخص.' : 'Not enough content to generate a summary.');
      }
    } catch (err) {
      console.warn('Error generating AI summary:', err);
      setAIResultVisible(false);
      Alert.alert('AI Error', 'Could not generate note summary. Please try again.');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleExtractTasks = async () => {
    try {
      setAiResultData({
        type: 'tasks',
        tasks: [],
      });
      setAIResultVisible(true);
      setIsAILoading(true);

      const res = await extractActionItemsAction({
        noteId: id ? (id as any) : undefined,
        title: title.trim() || 'Untitled Note',
        content: body,
        transcript: currentTranscript || existingNote?.transcript || '',
        language: isArabic ? 'ar' : 'en',
      });

      if (res?.tasks && res.tasks.length > 0) {
        setAiResultData({
          type: 'tasks',
          tasks: res.tasks,
        });
      } else {
        setAIResultVisible(false);
        Alert.alert('AI Notice', isArabic ? 'لم يتم العثور على مهام قابلة للتنفيذ في الملاحظة.' : 'No action items or tasks found in note.');
      }
    } catch (err) {
      console.warn('Error extracting action items:', err);
      setAIResultVisible(false);
      Alert.alert('AI Error', 'Could not extract action items. Please try again.');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleInsertSummaryToNote = (summaryContent: string) => {
    const header = isArabic ? '\n\n📝 **الملخص التنفيذي:**\n' : '\n\n📝 **Executive Summary:**\n';
    const insertPos = cursorPosRef.current ?? body.length;
    const before = body.slice(0, insertPos);
    const after = body.slice(insertPos);
    const needsSpace = before.length > 0 && !before.endsWith('\n') && !before.endsWith(' ');
    const inserted = (needsSpace ? '\n\n' : '') + header + summaryContent;
    setBody(before + inserted + after);
    scrollToBottom();
  };

  const handleAddTasksToTodoList = async (selectedTasks: ExtractedTaskItem[]) => {
    if (id) {
      await convertActionItemsToTasks({
        noteId: id as any,
        tasks: selectedTasks,
      });
    } else if (userId) {
      for (const item of selectedTasks) {
        await addNote({
          userId,
          text: item.text,
          type: 'task',
          priority: item.priority || 'medium',
          isCompleted: false,
          status: 'not_started',
          date: Date.now(),
        });
      }
    }
  };

  const handleInsertTasksAsChecklist = (tasks: ExtractedTaskItem[]) => {
    const header = isArabic ? '\n\n📋 **المهام المستخرجة:**\n' : '\n\n📋 **Extracted Tasks:**\n';
    const checklistText = tasks.map((t) => `- [ ] ${t.text}`).join('\n');
    const insertPos = cursorPosRef.current ?? body.length;
    const before = body.slice(0, insertPos);
    const after = body.slice(insertPos);
    const needsSpace = before.length > 0 && !before.endsWith('\n') && !before.endsWith(' ');
    const inserted = (needsSpace ? '\n\n' : '') + header + checklistText;
    setBody(before + inserted + after);
    scrollToBottom();
  };

  const handleExplainNote = async () => {
    try {
      setIsAILoading(true);
      setAIChatVisible(true);
      const userPrompt = isArabic
        ? 'يرجى تقديم شرح وافٍ ومبسط للنقاط والمفاهيم الرئيسية في هذه الملاحظة والتسجيل الصوتي.'
        : 'Please explain the main concepts and key points in this note and voice recording in a clear, easy-to-understand way.';

      const userMsg: AIChatMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        content: userPrompt,
        timestamp: Date.now(),
      };
      const updatedHistory = [...localChatHistory, userMsg];
      setLocalChatHistory(updatedHistory);

      const res = await chatWithNoteAction({
        noteId: currentNoteId ? (currentNoteId as any) : (id ? (id as any) : undefined),
        title: title.trim() || 'Untitled Note',
        content: body,
        transcript: currentTranscript || existingNote?.transcript || '',
        message: userPrompt,
        chatHistory: updatedHistory,
        language: isArabic ? 'ar' : 'en',
      });

      if (res?.reply) {
        setLocalChatHistory((prev) => [
          ...prev,
          { id: `${Date.now()}-model`, role: 'model', content: res.reply, timestamp: Date.now() },
        ]);
      }
    } catch (err) {
      console.warn('Error in AI explain:', err);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSendAIChat = async (msg: string) => {
    try {
      setIsAILoading(true);
      const userMsg: AIChatMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        content: msg,
        timestamp: Date.now(),
      };
      const updatedHistory = [...localChatHistory, userMsg];
      setLocalChatHistory(updatedHistory);

      const res = await chatWithNoteAction({
        noteId: currentNoteId ? (currentNoteId as any) : (id ? (id as any) : undefined),
        title: title.trim() || 'Untitled Note',
        content: body,
        transcript: currentTranscript || existingNote?.transcript || '',
        message: msg,
        chatHistory: updatedHistory,
        language: isArabic ? 'ar' : 'en',
      });

      if (res?.reply) {
        setLocalChatHistory((prev) => [
          ...prev,
          { id: `${Date.now()}-model`, role: 'model', content: res.reply, timestamp: Date.now() },
        ]);
      }
    } catch (err) {
      console.warn('Error in AI chat:', err);
      Alert.alert('AI Error', 'Could not send AI message. Please try again.');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleInsertToNote = (content: string) => {
    const insertPos = cursorPosRef.current ?? body.length;
    const before = body.slice(0, insertPos);
    const after = body.slice(insertPos);
    const needsSpace = before.length > 0 && !before.endsWith('\n') && !before.endsWith(' ');
    const inserted = (needsSpace ? '\n\n' : '') + content;
    setBody(before + inserted + after);
    setAIChatVisible(false);
    scrollToBottom();
  };

  const handleInsertTranscript = () => {
    const trans = currentTranscript || existingNote?.transcript;
    if (!trans) return;
    const insertPos = cursorPosRef.current ?? body.length;
    const before = body.slice(0, insertPos);
    const after = body.slice(insertPos);
    const needsSpace = before.length > 0 && !before.endsWith('\n') && !before.endsWith(' ');
    const inserted = (needsSpace ? '\n\n' : '') + trans;
    setBody(before + inserted + after);
    scrollToBottom();
  };

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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: isDark ? '#0e0f14' : colors.bg }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingTop: insets.top + 60,
            paddingBottom: isKeyboardVisible ? 140 : Math.max(insets.bottom + 20, 80),
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {/* Note Title & Date */}
          <NoteHeader 
            title={title}
            setTitle={setTitle}
            formattedNoteDate={formattedNoteDate}
            isArabic={isArabic}
            colors={colors}
            styles={styles}
          />

          {/* Inline Active Voice Recording Studio */}
          {isRecording && (
            <View
              style={{
                marginHorizontal: 20,
                marginBottom: 16,
                padding: 14,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.25)',
                flexDirection: isArabic ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' }} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#EF4444' }}>
                  {formatRecordingTime(recordingDuration)}
                </Text>
                <View style={{ flex: 1, height: 36, overflow: 'hidden' }}>
                  <VoiceWaveform isListening={isRecording} audioLevel={audioLevel} />
                </View>
              </View>
              <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={cancelRecording}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleToggleRecording}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EF4444' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                    {isArabic ? 'تم' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Audio Player Card */}
          {existingNote?.audioStorageId && (
            <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
              <AudioPlayerCard
                audioUrl={audioUrl || null}
                duration={existingNote.audioDuration || 0}
                transcript={currentTranscript || existingNote.transcript}
                transcriptStatus={isTranscribing ? 'transcribing' : currentTranscript || existingNote.transcript ? 'completed' : 'none'}
                onDeleteAudio={handleDeleteAudio}
                onRetryTranscribe={handleRetryTranscribe}
                isArabic={isArabic}
              />
            </View>
          )}

          {/* Reminder / Calendar Scheduler */}
          {isScheduleVisible && (
            <View style={[styles.calendarCard, { marginHorizontal: 20, marginBottom: 16 }]}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={prevMonth} style={{ padding: 4 }}>
                  <Ionicons name={isArabic ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>
                  {currentMonth.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={{ padding: 4 }}>
                  <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekDaysRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Text key={`weekday-${index}`} style={styles.weekDayText}>{day}</Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {renderCalendarDays()}
              </View>

              {dateTimeConfirmed ? (
                <View style={{ marginTop: 16, padding: 14, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="notifications" size={18} color={colors.warning} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                        {isArabic ? 'موعد التنبيه المحدد:' : 'Scheduled Reminder:'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setDateTimeConfirmed(false)}
                      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.warning + '20' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning }}>
                        {isArabic ? 'تعديل' : 'Edit'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.warning, marginTop: 6, textAlign: isArabic ? 'right' : 'left' }}>
                    {new Date(dueDate).toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingTop: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: isArabic ? 'right' : 'left' }}>
                    {isArabic ? 'وقت التنبيه السريع:' : 'Quick Notification Time:'}
                  </Text>
                  <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { label: isArabic ? '9:00 ص' : '9:00 AM', h: 9, m: 0 },
                      { label: isArabic ? '12:00 م' : '12:00 PM', h: 12, m: 0 },
                      { label: isArabic ? '3:00 م' : '3:00 PM', h: 15, m: 0 },
                      { label: isArabic ? '6:00 م' : '6:00 PM', h: 18, m: 0 },
                      { label: isArabic ? '9:00 م' : '9:00 PM', h: 21, m: 0 },
                    ].map((preset, idx) => {
                      const isPresetActive = selectedTime.getHours() === preset.h && selectedTime.getMinutes() === preset.m;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            const d = new Date(selectedTime);
                            d.setHours(preset.h, preset.m, 0, 0);
                            setSelectedTime(d);
                          }}
                          style={[
                            {
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: isPresetActive ? colors.primary : colors.border,
                              backgroundColor: isPresetActive ? colors.primary + '20' : 'transparent',
                            },
                          ]}
                        >
                          <Text style={{ fontSize: 12, fontWeight: isPresetActive ? '700' : '500', color: isPresetActive ? colors.primary : colors.text }}>
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(true)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Ionicons name="time-outline" size={14} color={colors.text} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                        {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showTimePicker && (
                    <>
                      {Platform.OS === 'ios' ? (
                        <Modal transparent animationType="fade" visible={showTimePicker}>
                          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                            <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 16, width: '80%', alignItems: 'center' }}>
                              <DateTimePicker
                                value={selectedTime}
                                mode="time"
                                display="spinner"
                                onChange={(_, date) => {
                                  if (date) setSelectedTime(date);
                                }}
                              />
                              <TouchableOpacity
                                onPress={() => setShowTimePicker(false)}
                                style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 8 }}
                              >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.done || 'Done'}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </Modal>
                      ) : (
                        <DateTimePicker
                          value={selectedTime}
                          mode="time"
                          is24Hour={false}
                          display="default"
                          onChange={(_, date) => {
                            setShowTimePicker(false);
                            if (date) setSelectedTime(date);
                          }}
                        />
                      )}
                    </>
                  )}

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
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                      {isArabic ? 'تأكيد الموعد' : 'Confirm Date & Time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Rendered Markdown Body Editor */}
          <View
            onLayout={(e) => {
              editorTopRef.current = e.nativeEvent.layout.y;
            }}
            style={{ flexGrow: 1 }}
          >
            <NoteBodyEditor
              ref={bodyEditorRef}
              value={body}
              onChange={setBody}
              onActiveBlockChange={setActiveBlockInfo}
              onCursorChange={(pos) => {
                cursorPosRef.current = pos;
                setSelection({ start: pos, end: pos });
              }}
              onActivateLine={handleActiveLineMove}
              colors={colors}
              isArabic={isArabic}
              isDark={isDark}
              baseStyle={{
                fontSize: activeFontSize,
                fontFamily: activeFontFamily === 'System' ? undefined : activeFontFamily,
                color: activeFontColor,
                fontWeight: activeFontWeight,
                fontStyle: activeFontStyle,
              }}
              placeholder={
                isArabic
                  ? 'ابدأ في كتابة ملاحظتك هنا...\n• استخدم الشريط أدناه لإضافة العناوين، القوائم، أو المهام.'
                  : 'Start typing your note here...\n• Use the toolbar below to add Headings, Checklists, Bullets, or Formats.'
              }
            />
          </View>
        </ScrollView>

        {/* Floating Header */}
        <BlurView
          tint={isDark ? 'dark' : 'light'}
          intensity={80}
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              paddingTop: insets.top,
              backgroundColor: isDark ? '#0e0f14' : colors.bg,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              zIndex: 10,
            },
          ]}
        >
          <View style={[styles.detailHeader, { paddingBottom: 10, paddingTop: 10 }, isArabic && { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity style={styles.detailHeaderBtn} onPress={handleSaveNote}>
              <Ionicons name={isArabic ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} style={styles.detailHeaderBtnIcon} />
            </TouchableOpacity>
            
            <View style={styles.detailHeaderRight}>
              <TouchableOpacity 
                style={[styles.detailHeaderBtn, isScheduleVisible && { backgroundColor: colors.warning + '20' }]} 
                onPress={() => {
                  if (isScheduleVisible && dateTimeConfirmed) {
                    setDateTimeConfirmed(false);
                  } else {
                    setScheduleVisible(!isScheduleVisible);
                    setDateTimeConfirmed(false);
                  }
                }}
              >
                <Ionicons 
                  name={isScheduleVisible ? 'alarm' : 'alarm-outline'} 
                  size={22} 
                  color={isScheduleVisible ? colors.warning : colors.text} 
                />
              </TouchableOpacity>

              {/* Voice Record Button in Header */}
              <TouchableOpacity 
                style={[
                  styles.detailHeaderBtn,
                  isRecording && { backgroundColor: 'rgba(239, 68, 68, 0.18)' },
                  !isRecording && { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)' },
                ]} 
                onPress={handleToggleRecording}
              >
                <Ionicons
                  name={isRecording ? 'stop-circle' : 'mic'}
                  size={20}
                  color={isRecording ? '#EF4444' : '#6366F1'}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.detailHeaderBtn} onPress={handleSaveNote}>
                <Ionicons name="checkmark" size={24} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailHeaderBtn}
                onPress={() => {
                  if (id) handleDeleteNote();
                  else router.back();
                }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>

        {/* BOTTOM TOOLBAR / ACCESSORY BAR */}
        <View
          style={{
            backgroundColor: isDark ? '#11131a' : colors.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            zIndex: 9,
          }}
        >
          {isKeyboardVisible ? (
            /* 1-LINE UNIFIED ACCESSORY BAR ABOVE KEYBOARD */
            <View style={{ height: 46, justifyContent: 'center' }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={{
                  flexDirection: isArabic ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  paddingHorizontal: 8,
                  gap: 4,
                }}
              >
                {/* 1. Dismiss Keyboard Button */}
                <TouchableOpacity
                  onPress={() => Keyboard.dismiss()}
                  style={styles.toolbarIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Ionicons name="chevron-down" size={20} color={colors.surfaceText} />
                </TouchableOpacity>

                <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 }} />

                {/* 2. Headings */}
                <TouchableOpacity
                  style={[styles.toolbarIconBtn, isH1Active && styles.toolbarIconBtnActive]}
                  onPress={() => bodyEditorRef.current?.toggleHeading(1)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: isH1Active ? colors.primary : colors.surfaceText }}>H1</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolbarIconBtn, isH2Active && styles.toolbarIconBtnActive]}
                  onPress={() => bodyEditorRef.current?.toggleHeading(2)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isH2Active ? colors.primary : colors.surfaceText }}>H2</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolbarIconBtn, isH3Active && styles.toolbarIconBtnActive]}
                  onPress={() => bodyEditorRef.current?.toggleHeading(3)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isH3Active ? colors.primary : colors.surfaceText }}>H3</Text>
                </TouchableOpacity>

                <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 }} />

                {/* 3. Inline Styles */}
                <TouchableOpacity
                  style={[styles.toolbarIconBtn, isBoldActive && styles.toolbarIconBtnActive]}
                  onPress={() => bodyEditorRef.current?.applyInlineFormat('**')}
                >
                  <Text style={{ fontSize: 15, fontWeight: '900', color: isBoldActive ? colors.primary : colors.surfaceText }}>B</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolbarIconBtn, isItalicActive && styles.toolbarIconBtnActive]}
                  onPress={() => bodyEditorRef.current?.applyInlineFormat('__')}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', fontStyle: 'italic', color: isItalicActive ? colors.primary : colors.surfaceText }}>I</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolbarIconBtn, isStrikeActive && styles.toolbarIconBtnActive]}
                  onPress={() => bodyEditorRef.current?.applyInlineFormat('~~')}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', textDecorationLine: 'line-through', color: isStrikeActive ? colors.primary : colors.surfaceText }}>S</Text>
                </TouchableOpacity>

                <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 }} />

                {/* 4. Lists & Blocks */}
                <TouchableOpacity
                  style={[styles.toolbarIconBtn, isChecklistActive && styles.toolbarIconBtnActive]}
                  onPress={() => bodyEditorRef.current?.toggleChecklist()}
                >
                  <Ionicons name={isChecklistActive ? 'checkbox' : 'checkbox-outline'} size={18} color={isChecklistActive ? colors.primary : colors.surfaceText} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolbarIconBtn, isBulletActive && styles.toolbarIconBtnActive]}
                  onPress={() => bodyEditorRef.current?.toggleBullet()}
                >
                  <Ionicons name="list-outline" size={18} color={isBulletActive ? colors.primary : colors.surfaceText} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolbarIconBtn, isNumberActive && styles.toolbarIconBtnActive]}
                  onPress={() => bodyEditorRef.current?.toggleNumber()}
                >
                  <Ionicons name="reorder-four-outline" size={18} color={isNumberActive ? colors.primary : colors.surfaceText} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolbarIconBtn, isQuoteActive && styles.toolbarIconBtnActive]}
                  onPress={() => bodyEditorRef.current?.toggleQuote()}
                >
                  <Ionicons name="chatbox-ellipses-outline" size={17} color={isQuoteActive ? colors.primary : colors.surfaceText} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toolbarIconBtn}
                  onPress={() => bodyEditorRef.current?.insertDivider()}
                >
                  <Ionicons name="remove-outline" size={20} color={colors.surfaceText} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toolbarIconBtn}
                  onPress={() => bodyEditorRef.current?.insertHashtag()}
                >
                  <Ionicons name="pricetag-outline" size={17} color={colors.surfaceText} />
                </TouchableOpacity>

                <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 }} />

                {/* 5. Typography Inspector Sheet Trigger */}
                <TouchableOpacity
                  onPress={() => setActiveMenu('typography')}
                  style={[
                    styles.toolbarIconBtn,
                    {
                      paddingHorizontal: 8,
                      width: 'auto',
                      minWidth: 36,
                      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                    },
                  ]}
                >
                  <Text style={{ color: '#6366F1', fontSize: 13, fontWeight: '800' }}>Aa</Text>
                </TouchableOpacity>

                {/* 6. Color Quick Swatch */}
                <TouchableOpacity onPress={() => setActiveMenu('color')} style={{ padding: 4 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: activeFontColor,
                      borderWidth: 2,
                      borderColor: colors.border,
                    }}
                  />
                </TouchableOpacity>

                <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 }} />

                {/* 7. AI Quick Ask Trigger */}
                <TouchableOpacity
                  onPress={() => setAIChatVisible(true)}
                  style={[
                    styles.toolbarIconBtn,
                    {
                      flexDirection: 'row',
                      gap: 4,
                      width: 'auto',
                      paddingHorizontal: 8,
                      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)',
                      borderRadius: 8,
                    },
                  ]}
                >
                  <Ionicons name="sparkles" size={13} color="#6366F1" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366F1' }}>AI</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          ) : (
            /* COMFORTABLE DUAL-TIER TOOLBAR WHEN KEYBOARD IS CLOSED */
            <View style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
              {/* Row 1: AI Presets Bar */}
              <View style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={{
                    gap: 8,
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                  }}
                >
                  <TouchableOpacity
                    onPress={handleSummarizeNote}
                    disabled={isAILoading}
                    style={{
                      flexDirection: isArabic ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    <Ionicons name="sparkles" size={13} color="#6366F1" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366F1' }}>
                      {t.aiSummarize}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleExtractTasks}
                    disabled={isAILoading}
                    style={{
                      flexDirection: isArabic ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.1)',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <Ionicons name="checkbox-outline" size={13} color="#10B981" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>
                      {t.aiExtractTasks}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleExplainNote}
                    disabled={isAILoading}
                    style={{
                      flexDirection: isArabic ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.1)',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.2)',
                    }}
                  >
                    <Ionicons name="bulb-outline" size={13} color="#F59E0B" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B' }}>
                      {t.aiExplain}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAIChatVisible(true)}
                    style={{
                      flexDirection: isArabic ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    <Ionicons name="chatbubbles-outline" size={13} color={colors.text} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                      {t.aiAsk}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleToggleRecording}
                    style={{
                      flexDirection: isArabic ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: isRecording
                        ? 'rgba(239, 68, 68, 0.25)'
                        : isDark
                        ? 'rgba(239, 68, 68, 0.18)'
                        : 'rgba(239, 68, 68, 0.1)',
                      borderWidth: 1,
                      borderColor: isRecording
                        ? '#EF4444'
                        : isDark
                        ? 'rgba(239, 68, 68, 0.35)'
                        : 'rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <Ionicons
                      name={isRecording ? 'stop-circle' : 'mic-outline'}
                      size={13}
                      color="#EF4444"
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>
                      {isRecording ? (isArabic ? 'إيقاف وحفظ' : 'Stop & Save') : t.voiceRecord}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Row 2: Rich Formatting Toolbar */}
              <View style={[styles.toolbarWrapper, { backgroundColor: 'transparent', borderTopWidth: 0, paddingTop: 0 }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={{
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 4,
                  }}
                >
                  {/* Headings */}
                  <TouchableOpacity 
                    style={[styles.toolbarIconBtn, isH1Active && styles.toolbarIconBtnActive]} 
                    onPress={() => bodyEditorRef.current?.toggleHeading(1)}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: isH1Active ? colors.primary : colors.surfaceText }}>H1</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.toolbarIconBtn, isH2Active && styles.toolbarIconBtnActive]} 
                    onPress={() => bodyEditorRef.current?.toggleHeading(2)}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isH2Active ? colors.primary : colors.surfaceText }}>H2</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.toolbarIconBtn, isH3Active && styles.toolbarIconBtnActive]} 
                    onPress={() => bodyEditorRef.current?.toggleHeading(3)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isH3Active ? colors.primary : colors.surfaceText }}>H3</Text>
                  </TouchableOpacity>

                  <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 }} />

                  {/* Checklist */}
                  <TouchableOpacity 
                    style={[styles.toolbarIconBtn, isChecklistActive && styles.toolbarIconBtnActive]} 
                    onPress={() => bodyEditorRef.current?.toggleChecklist()}
                  >
                    <Ionicons 
                      name={isChecklistActive ? 'checkbox' : 'checkbox-outline'} 
                      size={20} 
                      color={isChecklistActive ? colors.primary : colors.surfaceText} 
                    />
                  </TouchableOpacity>

                  {/* Bullet List */}
                  <TouchableOpacity 
                    style={[styles.toolbarIconBtn, isBulletActive && styles.toolbarIconBtnActive]} 
                    onPress={() => bodyEditorRef.current?.toggleBullet()}
                  >
                    <Ionicons 
                      name="list-outline" 
                      size={20} 
                      color={isBulletActive ? colors.primary : colors.surfaceText} 
                    />
                  </TouchableOpacity>

                  {/* Numbered List */}
                  <TouchableOpacity 
                    style={[styles.toolbarIconBtn, isNumberActive && styles.toolbarIconBtnActive]} 
                    onPress={() => bodyEditorRef.current?.toggleNumber()}
                  >
                    <Ionicons 
                      name="reorder-four-outline" 
                      size={20} 
                      color={isNumberActive ? colors.primary : colors.surfaceText} 
                    />
                  </TouchableOpacity>

                  {/* Quote */}
                  <TouchableOpacity 
                    style={[styles.toolbarIconBtn, isQuoteActive && styles.toolbarIconBtnActive]} 
                    onPress={() => bodyEditorRef.current?.toggleQuote()}
                  >
                    <Ionicons 
                      name="chatbox-ellipses-outline" 
                      size={19} 
                      color={isQuoteActive ? colors.primary : colors.surfaceText} 
                    />
                  </TouchableOpacity>

                  {/* Hashtag */}
                  <TouchableOpacity 
                    style={styles.toolbarIconBtn} 
                    onPress={() => bodyEditorRef.current?.insertHashtag()}
                  >
                    <Ionicons 
                      name="pricetag-outline" 
                      size={18} 
                      color={colors.surfaceText} 
                    />
                  </TouchableOpacity>

                  <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 }} />

                  {/* Bold */}
                  <TouchableOpacity 
                    style={[styles.toolbarIconBtn, isBoldActive && styles.toolbarIconBtnActive]} 
                    onPress={() => bodyEditorRef.current?.applyInlineFormat('**')}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '900', color: isBoldActive ? colors.primary : colors.surfaceText }}>B</Text>
                  </TouchableOpacity>

                  {/* Italic */}
                  <TouchableOpacity 
                    style={[styles.toolbarIconBtn, isItalicActive && styles.toolbarIconBtnActive]} 
                    onPress={() => bodyEditorRef.current?.applyInlineFormat('__')}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '700', fontStyle: 'italic', color: isItalicActive ? colors.primary : colors.surfaceText }}>I</Text>
                  </TouchableOpacity>

                  {/* Strikethrough */}
                  <TouchableOpacity 
                    style={[styles.toolbarIconBtn, isStrikeActive && styles.toolbarIconBtnActive]} 
                    onPress={() => bodyEditorRef.current?.applyInlineFormat('~~')}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', textDecorationLine: 'line-through', color: isStrikeActive ? colors.primary : colors.surfaceText }}>S</Text>
                  </TouchableOpacity>

                  {/* Divider */}
                  <TouchableOpacity 
                    style={styles.toolbarIconBtn} 
                    onPress={() => bodyEditorRef.current?.insertDivider()}
                  >
                    <Ionicons name="remove-outline" size={22} color={colors.surfaceText} />
                  </TouchableOpacity>

                  <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 }} />

                  {/* Typography Sheet Trigger */}
                  <TouchableOpacity 
                    onPress={() => setActiveMenu('typography')} 
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <Text style={{ color: colors.surfaceText, fontSize: 13, fontWeight: '700' }}>{activeFontSize}pt</Text>
                    <Ionicons name="chevron-up" size={12} color={colors.textMuted} />
                  </TouchableOpacity>

                  {/* Color */}
                  <TouchableOpacity onPress={() => setActiveMenu('color')}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: activeFontColor, borderWidth: 2, borderColor: colors.border }} />
                  </TouchableOpacity>

                  {/* Font Family */}
                  <TouchableOpacity 
                    onPress={() => setActiveMenu('fontFamily')}
                    style={[styles.toolbarIconBtn]}
                  >
                    <Ionicons name="text" size={18} color={colors.surfaceText} />
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* AI Summary / Extracted Tasks Result Bottom Sheet Modal */}
      <NoteAIResultModal
        visible={isAIResultVisible}
        onClose={() => setAIResultVisible(false)}
        resultData={aiResultData}
        isLoading={isAILoading}
        isArabic={isArabic}
        onInsertSummaryToNote={handleInsertSummaryToNote}
        onAddTasksToTodoList={handleAddTasksToTodoList}
        onInsertTasksAsChecklist={handleInsertTasksAsChecklist}
        onOpenAIChat={() => setAIChatVisible(true)}
      />

      {/* AI Assistant Interactive Chat Bottom Sheet */}
      <NoteAIChatSheet
        visible={isAIChatVisible}
        onClose={() => setAIChatVisible(false)}
        noteTitle={title || 'Untitled Note'}
        chatHistory={localChatHistory}
        onSendMessage={handleSendAIChat}
        onInsertToNote={handleInsertToNote}
        onClearChat={handleClearAIChat}
        isArabic={isArabic}
        isLoading={isAILoading}
      />

      {/* Action Menu / Typography Inspector Bottom Sheet */}
      <Modal
        visible={activeMenu !== 'none'}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveMenu('none')}
        statusBarTranslucent={true}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActiveMenu('none')}
        >
          <View
            style={[
              styles.modalContent,
              {
                marginTop: 'auto',
                marginBottom: 0,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                maxHeight: '75%',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeMenu === 'typography' && (isArabic ? 'تنسيق النص والخط' : 'Typography & Formatting')}
                {activeMenu === 'fontFamily' && (isArabic ? 'اختر نوع الخط' : 'Select Font Family')}
                {activeMenu === 'fontSize' && (isArabic ? 'اختر حجم الخط' : 'Select Font Size')}
                {activeMenu === 'color' && (isArabic ? 'اختر لون النص' : 'Select Text Color')}
              </Text>
              <TouchableOpacity onPress={() => setActiveMenu('none')}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* 3-TIER COMPLETE TYPOGRAPHY INSPECTOR */}
              {activeMenu === 'typography' && (
                <View style={{ gap: 20 }}>
                  {/* TIER 1: Text Hierarchy / Heading Level */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: isArabic ? 'right' : 'left' }}>
                      {isArabic ? 'المستوى الهيكلي للنص' : 'Text Hierarchy'}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: isArabic ? 'row-reverse' : 'row' }}>
                      {[
                        { label: isArabic ? 'عنوان رئيسي (H1)' : 'Title (H1)', active: isH1Active, onSelect: () => bodyEditorRef.current?.toggleHeading(1) },
                        { label: isArabic ? 'عنوان قسم (H2)' : 'Heading (H2)', active: isH2Active, onSelect: () => bodyEditorRef.current?.toggleHeading(2) },
                        { label: isArabic ? 'عنوان فرعي (H3)' : 'Subheading (H3)', active: isH3Active, onSelect: () => bodyEditorRef.current?.toggleHeading(3) },
                        { label: isArabic ? 'اقتباس' : 'Quote', active: isQuoteActive, onSelect: () => bodyEditorRef.current?.toggleQuote() },
                      ].map((item, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={item.onSelect}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: item.active ? colors.primary : colors.border,
                            backgroundColor: item.active ? colors.primary + '20' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: item.active ? '800' : '600', color: item.active ? colors.primary : colors.text }}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* TIER 2: Inline Styles & Lists */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: isArabic ? 'right' : 'left' }}>
                      {isArabic ? 'الأنماط والقوائم' : 'Styles & Lists'}
                    </Text>
                    <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => bodyEditorRef.current?.applyInlineFormat('**')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isBoldActive ? colors.primary : colors.border,
                          backgroundColor: isBoldActive ? colors.primary + '20' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '900', color: isBoldActive ? colors.primary : colors.text }}>B</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{isArabic ? 'عريض' : 'Bold'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => bodyEditorRef.current?.applyInlineFormat('__')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isItalicActive ? colors.primary : colors.border,
                          backgroundColor: isItalicActive ? colors.primary + '20' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '700', fontStyle: 'italic', color: isItalicActive ? colors.primary : colors.text }}>I</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{isArabic ? 'مائل' : 'Italic'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => bodyEditorRef.current?.applyInlineFormat('~~')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isStrikeActive ? colors.primary : colors.border,
                          backgroundColor: isStrikeActive ? colors.primary + '20' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '700', textDecorationLine: 'line-through', color: isStrikeActive ? colors.primary : colors.text }}>S</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{isArabic ? 'يتوسطه خط' : 'Strike'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => bodyEditorRef.current?.toggleChecklist()}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isChecklistActive ? colors.primary : colors.border,
                          backgroundColor: isChecklistActive ? colors.primary + '20' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                        }}
                      >
                        <Ionicons name={isChecklistActive ? 'checkbox' : 'checkbox-outline'} size={18} color={isChecklistActive ? colors.primary : colors.text} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{isArabic ? 'قائمة مهام' : 'Checklist'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => bodyEditorRef.current?.toggleBullet()}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isBulletActive ? colors.primary : colors.border,
                          backgroundColor: isBulletActive ? colors.primary + '20' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                        }}
                      >
                        <Ionicons name="list-outline" size={18} color={isBulletActive ? colors.primary : colors.text} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{isArabic ? 'قائمة نقطية' : 'Bullets'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => bodyEditorRef.current?.toggleNumber()}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isNumberActive ? colors.primary : colors.border,
                          backgroundColor: isNumberActive ? colors.primary + '20' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                        }}
                      >
                        <Ionicons name="reorder-four-outline" size={18} color={isNumberActive ? colors.primary : colors.text} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{isArabic ? 'قائمة رقمية' : 'Numbers'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* TIER 3: Font Size Scale */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: isArabic ? 'right' : 'left' }}>
                      {isArabic ? 'حجم الخط الأساسي' : 'Base Font Size'}
                    </Text>
                    <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[14, 16, 17, 18, 20, 22, 24, 28].map((s) => {
                        const isSizeActive = activeFontSize === s;
                        return (
                          <TouchableOpacity
                            key={s}
                            onPress={() => setActiveFontSize(s)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: isSizeActive ? colors.primary : colors.border,
                              backgroundColor: isSizeActive ? colors.primary + '20' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: isSizeActive ? '800' : '500', color: isSizeActive ? colors.primary : colors.text }}>
                              {s}pt
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* TIER 4: Color Palette */}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: isArabic ? 'right' : 'left' }}>
                      {isArabic ? 'لون النص' : 'Text Color'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' }}>
                      {[colors.text, '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6', '#3B82F6', '#64748B'].map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setActiveFontColor(c)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: c,
                            borderWidth: 3,
                            borderColor: activeFontColor === c ? colors.primary : colors.border,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {activeFontColor === c && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* FONT FAMILY SUB-PICKER */}
              {activeMenu === 'fontFamily' && [
                { label: isArabic ? 'الخط الافتراضي (System)' : 'System Default', val: 'System' },
                { label: isArabic ? 'خط كلاسيكي (Serif / Georgia)' : 'Editorial Serif', val: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
                { label: isArabic ? 'خط برمجي (Monospace)' : 'Monospace (Code)', val: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
                { label: isArabic ? 'خط حديث (Modern Sans)' : 'Modern Sans', val: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif' },
                { label: isArabic ? 'خط عريض (Clean Medium)' : 'Clean Medium', val: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
              ].map((f) => (
                <TouchableOpacity 
                  key={f.val} 
                  onPress={() => { 
                    setActiveFontFamily(f.val); 
                    setActiveMenu('none'); 
                  }} 
                  style={{ 
                    padding: 16, 
                    borderBottomWidth: 1, 
                    borderColor: colors.border,
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontFamily: f.val === 'System' ? undefined : f.val, fontSize: 18 }}>
                    {f.label}
                  </Text>
                  {activeFontFamily === f.val && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {/* FONT SIZE SUB-PICKER */}
              {activeMenu === 'fontSize' && [14, 16, 17, 18, 20, 22, 24, 28].map((s) => (
                <TouchableOpacity 
                  key={s} 
                  onPress={() => { 
                    setActiveFontSize(s); 
                    setActiveMenu('none'); 
                  }} 
                  style={{ 
                    padding: 16, 
                    borderBottomWidth: 1, 
                    borderColor: colors.border,
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: s, fontWeight: activeFontSize === s ? '700' : '400' }}>
                    {s}pt
                  </Text>
                  {activeFontSize === s && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {/* COLOR SUB-PICKER */}
              {activeMenu === 'color' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, justifyContent: 'space-around' }}>
                  {[colors.text, colors.primary, colors.danger, colors.success, colors.warning, colors.border, colors.textMuted, '#6366F1', '#EC4899', '#8B5CF6', '#14B8A6', '#3B82F6'].map((c) => (
                    <TouchableOpacity 
                      key={c} 
                      onPress={() => { setActiveFontColor(c); setActiveMenu('none'); }} 
                      style={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: 24, 
                        backgroundColor: c, 
                        borderWidth: 3, 
                        borderColor: activeFontColor === c ? colors.primary : 'transparent',
                        shadowColor: colors.text,
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }} 
                    >
                      {activeFontColor === c && (
                        <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}
