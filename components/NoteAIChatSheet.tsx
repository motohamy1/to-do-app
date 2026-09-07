import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { useTranslation } from '@/utils/i18n';
import { AIChatMessage } from '@/types/voiceNote';
import { useKeyboard } from '@/hooks/useKeyboard';

interface NoteAIChatSheetProps {
  visible: boolean;
  onClose: () => void;
  noteTitle: string;
  chatHistory: AIChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onInsertToNote?: (content: string) => void;
  onClearChat?: () => void;
  onAddExtractedTasks?: (tasks: string[]) => void;
  isArabic?: boolean;
  isLoading?: boolean;
}

/**
 * Clean any remaining thinking/reasoning tags or thinking headers from AI model responses.
 */
export const cleanClientText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '')
    .replace(/<thought>[\s\S]*?(?:<\/thought>|$)/gi, '')
    .replace(/<reasoning>[\s\S]*?(?:<\/reasoning>|$)/gi, '')
    .replace(/<reflection>[\s\S]*?(?:<\/reflection>|$)/gi, '')
    .replace(/<scratchpad>[\s\S]*?(?:<\/scratchpad>|$)/gi, '')
    .replace(/<antThinking>[\s\S]*?(?:<\/antThinking>|$)/gi, '')
    .replace(/```(?:thought|thinking|reasoning)[\s\S]*?```/gi, '')
    .replace(/\[(?:Thinking Process|Thought Process|Reasoning)[\s\S]*?(?:\]|$)/gi, '')
    .replace(/^(?:#{1,6}\s*)?\*?\*?(?:Thought|Thinking Process|Thought Process|Reasoning Process|Internal Thoughts|Chain of Thought)\*?\*?:?[\s\S]*?(?=\n\n|\n[#*A-Z\u0600-\u06FF]|$)/gim, '')
    .replace(/^(?:Here's a thinking process|Let's analyze this step-by-step):?[\s\S]*?(?=\n\n|\n[#*A-Z\u0600-\u06FF]|$)/gim, '')
    .trim();
};

/**
 * Helper to render inline markdown tags (**bold**, *italic*, `code`).
 */
const renderInlineSpans = (text: string, colors: any, isArabic: boolean) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text key={i} style={{ fontWeight: '800', color: colors.text }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <Text key={i} style={{ fontStyle: 'italic', color: colors.text }}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text
          key={i}
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            backgroundColor: 'rgba(150, 150, 150, 0.18)',
            color: colors.primary || '#6366F1',
            paddingHorizontal: 4,
            borderRadius: 4,
            fontSize: 12.5,
          }}
        >
          {part.slice(1, -1)}
        </Text>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

/**
 * Rich Formatted Markdown Content Renderer for AI Messages.
 */
const FormattedAIMessage: React.FC<{
  content: string;
  colors: any;
  isDark: boolean;
  isArabic: boolean;
}> = ({ content, colors, isDark, isArabic }) => {
  const sanitized = cleanClientText(content);
  if (!sanitized) return null;

  const lines = sanitized.split('\n');

  return (
    <View style={{ gap: 6 }}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <View key={lineIdx} style={{ height: 4 }} />;
        }

        // H1 Heading
        if (trimmed.startsWith('# ')) {
          return (
            <Text
              key={lineIdx}
              style={{
                fontSize: 16,
                fontWeight: '800',
                color: colors.primary || '#6366F1',
                marginTop: lineIdx > 0 ? 8 : 0,
                textAlign: isArabic ? 'right' : 'left',
              }}
            >
              {renderInlineSpans(trimmed.replace(/^#\s+/, ''), colors, isArabic)}
            </Text>
          );
        }

        // H2 Heading
        if (trimmed.startsWith('## ')) {
          return (
            <Text
              key={lineIdx}
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: colors.text,
                marginTop: lineIdx > 0 ? 6 : 0,
                textAlign: isArabic ? 'right' : 'left',
              }}
            >
              {renderInlineSpans(trimmed.replace(/^##\s+/, ''), colors, isArabic)}
            </Text>
          );
        }

        // H3 Heading
        if (trimmed.startsWith('### ')) {
          return (
            <Text
              key={lineIdx}
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.text,
                marginTop: lineIdx > 0 ? 4 : 0,
                textAlign: isArabic ? 'right' : 'left',
              }}
            >
              {renderInlineSpans(trimmed.replace(/^###\s+/, ''), colors, isArabic)}
            </Text>
          );
        }

        // Bullet item
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <View
              key={lineIdx}
              style={{
                flexDirection: isArabic ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 8,
                paddingVertical: 1,
              }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: colors.primary || '#6366F1',
                  marginTop: 7,
                }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.text,
                  textAlign: isArabic ? 'right' : 'left',
                }}
              >
                {renderInlineSpans(bulletMatch[1], colors, isArabic)}
              </Text>
            </View>
          );
        }

        // Numbered list item
        const numberMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
        if (numberMatch) {
          return (
            <View
              key={lineIdx}
              style={{
                flexDirection: isArabic ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 6,
                paddingVertical: 1,
              }}
            >
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.12)',
                  borderRadius: 6,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  minWidth: 18,
                  alignItems: 'center',
                  marginTop: 1,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary || '#6366F1' }}>
                  {numberMatch[1]}
                </Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.text,
                  textAlign: isArabic ? 'right' : 'left',
                }}
              >
                {renderInlineSpans(numberMatch[2], colors, isArabic)}
              </Text>
            </View>
          );
        }

        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <View
              key={lineIdx}
              style={{
                borderLeftWidth: isArabic ? 0 : 3,
                borderRightWidth: isArabic ? 3 : 0,
                borderColor: colors.primary || '#6366F1',
                paddingLeft: isArabic ? 0 : 10,
                paddingRight: isArabic ? 10 : 0,
                paddingVertical: 2,
                marginVertical: 2,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 13.5,
                  lineHeight: 19,
                  fontStyle: 'italic',
                  color: colors.textMuted,
                  textAlign: isArabic ? 'right' : 'left',
                }}
              >
                {renderInlineSpans(trimmed.replace(/^>\s+/, ''), colors, isArabic)}
              </Text>
            </View>
          );
        }

        // Standard Paragraph
        return (
          <Text
            key={lineIdx}
            style={{
              fontSize: 14,
              lineHeight: 21,
              color: colors.text,
              textAlign: isArabic ? 'right' : 'left',
            }}
          >
            {renderInlineSpans(trimmed, colors, isArabic)}
          </Text>
        );
      })}
    </View>
  );
};

