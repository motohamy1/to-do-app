import React, { useState, useEffect } from 'react';
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
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import useTheme from '@/hooks/useTheme';
import { useTranslation } from '@/utils/i18n';
import LivePress from '@/components/LivePress';
import { VoiceRecordModal } from '@/components/VoiceRecordModal';
import { GOAL_UI_TEMPLATES } from '@/constants/goalTemplates';

export interface MilestoneItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface StagedGoal {
  id: string;
  text: string;
  description?: string;
  category: string;
  color?: string;
  icon?: string;
  templateId: string;
  milestones: MilestoneItem[];
}

export interface HeaderOption {
  title: string;
  isExisting: boolean;
}

interface AIGoalGeneratorModalProps {
  visible: boolean;
  onClose: () => void;
  year: number;
  month?: number;
  day?: number;
  userId: string;
  isArabic?: boolean;
  existingCategories?: string[];
  onPlanApplied?: () => void;
}

const months_en = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const months_ar = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const AIGoalGeneratorModal: React.FC<AIGoalGeneratorModalProps> = ({
  visible,
  onClose,
  year,
  month,
  day,
  userId,
  isArabic = false,
  existingCategories = [],
  onPlanApplied,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useTranslation(isArabic ? 'ar' : 'en');

  // Timeframe derivations
  const isDay = day !== undefined;
  const isMonth = month !== undefined && !isDay;
  const isYearly = month === undefined && !isDay;
  const timeframe = isDay ? 'day' : isMonth ? 'month' : 'year';
  const monthName = month !== undefined ? (isArabic ? months_ar[month] : months_en[month]) : '';

  // Convex actions and mutations
  const architectGoalAction = useAction(api.aiGoals.architectGoalIntent);
  const generateSubGoalsAction = useAction(api.aiGoals.generateSubGoalsAction);
  const refineGoalAction = useAction(api.aiGoals.refineGoalIntent);
  const saveGoalsMut = useMutation(api.aiGoals.saveArchitectGoals);
  const generateAudioUploadUrl = useMutation(api.audio.generateAudioUploadUrl);
  const transcribeAudioAction = useAction(api.audio.transcribeAudio);

  // Modal lifecycle states
  const [step, setStep] = useState<'chat' | 'generating' | 'review'>('chat');
  const [promptText, setPromptText] = useState('');
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'main' | 'subgoals' | 'refine'>('main');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refinementInput, setRefinementInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sub-goals specific AI conversation state
  const [showSubGoalCreator, setShowSubGoalCreator] = useState(false);
  const [subGoalsPromptText, setSubGoalsPromptText] = useState('');
  const [isCreatingSubGoals, setIsCreatingSubGoals] = useState(false);

  // Staged goals in this architect session
  const [stagedGoals, setStagedGoals] = useState<StagedGoal[]>([]);

  // Current active draft being reviewed/edited
  const [currentDraft, setCurrentDraft] = useState<{
    goalTitle: string;
    description: string;
    category: string;
    templateId: string;
    color: string;
    icon: string;
    milestones: MilestoneItem[];
    headerOptions: HeaderOption[];
    aiResponseText: string;
  } | null>(null);

  // Custom Category Input
  const [isCustomCategoryActive, setIsCustomCategoryActive] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');

  // Milestone Add Input
  const [newMilestoneText, setNewMilestoneText] = useState('');

  // Reset when opened
  useEffect(() => {
    if (visible) {
      setStep('chat');
      setPromptText('');
      setCurrentDraft(null);
      setStagedGoals([]);
      setRefinementInput('');
      setIsCustomCategoryActive(false);
      setCustomCategoryText('');
      setNewMilestoneText('');
      setShowSubGoalCreator(false);
      setSubGoalsPromptText('');
      setVoiceTarget('main');
    }
  }, [visible]);

  // Dynamic context title badge
  const contextBadgeText = isDay
    ? isArabic
      ? `أهداف يوم ${day} ${monthName}`
      : `Day ${day} ${monthName} Goals`
    : isMonth
    ? isArabic
      ? `أهداف شهر ${monthName} ${year}`
      : `${monthName} ${year} Goals`
    : isArabic
    ? `أهداف عام ${year}`
    : `${year} Annual Goals`;

  // Quick Inspiration Prompts
  const inspirationPrompts = isArabic
    ? isDay
      ? [
          '🎯 إنهاء 3 دروس من كورس البرمجة وحل التمارين',
          '🏃‍♂️ الجري 5 كيلومترات وجلسة استطالة',
          '💼 مراجعة وتجهيز عرض المشروع لفريق العمل',
          '📚 قراءة 25 صفحة من كتاب وتدوين الفوائد',
        ]
    : isMonth
    ? [
        '🎓 إنهاء دورة كاملة في بايثون مع مشروع عملي',
        '🏋️‍♂️ الالتزام بـ 16 تمرين ومتابعة النظام الغذائي',
        '🚀 إطلاق النموذج الأولي للتطبيق (MVP)',
        '💰 ادخار 1000 دولار وتتبع المصروفات بدقة',
      ]
    : [
        '🌟 تأسيس وتوسيع مشروع جانبي بربحية شهرية',
        '🏃‍♂️ إنهاء نصف ماراثون بلياقة استثنائية',
        '📚 إتمام قراءة 24 كتاباً تخصصياً وتلخيصها',
        '💡 بناء سيرة ذاتية وحقيبة مشاريع تقنية احترافية',
      ]
    : isDay
    ? [
        '🎯 Finish 3 modules of Python course and exercise code',
        '🏃‍♂️ 5km morning run and recovery stretch',
        '💼 Complete sprint review and ship pull request',
        '📚 Read 25 pages of system design book',
      ]
    : isMonth
    ? [
        '🎓 Finish full React & Convex course with capstone project',
        '🏋️‍♂️ 16 gym workouts and strict clean nutrition',
        '🚀 Launch MVP mobile app on test flight',
        '💰 Save $1,000 and optimize monthly budget',
      ]
    : [
        '🌟 Launch profitable side business with $3k MRR',
        '🏃‍♂️ Complete half-marathon and peak athletic fitness',
        '📚 Read 20 books and publish executive summaries',
        '💡 Master AI engineering and build production apps',
      ];

  // Voice recording finish handler
  const handleFinishVoiceRecording = async (result: { uri: string; duration: number }) => {
    try {
      setIsTranscribing(true);
      const uploadUrl = await generateAudioUploadUrl();
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, result.uri, {
        httpMethod: 'POST',
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': 'audio/m4a' },
      });

      if (uploadResult.status !== 200) {
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }

      const { storageId } = JSON.parse(uploadResult.body);
      const transcribeRes = await transcribeAudioAction({
        storageId,
        languageHint: isArabic ? 'ar' : 'en',
      });

      if (transcribeRes?.transcript) {
        const transText = transcribeRes.transcript.trim();

        if (voiceTarget === 'subgoals') {
          setSubGoalsPromptText(transText);
          handleGenerateSubGoalsWithAI(transText);
        } else if (voiceTarget === 'refine') {
          setRefinementInput(transText);
          handleRefineGoal(transText);
        } else {
          setPromptText(transText);
          handleArchitectGoal(transText);
        }
      }
    } catch (err) {
      console.warn('Voice transcription failed:', err);
      Alert.alert(
        isArabic ? 'خطأ في الصوت' : 'Audio Error',
        isArabic ? 'تعذر تحويل الصوت إلى نص. يرجى المحاولة ثانية.' : 'Failed to transcribe voice note.'
      );
    } finally {
      setIsTranscribing(false);
      setVoiceTarget('main');
    }
  };

  // Compile combined list of existing sections (from parent page + staged in this session)
  const allKnownSections = React.useMemo(() => {
    const set = new Set<string>(existingCategories);
    stagedGoals.forEach((g) => {
      if (g.category) set.add(g.category);
    });
    return Array.from(set);
  }, [existingCategories, stagedGoals]);

  // Main Architect Goal Action (Generates goal with NO sub-goals by default)
  const handleArchitectGoal = async (overridePrompt?: string) => {
    const input = overridePrompt || promptText;
    if (!input.trim()) {
      Alert.alert(
        isArabic ? 'اكتب هدفك' : 'Enter Your Goal',
        isArabic
          ? 'يرجى كتابة أو تسجيل ما ترغب في تحقيقه بلغتك الطبيعية.'
          : 'Please type or speak what you wish to achieve in natural language.'
      );
      return;
    }

    try {
      setStep('generating');
      setGeneratingStatus(
        isArabic
          ? 'الذكاء الاصطناعي يستوعب رغبتك وهدفك...'
          : 'AI is analyzing your natural language intent...'
      );

      const statusTimer = setTimeout(() => {
        setGeneratingStatus(
          isArabic
            ? 'صياغة الهدف وتحديد القسم والقالب الأنسب...'
            : 'Formulating goal, section header, and UI template...'
        );
      }, 1500);

      const previousGoalsPayload = stagedGoals.map((g) => ({
        text: g.text,
        category: g.category,
        templateId: g.templateId,
      }));

      const res = await architectGoalAction({
        userMessage: input.trim(),
        timeframe,
        year,
        month,
        day,
        existingSections: allKnownSections,
        previousGoalsInSession: previousGoalsPayload,
        language: isArabic ? 'ar' : 'en',
      });

      clearTimeout(statusTimer);

      if (res) {
        // Prepare header options including known existing sections
        const formattedHeaderOptions: HeaderOption[] = [];

        // 1. Suggested header
        formattedHeaderOptions.push({
          title: res.suggestedHeader,
          isExisting: res.suggestedHeaderIsExisting,
        });

        // 2. Other existing sections
        allKnownSections.forEach((s) => {
          if (s !== res.suggestedHeader) {
            formattedHeaderOptions.push({ title: s, isExisting: true });
          }
        });

        setCurrentDraft({
          goalTitle: res.goalTitle,
          description: res.description,
          category: res.suggestedHeader,
          templateId: res.suggestedTemplateId || 'roadmap',
          color: res.color || '#EA580C',
          icon: res.icon || 'flag-outline',
          milestones: res.suggestedMilestones || [], // Empty by default
          headerOptions: formattedHeaderOptions,
          aiResponseText: res.aiResponseText,
        });

        setIsCustomCategoryActive(false);
        setCustomCategoryText('');
        setShowSubGoalCreator(false);
        setSubGoalsPromptText('');
        setStep('review');
      }
    } catch (err: any) {
      console.error('Goal Architect error:', err);
      Alert.alert(
        isArabic ? 'تعذر بناء الهدف' : 'Generation Failed',
        isArabic
          ? 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى.'
          : 'Could not structure goal. Please check connection and try again.'
      );
      setStep('chat');
    }
  };

  // Generate Sub-Goals on demand after user talks to AI model about them
  const handleGenerateSubGoalsWithAI = async (overrideInstructions?: string) => {
    const instructions = overrideInstructions || subGoalsPromptText;
    if (!instructions.trim() || !currentDraft) {
      Alert.alert(
        isArabic ? 'اكتب تعليماتك' : 'Enter Instructions',
        isArabic
          ? 'يرجى كتابة أو تسجيل تفاصيل المهام الفرعية التي تريدها للهدف.'
          : 'Please enter or speak your instructions for breaking down the goal.'
      );
      return;
    }

    try {
      setIsCreatingSubGoals(true);
      const res = await generateSubGoalsAction({
        goalTitle: currentDraft.goalTitle,
        description: currentDraft.description,
        category: currentDraft.category,
        timeframe,
        userInstructions: instructions.trim(),
        language: isArabic ? 'ar' : 'en',
      });

      if (res && res.milestones) {
        setCurrentDraft((prev) =>
          prev
            ? {
                ...prev,
                milestones: res.milestones,
                aiResponseText: res.aiExplanation || prev.aiResponseText,
              }
            : null
        );
        setSubGoalsPromptText('');
        setShowSubGoalCreator(false);
      }
    } catch (err) {
      console.warn('Generate sub-goals error:', err);
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic
          ? 'تعذر توليد المهام الفرعية. يرجى إعادة المحاولة.'
          : 'Failed to generate sub-goals. Please try again.'
      );
    } finally {
      setIsCreatingSubGoals(false);
    }
  };

  // Refine Goal with Conversational Instruction
  const handleRefineGoal = async (overrideInstruction?: string) => {
    const instruction = overrideInstruction || refinementInput;
    if (!instruction.trim() || !currentDraft) return;

    try {
      setIsRefining(true);
      const res = await refineGoalAction({
        currentDraft: {
          goalTitle: currentDraft.goalTitle,
          description: currentDraft.description,
          category: currentDraft.category,
          templateId: currentDraft.templateId,
          color: currentDraft.color,
          icon: currentDraft.icon,
          milestones: currentDraft.milestones,
        },
        instruction: instruction.trim(),
        existingSections: allKnownSections,
        language: isArabic ? 'ar' : 'en',
      });

      if (res) {
        setCurrentDraft((prev) =>
          prev
            ? {
                ...prev,
                goalTitle: res.goalTitle,
                description: res.description || prev.description,
                category: res.category,
                templateId: res.templateId || prev.templateId,
                color: res.color || prev.color,
                icon: res.icon || prev.icon,
                milestones: res.milestones,
                aiResponseText: res.aiResponseText || prev.aiResponseText,
              }
            : null
        );
        setRefinementInput('');
      }
    } catch (err) {
      console.warn('Goal refinement error:', err);
      Alert.alert(
        isArabic ? 'تنبيه' : 'Notice',
        isArabic ? 'تعذر تطبيق التعديل. يرجى إعادة المحاولة.' : 'Could not refine goal.'
      );
    } finally {
      setIsRefining(false);
    }
  };

  // Select UI Template
  const handleSelectTemplate = (tplId: string) => {
    if (!currentDraft) return;
    setCurrentDraft((prev) => (prev ? { ...prev, templateId: tplId } : null));
  };

  // Select Header Category
  const handleSelectHeader = (catTitle: string) => {
    if (!currentDraft) return;
    setIsCustomCategoryActive(false);
    setCurrentDraft((prev) => (prev ? { ...prev, category: catTitle } : null));
  };

  // Apply Custom Category
  const handleApplyCustomCategory = () => {
    if (!customCategoryText.trim() || !currentDraft) return;
    const cat = customCategoryText.trim();
    setCurrentDraft((prev) =>
      prev
        ? {
            ...prev,
            category: cat,
            headerOptions: [
              { title: cat, isExisting: false },
              ...prev.headerOptions.filter((o) => o.title !== cat),
            ],
          }
        : null
    );
    setIsCustomCategoryActive(false);
  };

  // Milestone Manipulations
  const handleToggleMilestone = (id: string) => {
    if (!currentDraft) return;
    setCurrentDraft((prev) =>
      prev
        ? {
            ...prev,
            milestones: prev.milestones.map((m) =>
              m.id === id ? { ...m, isCompleted: !m.isCompleted } : m
            ),
          }
        : null
    );
  };

  const handleUpdateMilestoneText = (id: string, text: string) => {
    if (!currentDraft) return;
    setCurrentDraft((prev) =>
      prev
        ? {
            ...prev,
            milestones: prev.milestones.map((m) => (m.id === id ? { ...m, text } : m)),
          }
        : null
    );
  };

  const handleDeleteMilestone = (id: string) => {
    if (!currentDraft) return;
    setCurrentDraft((prev) =>
      prev
        ? {
            ...prev,
            milestones: prev.milestones.filter((m) => m.id !== id),
          }
        : null
    );
  };

  const handleClearAllMilestones = () => {
    if (!currentDraft) return;
    setCurrentDraft((prev) => (prev ? { ...prev, milestones: [] } : null));
  };

  const handleAddMilestone = () => {
    if (!newMilestoneText.trim() || !currentDraft) return;
    const newMs: MilestoneItem = {
      id: `ms_${Date.now()}`,
      text: newMilestoneText.trim(),
      isCompleted: false,
    };
    setCurrentDraft((prev) =>
      prev
        ? {
            ...prev,
            milestones: [...prev.milestones, newMs],
          }
        : null
    );
    setNewMilestoneText('');
  };

  // Stage current draft and prompt for next goal
  const handleStageAndNext = () => {
    if (!currentDraft || !currentDraft.goalTitle.trim()) return;

    const staged: StagedGoal = {
      id: `staged_${Date.now()}`,
      text: currentDraft.goalTitle.trim(),
      description: currentDraft.description,
      category: currentDraft.category || (isArabic ? 'أهداف عامة' : 'General Goals'),
      templateId: currentDraft.templateId || 'roadmap',
      color: currentDraft.color,
      icon: currentDraft.icon,
      milestones: currentDraft.milestones,
    };

    setStagedGoals((prev) => [...prev, staged]);
    setCurrentDraft(null);
    setPromptText('');
    setShowSubGoalCreator(false);
    setSubGoalsPromptText('');
    setStep('chat');
  };

  // Save all goals directly to Convex DB
  const handleSaveAllToGoals = async () => {
    const goalsToSave: StagedGoal[] = [...stagedGoals];

    if (currentDraft && currentDraft.goalTitle.trim()) {
      goalsToSave.push({
        id: `draft_${Date.now()}`,
        text: currentDraft.goalTitle.trim(),
        description: currentDraft.description,
        category: currentDraft.category || (isArabic ? 'أهداف عامة' : 'General Goals'),
        templateId: currentDraft.templateId || 'roadmap',
        color: currentDraft.color,
        icon: currentDraft.icon,
        milestones: currentDraft.milestones,
      });
    }

    if (goalsToSave.length === 0) {
      Alert.alert(
        isArabic ? 'لا توجد أهداف' : 'No Goals',
        isArabic ? 'يرجى كتابة هدف أولاً.' : 'Please create a goal first.'
      );
      return;
    }

    try {
      setIsSaving(true);

      await saveGoalsMut({
        userId,
        year,
        month,
        day,
        goals: goalsToSave.map((g) => ({
          text: g.text,
          description: g.description,
          category: g.category,
          color: g.color,
          icon: g.icon,
          templateId: g.templateId,
          milestones: g.milestones,
        })),
        themeTitle: isMonth
          ? isArabic
            ? `خطة ${monthName} ${year}`
            : `${monthName} ${year} Blueprint`
          : undefined,
      });

      onPlanApplied?.();
      onClose();

      Alert.alert(
        isArabic ? 'تم الحفظ بنجاح! 🚀' : 'Goals Saved Successfully! 🚀',
        isArabic
          ? `تمت إضافة ${goalsToSave.length} ${goalsToSave.length > 1 ? 'أهداف' : 'هدف'} إلى خطتك وتنسيقها بالقوالب المختارة.`
          : `Added ${goalsToSave.length} ${goalsToSave.length > 1 ? 'goals' : 'goal'} to your plan with selected UI designs.`
      );
    } catch (err) {
      console.error('Save goals error:', err);
      Alert.alert(
        isArabic ? 'خطأ في الحفظ' : 'Save Error',
        isArabic ? 'تعذر حفظ الأهداف. يرجى المحاولة ثانية.' : 'Failed to save goals.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Render Interactive Live Preview Card of Goal based on Chosen UI Template
  const renderGoalLivePreview = () => {
    if (!currentDraft) return null;
    const tpl =
      GOAL_UI_TEMPLATES.find((t) => t.id === currentDraft.templateId) || GOAL_UI_TEMPLATES[0];
    const cardColor = currentDraft.color || tpl.color;

    return (
      <View style={styles.previewSection}>
        <View style={[styles.previewSectionHeader, isArabic && styles.rowReverse]}>
          <Ionicons name="eye-outline" size={16} color={cardColor} />
          <Text style={[styles.previewSectionTitle, { color: colors.text }]}>
            {isArabic ? 'معاينة حية لتصميم الهدف في خطتك' : 'Live Goal Card UI Preview'}
          </Text>
          <View style={[styles.previewBadge, { backgroundColor: cardColor + '20' }]}>
            <Text style={[styles.previewBadgeText, { color: cardColor }]}>
              {isArabic ? tpl.nameAr : tpl.name}
            </Text>
          </View>
        </View>

        {/* ─── Roadmap Template Style ─── */}
        {currentDraft.templateId === 'roadmap' && (
          <View
            style={[
              styles.previewCardRoadmap,
              {
                backgroundColor: isDarkMode ? '#1E1E28' : '#F8FAFC',
                borderColor: cardColor + '40',
              },
            ]}
          >
            <View style={[styles.roadmapHeader, isArabic && styles.rowReverse]}>
              <View style={[styles.roadmapIconCircle, { backgroundColor: cardColor + '20' }]}>
                <Ionicons name="git-commit-outline" size={18} color={cardColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.roadmapCategoryTag, { color: cardColor, textAlign: isArabic ? 'right' : 'left' }]}>
                  {currentDraft.category}
                </Text>
                <Text style={[styles.roadmapGoalTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                  {currentDraft.goalTitle}
                </Text>
              </View>
            </View>

            {currentDraft.description ? (
              <Text style={[styles.previewDescText, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                {currentDraft.description}
              </Text>
            ) : null}

            {/* Connecting Timeline Track (if milestones exist) */}
            {currentDraft.milestones.length > 0 ? (
              <View style={styles.roadmapTrackContainer}>
                {currentDraft.milestones.map((ms, idx) => {
                  const isLast = idx === currentDraft.milestones.length - 1;
                  return (
                    <View key={ms.id} style={[styles.roadmapStepRow, isArabic && styles.rowReverse]}>
                      <View style={styles.roadmapNodeCol}>
                        <View
                          style={[
                            styles.roadmapNodeDot,
                            {
                              backgroundColor: ms.isCompleted ? '#10B981' : cardColor,
                              borderColor: isDarkMode ? '#1E1E28' : '#F8FAFC',
                            },
                          ]}
                        >
                          <Text style={styles.roadmapNodeNumber}>{idx + 1}</Text>
                        </View>
                        {!isLast && (
                          <View style={[styles.roadmapConnectingLine, { backgroundColor: cardColor + '35' }]} />
                        )}
                      </View>
                      <View style={styles.roadmapStepContent}>
                        <Text
                          style={[
                            styles.roadmapStepText,
                            {
                              color: colors.text,
                              textAlign: isArabic ? 'right' : 'left',
                            },
                          ]}
                        >
                          {ms.text}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.noMilestonesPreviewPill, isArabic && styles.rowReverse]}>
                <Ionicons name="information-circle-outline" size={15} color={cardColor} />
                <Text style={[styles.noMilestonesPreviewText, { color: colors.textMuted }]}>
                  {isArabic
                    ? 'هدف مباشر بدون مهام فرعية (يمكنك تفكيكه أدناه)'
                    : 'Single goal without sub-goals (can break down below)'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ─── Clean Checklist Style ─── */}
        {currentDraft.templateId === 'checklist' && (
          <View
            style={[
              styles.previewCardChecklist,
              {
                backgroundColor: isDarkMode ? '#1E1E28' : '#FFFFFF',
                borderColor: isDarkMode ? '#2D2D3E' : '#E2E8F0',
              },
            ]}
          >
            <View style={[styles.checklistHeaderRow, isArabic && styles.rowReverse]}>
              <View style={[styles.checkCategoryPill, { backgroundColor: cardColor + '18' }]}>
                <Ionicons name="pricetag-outline" size={12} color={cardColor} />
                <Text style={[styles.checkCategoryText, { color: cardColor }]}>
                  {currentDraft.category}
                </Text>
              </View>
              <View style={[styles.checklistStatsPill, { backgroundColor: isDarkMode ? '#2A2A3C' : '#F1F5F9' }]}>
                <Text style={[styles.checklistStatsText, { color: colors.textMuted }]}>
                  {currentDraft.milestones.length > 0
                    ? `${currentDraft.milestones.length} ${isArabic ? 'مهام فرعية' : 'sub-tasks'}`
                    : isArabic ? 'عنصر مباشر' : 'Direct Action'}
                </Text>
              </View>
            </View>

            <Text style={[styles.checklistTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
              {currentDraft.goalTitle}
            </Text>

            {currentDraft.description ? (
              <Text style={[styles.previewDescText, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                {currentDraft.description}
              </Text>
            ) : null}

            {currentDraft.milestones.length > 0 && (
              <View style={{ marginTop: 10 }}>
                {currentDraft.milestones.map((ms) => (
                  <View key={ms.id} style={[styles.checkItemRow, isArabic && styles.rowReverse]}>
                    <View style={[styles.checkItemRing, { borderColor: cardColor }]}>
                      {ms.isCompleted && <View style={[styles.checkItemFill, { backgroundColor: cardColor }]} />}
                    </View>
                    <Text style={[styles.checkItemText, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                      {ms.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── Metric & Counter Style ─── */}
        {currentDraft.templateId === 'metric' && (
          <View
            style={[
              styles.previewCardMetric,
              {
                backgroundColor: isDarkMode ? '#1E1E28' : '#FFFDF8',
                borderColor: '#F59E0B40',
              },
            ]}
          >
            <View style={[styles.metricHeaderRow, isArabic && styles.rowReverse]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.metricCategory, { color: '#D97706', textAlign: isArabic ? 'right' : 'left' }]}>
                  {currentDraft.category}
                </Text>
                <Text style={[styles.metricTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                  {currentDraft.goalTitle}
                </Text>
              </View>
              <View style={styles.metricGaugeCircle}>
                <Text style={styles.metricGaugePercent}>0%</Text>
                <Text style={styles.metricGaugeLabel}>{isArabic ? 'الهدف' : 'TARGET'}</Text>
              </View>
            </View>

            <View style={styles.metricProgressTrack}>
              <View style={[styles.metricProgressFill, { width: '10%', backgroundColor: '#F59E0B' }]} />
            </View>

            {currentDraft.milestones.length > 0 ? (
              <View style={[styles.metricMilestonesList, { marginTop: 12 }]}>
                {currentDraft.milestones.map((ms, idx) => (
                  <View key={ms.id} style={[styles.metricMilestoneRow, isArabic && styles.rowReverse]}>
                    <View style={styles.metricNumberBox}>
                      <Text style={styles.metricNumberText}>#{idx + 1}</Text>
                    </View>
                    <Text style={[styles.metricMilestoneText, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                      {ms.text}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {/* ─── Sprint Capsule Style ─── */}
        {currentDraft.templateId === 'sprint' && (
          <View
            style={[
              styles.previewCardSprint,
              {
                backgroundColor: isDarkMode ? '#1E1E28' : '#FEF2F2',
                borderColor: '#EF444450',
              },
            ]}
          >
            <View style={[styles.sprintTopRow, isArabic && styles.rowReverse]}>
              <View style={styles.sprintBadge}>
                <Ionicons name="flash" size={13} color="#FFFFFF" />
                <Text style={styles.sprintBadgeText}>{isArabic ? 'سبرنت تركيز' : 'ACTIVE SPRINT'}</Text>
              </View>
              <Text style={[styles.sprintCategoryText, { color: '#DC2626' }]}>
                {currentDraft.category}
              </Text>
            </View>

            <Text style={[styles.sprintTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
              {currentDraft.goalTitle}
            </Text>

            {currentDraft.description ? (
              <Text style={[styles.previewDescText, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                {currentDraft.description}
              </Text>
            ) : null}

            {currentDraft.milestones.length > 0 && (
              <View style={styles.sprintMilestonesContainer}>
                {currentDraft.milestones.map((ms) => (
                  <View key={ms.id} style={[styles.sprintItemCapsule, isArabic && styles.rowReverse]}>
                    <View style={styles.sprintItemDot} />
                    <Text style={[styles.sprintItemText, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                      {ms.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── Deep Focus Pillar Style ─── */}
        {currentDraft.templateId === 'pillar' && (
          <View
            style={[
              styles.previewCardPillar,
              {
                backgroundColor: isDarkMode ? '#1E1E28' : '#FAF5FF',
                borderColor: '#8B5CF640',
                borderLeftColor: '#8B5CF6',
              },
            ]}
          >
            <View style={[styles.pillarTopRow, isArabic && styles.rowReverse]}>
              <View style={styles.pillarTag}>
                <Ionicons name="shield-checkmark" size={13} color="#8B5CF6" />
                <Text style={styles.pillarTagText}>{isArabic ? 'ركيزة استراتيجية' : 'CORE PILLAR'}</Text>
              </View>
              <Text style={[styles.pillarCategory, { color: '#7C3AED' }]}>
                {currentDraft.category}
              </Text>
            </View>

            <Text style={[styles.pillarTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
              {currentDraft.goalTitle}
            </Text>

            {currentDraft.description ? (
              <View style={styles.pillarQuoteBox}>
                <Text style={[styles.pillarQuoteText, { color: '#6D28D9', textAlign: isArabic ? 'right' : 'left' }]}>
                  "{currentDraft.description}"
                </Text>
              </View>
            ) : null}

            {currentDraft.milestones.length > 0 && (
              <View style={{ marginTop: 8 }}>
                {currentDraft.milestones.map((ms) => (
                  <View key={ms.id} style={[styles.pillarStepRow, isArabic && styles.rowReverse]}>
                    <Ionicons name="chevron-forward-circle-outline" size={16} color="#8B5CF6" />
                    <Text style={[styles.pillarStepText, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                      {ms.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ─── Top Bar ──────────────────────────────────────────────────────── */}
        <View
          style={[
            styles.modalHeaderBar,
            {
              backgroundColor: colors.surface,
              borderBottomColor: isDarkMode ? '#282836' : '#E5E7EB',
            },
            isArabic && styles.rowReverse,
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="sparkles" size={18} color="#EA580C" />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {isArabic ? 'مهندس الأهداف بالذكاء الاصطناعي' : 'AI Goal Architect'}
              </Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: '#EA580C' }]}>
              {contextBadgeText}
            </Text>
          </View>

          {/* Staged goals counter pill */}
          <View style={styles.stagedBadge}>
            <Text style={styles.stagedBadgeText}>{stagedGoals.length}</Text>
          </View>
        </View>

        {/* ─── STEP 1: Conversational Chat & Voice Input ──────────────────────── */}
        {step === 'chat' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Previously Staged Goals in this session (if any) */}
            {stagedGoals.length > 0 && (
              <View style={[styles.sessionStagedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.stagedHeaderRow, isArabic && styles.rowReverse]}>
                  <Ionicons name="layers-outline" size={16} color="#EA580C" />
                  <Text style={[styles.stagedHeaderTitle, { color: colors.text }]}>
                    {isArabic
                      ? `الأهداف المجهزة في هذه الجلسة (${stagedGoals.length})`
                      : `Goals Ready in This Session (${stagedGoals.length})`}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
                  {stagedGoals.map((sg, i) => (
                    <View key={sg.id} style={[styles.stagedMiniPill, { backgroundColor: isDarkMode ? '#282836' : '#F3F4F6' }]}>
                      <Text style={[styles.stagedMiniPillText, { color: colors.text }]} numberOfLines={1}>
                        #{i + 1} {sg.text}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#EA580C' }}>• {sg.category}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* AI Welcome & Guidance Banner */}
            <View
              style={[
                styles.heroBanner,
                {
                  backgroundColor: isDarkMode ? '#1E1E28' : '#FFF7ED',
                  borderColor: isDarkMode ? '#EA580C30' : '#FFEDD5',
                },
              ]}
            >
              <View style={[styles.heroRow, isArabic && styles.rowReverse]}>
                <View style={styles.heroSparkleCircle}>
                  <Ionicons name="sparkles" size={22} color="#EA580C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroTitle, { color: isDarkMode ? '#FED7AA' : '#9A3412', textAlign: isArabic ? 'right' : 'left' }]}>
                    {stagedGoals.length > 0
                      ? isArabic
                        ? 'أحسنت! ما هو هدفك التالي؟'
                        : 'Great! What is your next goal?'
                      : isArabic
                      ? 'تحدث أو اكتب ما تريد إنجازه بلغتك الطبيعية'
                      : 'Speak or type what you wish to achieve'}
                  </Text>
                  <Text style={[styles.heroDesc, { color: isDarkMode ? '#E5E7EB' : '#7C2D12', textAlign: isArabic ? 'right' : 'left' }]}>
                    {isArabic
                      ? 'سيقوم مهندس الذكاء الاصطناعي بصياغة الهدف والقسم وقالب التصميم، ولن يتم إنشاء مهام فرعية تلقائياً حتى تقرر أنت ذلك وتتحدث معه عنها.'
                      : 'AI will formulate your goal, header section, and UI template. No sub-goals are auto-generated until you choose to break it down.'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Main Natural Language Chat & Voice Input Box */}
            <View
              style={[
                styles.chatInputCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDarkMode ? '#2D2D3E' : '#E5E7EB',
                },
              ]}
            >
              <TextInput
                style={[
                  styles.chatTextInput,
                  {
                    color: colors.text,
                    textAlign: isArabic ? 'right' : 'left',
                  },
                ]}
                placeholder={
                  isArabic
                    ? 'مثال: أريد إنهاء كورس بايثون المتقدم في 3 أسابيع، وبناء مشروع تخرج متكامل...'
                    : 'e.g., I want to finish the Advanced Python course in 3 weeks and build a capstone project...'
                }
                placeholderTextColor={colors.textMuted}
                multiline
                value={promptText}
                onChangeText={setPromptText}
                autoFocus={stagedGoals.length === 0}
              />

              {/* Input Action Controls (Voice Mic + Send Button) */}
              <View style={[styles.inputActionsRow, isArabic && styles.rowReverse]}>
                <TouchableOpacity
                  style={[styles.voiceMicBtn, { backgroundColor: isTranscribing ? '#EF4444' : '#EA580C18' }]}
                  onPress={() => {
                    setVoiceTarget('main');
                    setVoiceModalVisible(true);
                  }}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="mic" size={20} color="#EA580C" />
                  )}
                  <Text style={[styles.voiceMicText, { color: isTranscribing ? '#FFFFFF' : '#EA580C' }]}>
                    {isTranscribing
                      ? isArabic ? 'جاري التحويل...' : 'Transcribing...'
                      : isArabic ? 'تسجيل صوتي' : 'Voice Chat'}
                  </Text>
                </TouchableOpacity>

                <LivePress
                  style={[
                    styles.architectBtn,
                    {
                      backgroundColor: promptText.trim() ? '#EA580C' : isDarkMode ? '#282836' : '#E5E7EB',
                    },
                  ]}
                  onPress={() => handleArchitectGoal()}
                  disabled={!promptText.trim()}
                  pressScale={0.96}
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={promptText.trim() ? '#FFFFFF' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.architectBtnText,
                      { color: promptText.trim() ? '#FFFFFF' : colors.textMuted },
                    ]}
                  >
                    {isArabic ? 'هندسة وصياغة الهدف' : 'Architect Goal'}
                  </Text>
                </LivePress>
              </View>
            </View>

            {/* Quick Inspiration Pills */}
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'أفكار سريعة للإلهام:' : 'Quick inspirations for this timeframe:'}
              </Text>
              <View style={[styles.inspirationRow, isArabic && styles.rowReverse]}>
                {inspirationPrompts.map((p, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.inspirationChip,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isDarkMode ? '#282836' : '#E5E7EB',
                      },
                    ]}
                    onPress={() => {
                      setPromptText(p.replace(/^[^\s]+\s/, ''));
                    }}
                  >
                    <Text style={[styles.inspirationChipText, { color: colors.text }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Staged Goals Save Action (if already have goals ready) */}
            {stagedGoals.length > 0 && (
              <View style={{ marginTop: 30, marginBottom: 20 }}>
                <LivePress
                  style={[styles.saveBatchBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveAllToGoals}
                  pressScale={0.96}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.primaryText} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={20} color={colors.primaryText} />
                      <Text style={[styles.saveBatchBtnText, { color: colors.primaryText }]}>
                        {isArabic
                          ? `حفظ كل الأهداف في خطتي (${stagedGoals.length})`
                          : `Save All Goals to My Plan (${stagedGoals.length})`}
                      </Text>
                    </>
                  )}
                </LivePress>
              </View>
            )}
          </ScrollView>
        )}

        {/* ─── STEP 2: AI Generating Screen ─────────────────────────────────── */}
        {step === 'generating' && (
          <View style={styles.generatingContainer}>
            <View style={styles.generatingIconBox}>
              <Ionicons name="sparkles" size={48} color="#EA580C" />
            </View>
            <Text style={[styles.generatingTitle, { color: colors.text }]}>
              {isArabic ? 'جاري هندسة الهدف بالذكاء الاصطناعي' : 'Architecting Your Goal'}
            </Text>
            <Text style={[styles.generatingSubtitle, { color: colors.textMuted }]}>
              {generatingStatus}
            </Text>
            <ActivityIndicator size="large" color="#EA580C" style={{ marginTop: 24 }} />
          </View>
        )}

        {/* ─── STEP 3: Goal Blueprint Studio (Review & Customization) ────────── */}
        {step === 'review' && currentDraft && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* AI Explanation Speech Bubble */}
            {currentDraft.aiResponseText ? (
              <View
                style={[
                  styles.aiExplanationCard,
                  {
                    backgroundColor: isDarkMode ? '#1E1E28' : '#EFF6FF',
                    borderColor: isDarkMode ? '#3B82F635' : '#DBEAFE',
                  },
                ]}
              >
                <View style={[styles.aiExplanationRow, isArabic && styles.rowReverse]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#2563EB" />
                  <Text style={[styles.aiExplanationText, { color: isDarkMode ? '#93C5FD' : '#1E40AF', textAlign: isArabic ? 'right' : 'left' }]}>
                    {currentDraft.aiResponseText}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Goal Title & Description Inputs */}
            <View style={[styles.editGoalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'عنوان الهدف الأساسي:' : 'Primary Goal Title:'}
              </Text>
              <TextInput
                style={[styles.goalTitleInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
                value={currentDraft.goalTitle}
                onChangeText={(text) =>
                  setCurrentDraft((prev) => (prev ? { ...prev, goalTitle: text } : null))
                }
              />

              <Text style={[styles.fieldLabel, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left', marginTop: 12 }]}>
                {isArabic ? 'الوصف / معيار الإنجاز:' : 'Definition of Done / Description:'}
              </Text>
              <TextInput
                style={[styles.goalDescInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
                value={currentDraft.description}
                onChangeText={(text) =>
                  setCurrentDraft((prev) => (prev ? { ...prev, description: text } : null))
                }
                multiline
                placeholder={isArabic ? 'وصف إضافي أو معيار الإتمام...' : 'Definition of success or outcome...'}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* ─── SECTION / HEADER TITLE SELECTION ─────────────────────────── */}
            <View style={styles.configBlock}>
              <View style={[styles.configBlockHeader, isArabic && styles.rowReverse]}>
                <Ionicons name="folder-outline" size={18} color="#EA580C" />
                <Text style={[styles.configBlockTitle, { color: colors.text }]}>
                  {isArabic ? 'القسم / العنوان الرئيسي (Header Section):' : 'Goal Header Section / Category:'}
                </Text>
              </View>
              <Text style={[styles.configBlockSubtitle, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic
                  ? 'اختر وضع الهدف في أحد الأقسام الموجودة أو اعتماد القسم الجديد المقترح من الذكاء الاصطناعي:'
                  : 'Choose to place this goal under an existing section or the AI-suggested new header:'}
              </Text>

              {/* Header options pills */}
              <View style={[styles.headerOptionsContainer, isArabic && styles.rowReverse]}>
                {currentDraft.headerOptions.map((opt, idx) => {
                  const isSelected = currentDraft.category === opt.title && !isCustomCategoryActive;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.headerOptionPill,
                        {
                          backgroundColor: isSelected ? '#EA580C' : isDarkMode ? '#20202C' : '#F1F5F9',
                          borderColor: isSelected ? '#EA580C' : isDarkMode ? '#2D2D3E' : '#E2E8F0',
                        },
                      ]}
                      onPress={() => handleSelectHeader(opt.title)}
                    >
                      <Ionicons
                        name={opt.isExisting ? 'folder' : 'sparkles'}
                        size={14}
                        color={isSelected ? '#FFFFFF' : opt.isExisting ? colors.textMuted : '#EA580C'}
                      />
                      <Text
                        style={[
                          styles.headerOptionPillText,
                          {
                            color: isSelected ? '#FFFFFF' : colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.title}
                      </Text>
                      <Text
                        style={[
                          styles.headerOptionBadgeText,
                          {
                            color: isSelected ? '#FED7AA' : colors.textMuted,
                          },
                        ]}
                      >
                        {opt.isExisting
                          ? isArabic ? '(موجود)' : '(Existing)'
                          : isArabic ? '(مقترح)' : '(New)'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* + Custom Category Button */}
                <TouchableOpacity
                  style={[
                    styles.headerOptionPill,
                    {
                      backgroundColor: isCustomCategoryActive ? '#EA580C' : isDarkMode ? '#20202C' : '#F1F5F9',
                      borderColor: isCustomCategoryActive ? '#EA580C' : isDarkMode ? '#2D2D3E' : '#E2E8F0',
                    },
                  ]}
                  onPress={() => setIsCustomCategoryActive(true)}
                >
                  <Ionicons name="add" size={16} color={isCustomCategoryActive ? '#FFFFFF' : colors.textMuted} />
                  <Text style={[styles.headerOptionPillText, { color: isCustomCategoryActive ? '#FFFFFF' : colors.text }]}>
                    {isArabic ? 'قسم مخصص...' : 'Custom Section...'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Category Input if active */}
              {isCustomCategoryActive && (
                <View style={[styles.customCategoryInputRow, isArabic && styles.rowReverse]}>
                  <TextInput
                    style={[styles.customCatInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
                    placeholder={isArabic ? 'اكتب اسم القسم الجديد...' : 'Type new section name...'}
                    placeholderTextColor={colors.textMuted}
                    value={customCategoryText}
                    onChangeText={setCustomCategoryText}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.customCatApplyBtn} onPress={handleApplyCustomCategory}>
                    <Text style={styles.customCatApplyText}>{isArabic ? 'تأكيد' : 'Apply'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ─── UI DESIGN TEMPLATE SELECTION (UNDER THE HOOD OPTIONS) ─────── */}
            <View style={styles.configBlock}>
              <View style={[styles.configBlockHeader, isArabic && styles.rowReverse]}>
                <Ionicons name="color-palette-outline" size={18} color="#EA580C" />
                <Text style={[styles.configBlockTitle, { color: colors.text }]}>
                  {isArabic ? 'قالب تصميم وعرض الهدف (UI Template):' : 'Goal Card UI Design Template:'}
                </Text>
              </View>
              <Text style={[styles.configBlockSubtitle, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic
                  ? 'اختر المظهر البصري الذي يناسب طبيعة هذا الهدف في شاشتك:'
                  : 'Select how this goal card will visually display on your goals page:'}
              </Text>

              {/* UI Templates Horizontal Scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.templatesScrollRow, isArabic && styles.rowReverse]}
              >
                {GOAL_UI_TEMPLATES.map((tpl) => {
                  const isSelected = currentDraft.templateId === tpl.id;
                  return (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[
                        styles.templateSelectCard,
                        {
                          backgroundColor: isSelected ? tpl.color + '15' : colors.surface,
                          borderColor: isSelected ? tpl.color : isDarkMode ? '#2D2D3E' : '#E5E7EB',
                        },
                      ]}
                      onPress={() => handleSelectTemplate(tpl.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.templateSelectHeader, isArabic && styles.rowReverse]}>
                        <View style={[styles.templateIconCircle, { backgroundColor: tpl.color + '25' }]}>
                          <Ionicons name={tpl.icon as any} size={18} color={tpl.color} />
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color={tpl.color} />
                        )}
                      </View>

                      <Text style={[styles.templateSelectName, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                        {isArabic ? tpl.nameAr : tpl.name}
                      </Text>

                      <Text
                        style={[
                          styles.templateSelectDesc,
                          { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' },
                        ]}
                        numberOfLines={2}
                      >
                        {isArabic ? tpl.descriptionAr : tpl.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ─── LIVE INTERACTIVE PREVIEW CARD ───────────────────────────── */}
            {renderGoalLivePreview()}

            {/* ─── SUB-GOALS / MILESTONES REVIEW & EDIT ─────────────────────── */}
            <View style={styles.configBlock}>
              <View style={[styles.configBlockHeader, isArabic && styles.rowReverse]}>
                <Ionicons name="list-outline" size={18} color="#EA580C" />
                <Text style={[styles.configBlockTitle, { color: colors.text }]}>
                  {isArabic
                    ? `المهام الفرعية والمحطات (${currentDraft.milestones.length}):`
                    : `Sub-Goals & Milestones (${currentDraft.milestones.length}):`}
                </Text>
                {currentDraft.milestones.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearAllMilestones}
                    style={{ marginLeft: isArabic ? 0 : 'auto', marginRight: isArabic ? 'auto' : 0 }}
                  >
                    <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>
                      {isArabic ? 'مسح الكل' : 'Clear All'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Case A: No sub-goals yet (Default) -> Offer option to create them with AI or manually */}
              {currentDraft.milestones.length === 0 ? (
                <View
                  style={[
                    styles.subGoalsOptInCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isDarkMode ? '#2D2D3E' : '#E5E7EB',
                    },
                  ]}
                >
                  <View style={[styles.subGoalsOptInRow, isArabic && styles.rowReverse]}>
                    <View style={styles.subGoalsSparkleCircle}>
                      <Ionicons name="options-outline" size={22} color="#EA580C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subGoalsOptInTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                        {isArabic ? 'مهام فرعية اختيارية ومخصصة' : 'Optional Tailored Sub-Goals'}
                      </Text>
                      <Text style={[styles.subGoalsOptInDesc, { color: colors.textMuted, textAlign: isArabic ? 'right' : 'left' }]}>
                        {isArabic
                          ? 'الهدف محدد ومباشر بدون مهام فرعية تلقائية. إذا رغبت، يمكنك التحدث مع الذكاء الاصطناعي لتقسيم الهدف وفق رغبتك بدقة.'
                          : 'Goal is currently direct with no generic sub-goals. You can instruct the AI model to break it down specifically as you wish.'}
                      </Text>
                    </View>
                  </View>

                  {/* Buttons to trigger AI sub-goals or add manually */}
                  {!showSubGoalCreator ? (
                    <View style={[styles.subGoalsActionButtonsRow, isArabic && styles.rowReverse]}>
                      <LivePress
                        style={styles.breakDownWithAiBtn}
                        onPress={() => setShowSubGoalCreator(true)}
                        pressScale={0.96}
                      >
                        <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                        <Text style={styles.breakDownWithAiBtnText}>
                          {isArabic ? '✨ تفكيك بالذكاء الاصطناعي' : '✨ Break Down with AI'}
                        </Text>
                      </LivePress>

                      <TouchableOpacity
                        style={[styles.addManualSubGoalBtn, { borderColor: isDarkMode ? '#3B3B4E' : '#D1D5DB' }]}
                        onPress={() => {
                          const newMs: MilestoneItem = {
                            id: `ms_${Date.now()}`,
                            text: '',
                            isCompleted: false,
                          };
                          setCurrentDraft((prev) => (prev ? { ...prev, milestones: [newMs] } : null));
                        }}
                      >
                        <Ionicons name="add" size={16} color={colors.text} />
                        <Text style={[styles.addManualSubGoalText, { color: colors.text }]}>
                          {isArabic ? 'إضافة يدوياً' : 'Add Manually'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* AI Sub-Goals Conversation Box */
                    <View style={[styles.subGoalAiBox, { backgroundColor: isDarkMode ? '#1E1E28' : '#FFF7ED', borderColor: '#EA580C40' }]}>
                      <Text style={[styles.subGoalAiBoxPromptLabel, { color: isDarkMode ? '#FED7AA' : '#9A3412', textAlign: isArabic ? 'right' : 'left' }]}>
                        {isArabic
                          ? 'تحدث أو اكتب للذكاء الاصطناعي عن رغبتك في تفكيك هذا الهدف:'
                          : 'Tell AI how you want to break down this goal:'}
                      </Text>

                      <TextInput
                        style={[
                          styles.subGoalAiInput,
                          {
                            color: colors.text,
                            textAlign: isArabic ? 'right' : 'left',
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                        placeholder={
                          isArabic
                            ? 'مثال: قسّمه إلى 3 أسابيع، أو ركّز على التطبيق العملي والمشروع النهائي...'
                            : 'e.g., Break into 3 weekly sprints, or focus on practical modules and final test...'
                        }
                        placeholderTextColor={colors.textMuted}
                        value={subGoalsPromptText}
                        onChangeText={setSubGoalsPromptText}
                        multiline
                      />

                      <View style={[styles.subGoalAiActionsRow, isArabic && styles.rowReverse]}>
                        <TouchableOpacity
                          style={[styles.subGoalMicBtn, { backgroundColor: isTranscribing ? '#EF4444' : '#EA580C18' }]}
                          onPress={() => {
                            setVoiceTarget('subgoals');
                            setVoiceModalVisible(true);
                          }}
                          disabled={isTranscribing || isCreatingSubGoals}
                        >
                          <Ionicons name="mic" size={18} color="#EA580C" />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#EA580C' }}>
                            {isArabic ? 'تحدث بصوتك' : 'Speak'}
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => setShowSubGoalCreator(false)}
                            style={{ paddingHorizontal: 10, paddingVertical: 8 }}
                          >
                            <Text style={{ fontSize: 12, color: colors.textMuted }}>
                              {isArabic ? 'إلغاء' : 'Cancel'}
                            </Text>
                          </TouchableOpacity>

                          <LivePress
                            style={[
                              styles.subGoalSubmitBtn,
                              { backgroundColor: subGoalsPromptText.trim() ? '#EA580C' : colors.border },
                            ]}
                            onPress={() => handleGenerateSubGoalsWithAI()}
                            disabled={!subGoalsPromptText.trim() || isCreatingSubGoals}
                            pressScale={0.96}
                          >
                            {isCreatingSubGoals ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                                <Text style={styles.subGoalSubmitBtnText}>
                                  {isArabic ? 'توليد المهام' : 'Generate'}
                                </Text>
                              </>
                            )}
                          </LivePress>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                /* Case B: Milestones exist -> Interactive Editor */
                <View style={[styles.milestonesEditorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {currentDraft.milestones.map((ms) => (
                    <View key={ms.id} style={[styles.milestoneEditRow, isArabic && styles.rowReverse]}>
                      <TouchableOpacity
                        onPress={() => handleToggleMilestone(ms.id)}
                        style={styles.msCheckboxTouch}
                      >
                        <Ionicons
                          name={ms.isCompleted ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={ms.isCompleted ? '#10B981' : colors.textMuted}
                        />
                      </TouchableOpacity>

                      <TextInput
                        style={[
                          styles.milestoneEditTextInput,
                          {
                            color: colors.text,
                            textAlign: isArabic ? 'right' : 'left',
                          },
                        ]}
                        value={ms.text}
                        onChangeText={(text) => handleUpdateMilestoneText(ms.id, text)}
                      />

                      <TouchableOpacity
                        onPress={() => handleDeleteMilestone(ms.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.msDeleteBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Add new milestone row */}
                  <View style={[styles.addMilestoneRow, isArabic && styles.rowReverse]}>
                    <TextInput
                      style={[styles.addMilestoneInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
                      placeholder={isArabic ? 'إضافة مهمة فرعية يدوياً...' : 'Add a sub-goal manually...'}
                      placeholderTextColor={colors.textMuted}
                      value={newMilestoneText}
                      onChangeText={setNewMilestoneText}
                      onSubmitEditing={handleAddMilestone}
                    />
                    <TouchableOpacity
                      style={[styles.addMilestoneBtn, { backgroundColor: newMilestoneText.trim() ? '#EA580C' : colors.border }]}
                      onPress={handleAddMilestone}
                      disabled={!newMilestoneText.trim()}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* ─── CONVERSATIONAL REFINEMENT INPUT ──────────────────────────── */}
            <View style={styles.configBlock}>
              <View style={[styles.configBlockHeader, isArabic && styles.rowReverse]}>
                <Ionicons name="chatbubbles-outline" size={18} color="#2563EB" />
                <Text style={[styles.configBlockTitle, { color: colors.text }]}>
                  {isArabic ? 'تعديل الهدف بالدردشة أو الصوت:' : 'Refine Goal via Chat/Voice:'}
                </Text>
              </View>

              <View style={[styles.refineChatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.refineChatInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}
                  placeholder={
                    isArabic
                      ? 'اكتب أو سجل لتعديل الهدف (مثال: غير القسم إلى التقنية، عدّل العنوان)...'
                      : 'Type or speak to adjust (e.g., change category to Tech, update title)...'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={refinementInput}
                  onChangeText={setRefinementInput}
                />

                <View style={[styles.refineActionRow, isArabic && styles.rowReverse]}>
                  <TouchableOpacity
                    style={[styles.refineMicBtn, { backgroundColor: isTranscribing ? '#EF4444' : '#EA580C18' }]}
                    onPress={() => {
                      setVoiceTarget('refine');
                      setVoiceModalVisible(true);
                    }}
                    disabled={isTranscribing || isRefining}
                  >
                    <Ionicons name="mic" size={18} color="#EA580C" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.refineSubmitBtn, { backgroundColor: refinementInput.trim() ? '#2563EB' : colors.border }]}
                    onPress={() => handleRefineGoal()}
                    disabled={!refinementInput.trim() || isRefining}
                  >
                    {isRefining ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="send" size={14} color="#FFFFFF" />
                        <Text style={styles.refineSubmitText}>{isArabic ? 'تعديل' : 'Refine'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ─── ACTION BUTTONS: STAGE & NEXT vs SAVE TO PLAN ──────────────── */}
            <View style={styles.bottomActionsBlock}>
              {/* Button 1: Stage this goal and prompt for another goal */}
              <LivePress
                style={[styles.stageNextBtn, { backgroundColor: isDarkMode ? '#20202C' : '#F1F5F9', borderColor: '#EA580C60' }]}
                onPress={handleStageAndNext}
                pressScale={0.96}
              >
                <Ionicons name="add-circle-outline" size={20} color="#EA580C" />
                <Text style={styles.stageNextBtnText}>
                  {isArabic ? 'إضافة الهدف ومتابعة هدف آخر' : 'Add Goal & Create Another'}
                </Text>
              </LivePress>

              {/* Button 2: Save All to Plan */}
              <LivePress
                style={[styles.saveAllPlanBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveAllToGoals}
                pressScale={0.96}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-circle" size={22} color={colors.primaryText} />
                    <Text style={[styles.saveAllPlanBtnText, { color: colors.primaryText }]}>
                      {isArabic
                        ? `حفظ في الخطة (${stagedGoals.length + 1} ${stagedGoals.length > 0 ? 'أهداف' : 'هدف'})`
                        : `Save to Plan (${stagedGoals.length + 1} Goal${stagedGoals.length > 0 ? 's' : ''})`}
                    </Text>
                  </>
                )}
              </LivePress>
            </View>
          </ScrollView>
        )}

        {/* ─── Voice Recording Modal ────────────────────────────────────────── */}
        <VoiceRecordModal
          visible={voiceModalVisible}
          onClose={() => setVoiceModalVisible(false)}
          onFinishRecording={handleFinishVoiceRecording}
          isArabic={isArabic}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  modalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  stagedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stagedBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },

  // Hero Guidance Banner
  heroBanner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroSparkleCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EA580C18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroDesc: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Staged Session Mini Card
  sessionStagedCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  stagedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  stagedHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  stagedMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  stagedMiniPillText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 160,
  },

  // Main Chat & Voice Input Card
  chatInputCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chatTextInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  inputActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#88888825',
  },
  voiceMicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  voiceMicText: {
    fontSize: 13,
    fontWeight: '600',
  },
  architectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  architectBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Inspiration Row
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  inspirationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inspirationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  inspirationChipText: {
    fontSize: 12,
    fontWeight: '500',
  },

  saveBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBatchBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Generating Screen
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  generatingIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EA580C15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  generatingTitle: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  generatingSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  // Review Screen: AI Explanation
  aiExplanationCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  aiExplanationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiExplanationText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    fontWeight: '500',
  },

  // Edit Goal Card
  editGoalCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  goalTitleInput: {
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#88888812',
  },
  goalDescInput: {
    fontSize: 13,
    lineHeight: 18,
    minHeight: 44,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#88888812',
  },

  // Config Block
  configBlock: {
    marginBottom: 18,
  },
  configBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  configBlockTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  configBlockSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },

  // Header Options Pills
  headerOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerOptionPillText: {
    fontSize: 12,
  },
  headerOptionBadgeText: {
    fontSize: 10,
  },
  customCategoryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  customCatInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#88888814',
    paddingHorizontal: 12,
    fontSize: 13,
  },
  customCatApplyBtn: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customCatApplyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Templates Carousel
  templatesScrollRow: {
    gap: 10,
    paddingVertical: 4,
  },
  templateSelectCard: {
    width: 170,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  templateSelectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  templateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateSelectName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  templateSelectDesc: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Live Preview Section
  previewSection: {
    marginBottom: 20,
  },
  previewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  previewSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  previewDescText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  noMilestonesPreviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#88888812',
    marginTop: 6,
  },
  noMilestonesPreviewText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // 1. Roadmap Preview Styles
  previewCardRoadmap: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  roadmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  roadmapIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roadmapCategoryTag: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  roadmapGoalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  roadmapTrackContainer: {
    marginTop: 8,
  },
  roadmapStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  roadmapNodeCol: {
    alignItems: 'center',
    width: 24,
  },
  roadmapNodeDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 2,
  },
  roadmapNodeNumber: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  roadmapConnectingLine: {
    width: 2,
    height: 28,
    marginTop: -2,
    marginBottom: -2,
  },
  roadmapStepContent: {
    flex: 1,
    paddingVertical: 2,
  },
  roadmapStepText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  // 2. Checklist Preview Styles
  previewCardChecklist: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  checkCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  checkCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checklistStatsPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checklistStatsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkItemRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkItemFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkItemText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // 3. Metric Preview Styles
  previewCardMetric: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricCategory: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  metricGaugeCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricGaugePercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  metricGaugeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#D97706',
  },
  metricProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#88888820',
    overflow: 'hidden',
    marginTop: 4,
  },
  metricProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricMilestonesList: {
    gap: 6,
  },
  metricMilestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricNumberBox: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metricNumberText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  metricMilestoneText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // 4. Sprint Preview Styles
  previewCardSprint: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  sprintTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sprintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sprintBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sprintCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sprintTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  sprintMilestonesContainer: {
    gap: 6,
    marginTop: 8,
  },
  sprintItemCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF444410',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sprintItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  sprintItemText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // 5. Pillar Preview Styles
  previewCardPillar: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderLeftWidth: 5,
  },
  pillarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pillarTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillarTagText: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '800',
  },
  pillarCategory: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillarTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  pillarQuoteBox: {
    backgroundColor: '#8B5CF612',
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  pillarQuoteText: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  pillarStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  pillarStepText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // Sub-Goals Opt-In Card (No generic sub-goals by default)
  subGoalsOptInCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  subGoalsOptInRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  subGoalsSparkleCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EA580C15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subGoalsOptInTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subGoalsOptInDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  subGoalsActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  breakDownWithAiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  breakDownWithAiBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addManualSubGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  addManualSubGoalText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Sub-Goals AI Discussion Box
  subGoalAiBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  subGoalAiBoxPromptLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  subGoalAiInput: {
    fontSize: 13,
    lineHeight: 18,
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    textAlignVertical: 'top',
  },
  subGoalAiActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  subGoalMicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  subGoalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  subGoalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Milestones Editor
  milestonesEditorCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  milestoneEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#88888820',
  },
  msCheckboxTouch: {
    padding: 2,
  },
  milestoneEditTextInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  msDeleteBtn: {
    padding: 4,
  },
  addMilestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 4,
  },
  addMilestoneInput: {
    flex: 1,
    fontSize: 13,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#88888812',
  },
  addMilestoneBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Conversational Refine Chat
  refineChatCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  refineChatInput: {
    fontSize: 13,
    lineHeight: 18,
    minHeight: 40,
  },
  refineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#88888820',
  },
  refineMicBtn: {
    padding: 8,
    borderRadius: 10,
  },
  refineSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  refineSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Bottom Action Buttons
  bottomActionsBlock: {
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  stageNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  stageNextBtnText: {
    color: '#EA580C',
    fontSize: 14,
    fontWeight: '700',
  },
  saveAllPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveAllPlanBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
