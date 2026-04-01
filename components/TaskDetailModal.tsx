import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Platform, LayoutAnimation, ActivityIndicator } from 'react-native';
import useTheme from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Circle, Path, G, Text as SvgText } from 'react-native-svg';


interface TaskDetailModalProps {
  visible: boolean;
  onClose: () => void;
  todoId: Id<"todos"> | null;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ visible, onClose, todoId }) => {
  const { colors, isDarkMode } = useTheme();
  const { userId, language } = useAuth();
  const { t, isArabic } = useTranslation(language);

  // Stack navigation for subtasks
  const [todoStack, setTodoStack] = useState<Id<"todos">[]>([]);
  const currentTodoId = todoStack.length > 0 ? todoStack[todoStack.length - 1] : todoId;

  const todo = useQuery(api.todos.getById, currentTodoId ? { id: currentTodoId } : "skip");
  const subtasks = useQuery(api.todos.getSubtasks, currentTodoId ? { parentId: currentTodoId } : "skip");
  const project = useQuery(api.projects.getProjectMetadata, todo?.projectId ? { id: todo.projectId } : "skip");

  const updateTodo = useMutation(api.todos.updateTodo);
  const updateStatus = useMutation(api.todos.updateStatus);
  const setTimer = useMutation(api.todos.setTimer);
  const startTimer = useMutation(api.todos.startTimer);
  const pauseTimer = useMutation(api.todos.pauseTimer);
  const addTodo = useMutation(api.todos.addTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  const [editText, setEditText] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isEditingTimer, setIsEditingTimer] = useState(false);

  useEffect(() => {

    let interval: NodeJS.Timeout;
    if (todo?.status === 'in_progress' && todo?.timerStartTime && todo?.timerDuration) {
      const tick = () => {
        const elapsed = Date.now() - todo.timerStartTime!;
        const remaining = Math.max(0, todo.timerDuration! - elapsed);
        setTimeLeft(remaining);
      };
      tick();
      interval = setInterval(tick, 1000);
    } else if (todo?.status === 'paused' && todo?.timeLeftAtPause !== undefined) {
      setTimeLeft(todo.timeLeftAtPause);
    } else {
      setTimeLeft(todo?.timerDuration || 0);
    }
    return () => clearInterval(interval);
  }, [todo?.status, todo?.timerStartTime, todo?.timerDuration, todo?.timeLeftAtPause]);


  useEffect(() => {
    if (todo) {
      setEditText(todo.text);
      setDescription(todo.description || "");
      setPriority(todo.priority || "Medium");
    }
  }, [todo]);

  useEffect(() => {
    if (visible && todoId && todoStack.length === 0) {
      setTodoStack([todoId]);
    }
  }, [visible, todoId]);

  const handleClose = () => {
    setTodoStack([]);
    onClose();
  };

  const handleBack = () => {
    if (todoStack.length > 1) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTodoStack(prev => prev.slice(0, -1));
    } else {
      handleClose();
    }
  };

  const navigateToSubtask = (id: Id<"todos">) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTodoStack(prev => [...prev, id]);
  };

  const saveText = () => {
    if (currentTodoId && editText.trim() && editText !== todo?.text) {
      updateTodo({ id: currentTodoId, text: editText.trim() });
    }
  };

  const saveDescription = () => {
    if (currentTodoId && description !== todo?.description) {
      updateTodo({ id: currentTodoId, description: description.trim() });
    }
  };

  const handleUpdatePriority = (p: string) => {
    if (currentTodoId) {
      setPriority(p);
      updateTodo({ id: currentTodoId, priority: p });
    }
  };

  const handleAddSubtask = () => {
    if (newSubtaskText.trim() && userId && currentTodoId) {
      addTodo({
        userId,
        text: newSubtaskText.trim(),
        parentId: currentTodoId,
        projectId: todo?.projectId,
      });
      setNewSubtaskText("");
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const projectColor = project?.color || colors.primary;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleBack}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border + '40' }, isArabic && { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity onPress={handleBack} style={styles.headerIcon}>
              <Ionicons name={todoStack.length > 1 ? (isArabic ? "chevron-forward" : "chevron-back") : "close"} size={26} color={colors.text} />
            </TouchableOpacity>
            
            <View style={{ flex: 1, alignItems: 'center' }}>
               <View style={[styles.breadcrumb, isArabic && { flexDirection: 'row-reverse' }]}>
                 {todoStack.length > 1 && (
                   <>
                     <Text style={[styles.breadcrumbText, { color: colors.textMuted }]} numberOfLines={1}>
                       {isArabic ? "المهمة الأساسية" : "Parent"}
                     </Text>
                     <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={12} color={colors.textMuted} />
                   </>
                 )}
                 <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                   {todoStack.length > 1 ? (isArabic ? "تفاصيل فرعية" : "Subtask") : (isArabic ? "تفاصيل المهمة" : "Task Details")}
                 </Text>
               </View>
            </View>

            <TouchableOpacity onPress={() => {
              if (currentTodoId) {
                const confirmDelete = () => deleteTodo({ id: currentTodoId }).then(handleBack);
                if (Platform.OS === 'web') confirmDelete();
                else {
                  // In a real mobile app we'd use Alert.alert here, but for now we'll just delete
                  confirmDelete();
                }
              }
            }} style={styles.headerIcon}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>

          </View>

          {!todo ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={projectColor} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* Project Badge */}
              {project && (
                <View style={[styles.projectBadge, { backgroundColor: projectColor + '15', borderColor: projectColor + '30' }, isArabic && { alignSelf: 'flex-end' }]}>
                  <Ionicons name="folder-open-outline" size={14} color={projectColor} />
                  <Text style={[styles.projectBadgeText, { color: projectColor }]}>{project.name}</Text>
                </View>
              )}

              {/* Task Title Input */}
              <View style={[styles.section, isArabic && { alignItems: 'flex-end' }]}>
                <TextInput
                  style={[styles.titleInput, { color: colors.text }, isArabic && { textAlign: 'right' }]}
                  value={editText}
                  onChangeText={setEditText}
                  onBlur={saveText}
                  multiline
                  placeholder={isArabic ? "عنوان المهمة..." : "Task Title..."}
                  placeholderTextColor={isDarkMode ? "#FFFFFF40" : "#00000040"}

                />
              </View>

              {/* Timer Section Selection */}
              {(!todo.timerDuration || isEditingTimer) && (
                <View style={[styles.section, isArabic && { alignItems: 'flex-end' }]}>
                  <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                    <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{t.timer}</Text>

                    {isEditingTimer && (todo?.timerDuration ?? 0) > 0 && (
                      <TouchableOpacity onPress={() => {


                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsEditingTimer(false);
                      }}>
                        <Text style={{ fontSize: 13, color: colors.danger, fontWeight: '700' }}>{t.cancel}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={[styles.timerPresets, isArabic && { flexDirection: 'row-reverse' }]}>
                    {[5, 10, 30, 45, 60].map(mins => (
                      <TouchableOpacity 
                        key={mins}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          currentTodoId && setTimer({ id: currentTodoId, duration: mins * 60000 });
                          setIsEditingTimer(false);
                        }}
                        style={[
                          styles.timerPreset, 
                          { 
                            backgroundColor: todo?.timerDuration === mins * 60000 ? projectColor : colors.surface, 
                            borderColor: todo?.timerDuration === mins * 60000 ? projectColor : colors.border,
                            borderWidth: 1.5
                          }
                        ]}
                      >
                        <Text style={[styles.timerPresetText, { color: todo?.timerDuration === mins * 60000 ? '#000' : colors.text }]}>
                          {mins}{isArabic ? ' د' : 'm'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    
                    <TouchableOpacity 
                      style={[styles.timerPreset, { borderColor: projectColor, borderStyle: 'dashed', borderWidth: 1.5 }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="time-outline" size={16} color={projectColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Circular Timer Visualization */}
              {!!todo.timerDuration && !isEditingTimer && (
                <View style={styles.timerContainer}>
                  <Svg width="200" height="200" viewBox="0 0 220 220">
                    <G rotation="-90" origin="110, 110">
                      {/* Background Circle */}
                      <Circle
                        cx="110"
                        cy="110"
                        r="90"
                        stroke={isDarkMode ? colors.border : "#E2E8F0"}
                        strokeWidth="12"
                        fill="none"
                        opacity={isDarkMode ? 0.2 : 0.5}
                      />
                      {/* Progress Arc */}
                      <Circle
                        cx="110"
                        cy="110"
                        r="90"
                        stroke={projectColor}
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(timeLeft / (todo?.timerDuration || 1)) * 565}, 565`}
                        strokeLinecap="round"
                      />
                    </G>
                    {/* Time Text */}
                    <SvgText
                      x="110"
                      y="105"
                      fontSize="48"
                      fontWeight="900"
                      fill={colors.text}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {`${Math.floor(timeLeft / 60000)}:${String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}`}
                    </SvgText>
                    {/* Status Text Under Time */}
                    <SvgText
                      x="110"
                      y="145"
                      fontSize="12"
                      fontWeight="700"
                      fill={colors.textMuted}
                      textAnchor="middle"
                      opacity={0.8}
                    >
                      {todo.status === 'in_progress' ? (isArabic ? 'جاهز؟ ركز!' : 'Stay Focused') : (isArabic ? 'جاهز للبدء؟' : 'Ready to start?')}
                    </SvgText>
                  </Svg>

                  <View style={[styles.timerControls, isArabic && { flexDirection: 'row-reverse' }]}>
                    <TouchableOpacity 
                      style={[styles.mainControlButton, { backgroundColor: projectColor }]}
                      onPress={() => {
                        if (todo.status === 'in_progress') pauseTimer({ id: currentTodoId! });
                        else startTimer({ id: currentTodoId! });
                      }}
                    >
                      <Ionicons name={todo.status === 'in_progress' ? "pause" : "play"} size={22} color={isDarkMode ? "#000" : "#FFF"} />
                      <Text style={[styles.mainControlButtonText, { color: isDarkMode ? "#000" : "#FFF" }]}>
                        {todo.status === 'in_progress' ? (isArabic ? 'إيقاف' : 'Pause Task') : (isArabic ? 'ابدأ المهمة' : 'Start Task')}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.secondaryButton, { borderColor: projectColor + '40', backgroundColor: colors.surface }]}
                      onPress={() => setTimer({ id: currentTodoId!, duration: todo.timerDuration })}
                    >
                      <Ionicons name="refresh" size={20} color={projectColor} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.secondaryActionsRow}>
                    <TouchableOpacity 
                      style={[styles.tertiaryButton, { borderColor: colors.border }]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsEditingTimer(true);
                      }}
                    >
                      <Ionicons name="timer-outline" size={16} color={colors.text} />
                      <Text style={[styles.tertiaryButtonText, { color: colors.text }]}>
                        {isArabic ? "تغيير الوقت" : "Change Timer"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.tertiaryButton, { borderColor: colors.danger + '40' }]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        currentTodoId && setTimer({ id: currentTodoId, duration: 0 });
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      <Text style={[styles.tertiaryButtonText, { color: colors.danger }]}>
                        {isArabic ? "إزالة" : "Remove"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}



              {/* Status & Priority Selection */}

              <View style={[styles.rowSection, isArabic && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.halfSection, isArabic && { alignItems: 'flex-end' }]}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{isArabic ? "الحالة" : "Status"}</Text>

                  <TouchableOpacity 
                    style={[styles.statusButton, { backgroundColor: todo.status === 'done' ? colors.success + '20' : colors.surface, borderColor: todo.status === 'done' ? colors.success : colors.border }]}
                    onPress={() => updateStatus({ id: currentTodoId!, status: todo.status === 'done' ? 'not_started' : 'done' })}
                  >

                    <Ionicons name={todo.status === 'done' ? "checkmark-circle" : "ellipse-outline"} size={18} color={todo.status === 'done' ? colors.success : colors.textMuted} />

                    <Text style={[styles.statusText, { color: todo.status === 'done' ? (isDarkMode ? '#FFFFFF' : colors.success) : colors.text }]}>
                      {todo.status === 'done' ? t.done : t.notStarted}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.halfSection, isArabic && { alignItems: 'flex-end' }]}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{isArabic ? "الأولوية" : "Priority"}</Text>

                  <View style={[styles.priorityPills, isArabic && { flexDirection: 'row-reverse' }]}>
                    {['Low', 'Medium', 'High'].map((p) => (
                      <TouchableOpacity 
                        key={p} 
                        style={[
                          styles.priorityPill, 
                          { backgroundColor: priority === p ? (p === 'High' ? colors.danger : p === 'Medium' ? colors.warning : colors.primary) + '20' : colors.surface },
                          priority === p && { borderColor: p === 'High' ? colors.danger : p === 'Medium' ? colors.warning : colors.primary }
                        ]}
                        onPress={() => handleUpdatePriority(p)}
                      >
                        <Text style={[styles.priorityText, { color: priority === p ? (isDarkMode ? '#FFFFFF' : (p === 'High' ? colors.danger : p === 'Medium' ? colors.warning : colors.primary)) : colors.textMuted }]}>

                          {p === 'Low' ? (isArabic ? 'منخفضة' : 'Low') : p === 'Medium' ? (isArabic ? 'متوسطة' : 'Med') : (isArabic ? 'عالية' : 'High')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Description */}
              <View style={[styles.section, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{isArabic ? "الوصف" : "Description"}</Text>

                <TextInput
                  style={[styles.descriptionInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={description}
                  onChangeText={setDescription}
                  onBlur={saveDescription}
                  multiline
                  placeholder={isArabic ? "أضف وصفاً هنا..." : "Add details here..."}
                  placeholderTextColor={isDarkMode ? "#FFFFFF40" : "#00000040"}

                />
              </View>

              {/* Subtasks Section */}
              <View style={[styles.section, { marginTop: 24 }]}>
                <View style={[styles.sectionHeader, isArabic && { flexDirection: 'row-reverse' }]}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText, marginBottom: 0 }]}>{isArabic ? "المهام الفرعية" : "Subtasks"}</Text>

                  <Text style={{ fontSize: 12, fontWeight: '700', color: projectColor }}>
                    {subtasks?.filter(s => s.status === 'done').length || 0}/{subtasks?.length || 0}
                  </Text>
                </View>
                
                <View style={styles.subtaskList}>
                  {subtasks?.map((sub) => (
                    <TouchableOpacity 
                       key={sub._id} 
                       style={[styles.subtaskItem, { backgroundColor: colors.surface, borderColor: colors.border + '40' }, isArabic && { flexDirection: 'row-reverse' }]}
                       onPress={() => navigateToSubtask(sub._id)}
                    >
                      <Ionicons name={sub.status === 'done' ? "checkmark-circle" : "ellipse-outline"} size={20} color={sub.status === 'done' ? colors.success : colors.textMuted} />

                      <Text style={[styles.subtaskText, { color: sub.status === 'done' ? colors.textMuted : colors.text }, isArabic && { textAlign: 'right' }]} numberOfLines={1}>

                        {sub.text}
                      </Text>
                      <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={16} color={colors.textMuted} />

                    </TouchableOpacity>
                  ))}

                  <View style={[styles.addSubtaskContainer, { backgroundColor: colors.surface, borderColor: projectColor + '30' }, isArabic && { flexDirection: 'row-reverse' }]}>
                      <TextInput
                        style={[styles.addSubtaskInput, { color: colors.text }, isArabic && { textAlign: 'right' }]}
                      placeholder={isArabic ? "إضافة مهمة فرعية..." : "Add a subtask..."}
                      placeholderTextColor={isDarkMode ? "#FFFFFF40" : "#00000040"}

                      value={newSubtaskText}
                      onChangeText={setNewSubtaskText}
                      onSubmitEditing={handleAddSubtask}
                    />


                    <TouchableOpacity onPress={handleAddSubtask}>
                      <Ionicons name="add-circle" size={28} color={projectColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

            </ScrollView>
          )}

          {/* Bottom Action */}
          <View style={[styles.footer, { borderTopColor: colors.border + '40' }]}>
            <TouchableOpacity style={[styles.doneButton, { backgroundColor: projectColor }]} onPress={handleClose}>
              <Text style={styles.doneButtonText}>{isArabic ? "تم" : "Done"}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '92%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  timerPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  timerPreset: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerPresetText: {
    fontSize: 13,
    fontWeight: '800',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 16,
  },
  projectBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  titleInput: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    padding: 0,
    minHeight: 40,
  },
  rowSection: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 28,
  },
  halfSection: {
    flex: 1,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 32,
    padding: 24,
    alignSelf: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  mainControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mainControlButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
    justifyContent: 'center',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minWidth: 130,
    justifyContent: 'center',
  },
  tertiaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
  },
  priorityPills: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '800',
  },
  descriptionInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  subtaskList: {
    gap: 10,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  subtaskText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  addSubtaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addSubtaskInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    height: 40,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
  },
  doneButton: {
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
});

export default TaskDetailModal;