export const NoteAIChatSheet: React.FC<NoteAIChatSheetProps> = ({
  visible,
  onClose,
  noteTitle,
  chatHistory = [],
  onSendMessage,
  onInsertToNote,
  onClearChat,
  onAddExtractedTasks,
  isArabic = false,
  isLoading = false,
}) => {
  const { colors, isDarkMode } = useTheme();
  const isDark = isDarkMode;
  const { t } = useTranslation(isArabic ? 'ar' : 'en');
  const { height: screenHeight } = useWindowDimensions();
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const [inputMessage, setInputMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [visible, chatHistory, isLoading]);

  useEffect(() => {
    if (isKeyboardVisible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [isKeyboardVisible, keyboardHeight]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const msg = inputMessage.trim();
    setInputMessage('');
    await onSendMessage(msg);
  };

  const handleCopy = (text: string) => {
    const cleaned = cleanClientText(text);
    Clipboard.setString(cleaned);
    Alert.alert(t.actionSuccess || 'Copied', isArabic ? 'تم نسخ الرد بنجاح.' : 'Response copied to clipboard.');
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent={true}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              marginBottom: keyboardHeight,
              height: isKeyboardVisible 
                ? Math.max(300, screenHeight - keyboardHeight - (Platform.OS === 'ios' ? 44 : 24)) 
                : '75%',
              maxHeight: screenHeight - (Platform.OS === 'ios' ? 44 : 24),
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={[styles.header, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={styles.headerInfo}>
              <View style={[styles.headerBadge, isArabic && { flexDirection: 'row-reverse' }]}>
                <Ionicons name="sparkles" size={14} color="#6366F1" />
                <Text style={[styles.aiTitle, { color: colors.text }]}>
                  {t.aiAssistant}
                </Text>
              </View>
              <Text
                style={[styles.noteSubtitle, { color: colors.textMuted }, isArabic && { textAlign: 'right' }]}
                numberOfLines={1}
              >
                {noteTitle}
              </Text>
            </View>
            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
              {chatHistory.length > 0 && onClearChat && (
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => {
                    Alert.alert(
                      isArabic ? 'بدء محادثة جديدة' : 'New Conversation',
                      isArabic
                        ? 'هل تريد مسح سجل المحادثة والبدء من جديد لهذه الملاحظة؟'
                        : 'Do you want to clear chat history and start fresh for this note?',
                      [
                        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
                        {
                          text: isArabic ? 'مسح وبدء جديد' : 'Start Fresh',
                          style: 'destructive',
                          onPress: onClearChat,
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="refresh-outline" size={19} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages Scroll Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {chatHistory.length === 0 && !isLoading && (
              <View style={styles.emptyPrompt}>
                <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyPromptTitle, { color: colors.text }]}>
                  {isArabic ? 'اسأل المساعد الذكي' : 'Ask Note AI Anything'}
                </Text>
                <Text style={[styles.emptyPromptSub, { color: colors.textMuted }]}>
                  {isArabic
                    ? 'يمكنك مناقشة الملاحظة، طلب شرح لأي نقطة، أو تلخيص واستخراج المهام.'
                    : 'Discuss this note, ask for explanations, or extract actionable tasks.'}
                </Text>
              </View>
            )}

            {chatHistory.map((msg, index) => {
              const isUser = msg.role === 'user';
              const messageText = isUser ? msg.content : cleanClientText(msg.content);
              if (!messageText && !isUser) return null;

              return (
                <View
                  key={index}
                  style={[
                    styles.messageRow,
                    isUser ? styles.userRow : styles.modelRow,
                    isArabic && (isUser ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }),
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isUser
                        ? {
                            backgroundColor: colors.primary || '#6366F1',
                            shadowColor: colors.primary || '#6366F1',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 6,
                            elevation: 2,
                          }
                        : {
                            backgroundColor: isDark
                              ? 'rgba(30, 41, 59, 0.85)'
                              : 'rgba(241, 245, 249, 0.95)',
                            borderColor: isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.06)',
                            borderWidth: 1,
                          },
                    ]}
                  >
                    {isUser ? (
                      <Text
                        style={[
                          styles.messageText,
                          {
                            color: colors.primaryText || (isDark ? '#181326' : '#FFFFFF'),
                            fontWeight: '600',
                          },
                          isArabic && { textAlign: 'right' },
                        ]}
                      >
                        {messageText}
                      </Text>
                    ) : (
                      <FormattedAIMessage
                        content={messageText}
                        colors={colors}
                        isDark={isDark}
                        isArabic={isArabic}
                      />
                    )}

                    {/* Action buttons on AI responses */}
                    {!isUser && (
                      <View
                        style={[
                          styles.bubbleActions,
                          isArabic && { flexDirection: 'row-reverse' },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.bubbleActionBtn}
                          onPress={() => handleCopy(messageText)}
                        >
                          <Ionicons name="copy-outline" size={13} color={colors.textMuted} />
                          <Text style={[styles.bubbleActionText, { color: colors.textMuted }]}>
                            {t.share || 'Copy'}
                          </Text>
                        </TouchableOpacity>

                        {onInsertToNote && (
                          <TouchableOpacity
                            style={styles.bubbleActionBtn}
                            onPress={() => onInsertToNote(messageText)}
                          >
                            <Ionicons name="add-circle-outline" size={13} color="#6366F1" />
                            <Text style={[styles.bubbleActionText, { color: '#6366F1' }]}>
                              {t.insertToNote}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {isLoading && (
              <View style={[styles.messageRow, styles.modelRow]}>
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isDark
                        ? 'rgba(30, 41, 59, 0.85)'
                        : 'rgba(241, 245, 249, 0.95)',
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color="#6366F1" />
                  <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '500' }}>
                    {t.aiThinking}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Input Area */}
          <View
            style={[
              styles.inputRow,
              {
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
              isArabic && { flexDirection: 'row-reverse' },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(241, 245, 249, 0.8)',
                },
                isArabic && { textAlign: 'right' },
              ]}
              placeholder={t.askAboutNote}
              placeholderTextColor={colors.textMuted}
              value={inputMessage}
              onChangeText={setInputMessage}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputMessage.trim() ? colors.primary || '#6366F1' : isDark ? '#334155' : '#E2E8F0',
                },
              ]}
              onPress={handleSend}
              disabled={!inputMessage.trim() || isLoading}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={inputMessage.trim() ? (colors.primaryText || '#FFFFFF') : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContainer: {
    height: '75%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150, 150, 150, 0.4)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  headerInfo: {
    flex: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  noteSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyPromptSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    marginVertical: 6,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  modelRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  bubbleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bubbleActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NoteAIChatSheet;
