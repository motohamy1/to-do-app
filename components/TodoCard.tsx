import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, LayoutAnimation, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '@/hooks/useTheme';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import CircularProgress from './CircularProgress';
import { scheduleTimerNotification, cancelNotification } from '@/utils/notifications';
import { useAuth } from '@/hooks/useAuth';

interface TodoCardProps {
  todo: {
    _id: Id<"todos">;
    text: string;
    status: string;
    timerDuration?: number;
    timerStartTime?: number;
    timeLeftAtPause?: number;
    dueDate?: number;
    projectId?: string;
    date?: number;
    parentId?: Id<"todos">;
    userId?: Id<"users">;
  };
  onSetTimer: (id: Id<"todos">) => void;
  onLongPress: (id: Id<"todos">) => void;
  onLinkProject: (id: Id<"todos">) => void;
  homeStyles: any;
  depth?: number;
}

// ─── Inline Timer Picker ─────────────────────────────────────────────────────
const InlineTimerPicker = ({
  initialMs,
  onSave,
  onCancel,
  maxMs,
  colors,
}: {
  initialMs?: number;
  onSave: (ms: number) => void;
  onCancel: () => void;
  maxMs?: number;
  colors: any;
}) => {
  const init = initialMs || 0;
  const [hours, setHours] = useState(String(Math.floor(init / 3600000)));
  const [minutes, setMinutes] = useState(String(Math.floor((init % 3600000) / 60000)));

  const handleSave = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const ms = (h * 3600 + m * 60) * 1000;
    if (maxMs && ms > maxMs) {
      Alert.alert('Timer Too Long', `Timer cannot exceed ${Math.floor(maxMs / 60000)} minutes (parent task limit).`);
      return;
    }
    onSave(ms);
  };

  return (
    <View style={{ marginTop: 4, padding: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '30', gap: 12 }}>
      {/* Duration row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {/* Hours */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.primary + '60', borderRadius: 10, width: 64, height: 52, justifyContent: 'center', alignItems: 'center' }}>
            <TextInput
              style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', width: '100%', padding: 0 }}
              keyboardType="numeric"
              value={hours}
              onChangeText={setHours}
              maxLength={2}
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              underlineColorAndroid="transparent"
            />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>HOURS</Text>
        </View>

        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 24, marginBottom: 18 }}>:</Text>

        {/* Minutes */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.primary + '60', borderRadius: 10, width: 64, height: 52, justifyContent: 'center', alignItems: 'center' }}>
            <TextInput
              style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', width: '100%', padding: 0 }}
              keyboardType="numeric"
              value={minutes}
              onChangeText={setMinutes}
              maxLength={2}
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              underlineColorAndroid="transparent"
            />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>MINUTES</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={handleSave}
          style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ Set Timer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
        >
          <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Card ────────────────────────────────────────────────────────────────
const TodoCard: React.FC<TodoCardProps> = ({ todo, onSetTimer, onLongPress, onLinkProject, homeStyles, depth = 0 }) => {
  const { colors, isDarkMode } = useTheme();
  const { userId } = useAuth();
  const updateStatus = useMutation(api.todos.updateStatus);
  const startTimer = useMutation(api.todos.startTimer);
  const pauseTimer = useMutation(api.todos.pauseTimer);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const setTimer = useMutation(api.todos.setTimer);
  const addTodo = useMutation(api.todos.addTodo);

  // Main task edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [showTimerPicker, setShowTimerPicker] = useState(false);

  // Subtask state
  const project = useQuery(api.projects.getProjectMetadata, todo.projectId ? { id: todo.projectId } : "skip");
  const subtasks = useQuery(api.todos.getSubtasks, { parentId: todo._id });

  const [timeLeft, setTimeLeft] = useState(todo.timerDuration || 0);
  const [progress, setProgress] = useState(0);

  const [showSubtasks, setShowSubtasks] = useState(false);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubText, setNewSubText] = useState("");

  // Subtask editing state
  const [editingSubId, setEditingSubId] = useState<Id<"todos"> | null>(null);
  const [editingSubText, setEditingSubText] = useState("");
  const [editingSubTimerOpen, setEditingSubTimerOpen] = useState<Id<"todos"> | null>(null);

  const [lastNotifId, setLastNotifId] = useState<string | null>(null);

  const hasSubtasks = subtasks && subtasks.length > 0;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const completedSubtasks = hasSubtasks ? subtasks.filter((s: any) => s.status === 'done').length : 0;
    const totalSubtasks = hasSubtasks ? subtasks.length : 0;

    if (hasSubtasks) {
      setProgress((completedSubtasks / totalSubtasks) * 100);
      if (totalSubtasks > 0 && completedSubtasks === totalSubtasks && todo.status !== 'done') {
        updateStatus({ id: todo._id, status: 'done' });
      } else if (completedSubtasks < totalSubtasks && todo.status === 'done') {
        updateStatus({ id: todo._id, status: 'in_progress' });
      }
    }

    if (todo.status === 'in_progress' && todo.timerDuration && todo.timerStartTime) {
      const calculateTimeInfo = () => {
        const elapsed = Date.now() - todo.timerStartTime!;
        const remaining = Math.max(0, todo.timerDuration! - elapsed);
        setTimeLeft(remaining);
        if (!hasSubtasks) {
          const prog = Math.min(100, (elapsed / todo.timerDuration!) * 100);
          setProgress(prog);
        }
        if (remaining === 0 && todo.status === 'in_progress') {
          updateStatus({ id: todo._id, status: 'done' });
        }
      };
      calculateTimeInfo();
      interval = setInterval(calculateTimeInfo, 1000);
    } else if (todo.status === 'paused') {
      const remaining = todo.timeLeftAtPause || 0;
      setTimeLeft(remaining);
      if (!hasSubtasks) {
        const prog = todo.timerDuration ? Math.min(100, ((todo.timerDuration - remaining) / todo.timerDuration) * 100) : 0;
        setProgress(prog);
      }
    } else if (todo.status === 'done' || todo.status === 'not_done') {
      if (!hasSubtasks) setProgress(todo.status === 'done' ? 100 : 0);
      setTimeLeft(0);
    } else {
      if (!hasSubtasks) setProgress(0);
      setTimeLeft(todo.timerDuration || 0);
    }

    return () => { if (interval) clearInterval(interval); };
  }, [todo.status, todo.timerDuration, todo.timerStartTime, todo.timeLeftAtPause, subtasks]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const stats = {
    done: subtasks?.filter((s: any) => s.status === 'done').length || 0,
    total: subtasks?.length || 0,
  };

  const handleStartTimer = async () => {
    startTimer({ id: todo._id });
    const id = await scheduleTimerNotification(todo.text, timeLeft);
    setLastNotifId(id);
  };

  const handlePauseTimer = async () => {
    pauseTimer({ id: todo._id });
    if (lastNotifId) { await cancelNotification(lastNotifId); setLastNotifId(null); }
  };

  const moveToStatus = (status: string) => updateStatus({ id: todo._id, status });

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== todo.text) updateTodo({ id: todo._id, text: editText.trim() });
    setIsEditing(false);
    setShowTimerPicker(false);
  };

  const handleAddSubtask = () => {
    if (newSubText.trim() && userId) {
      addTodo({ userId, text: newSubText.trim(), parentId: todo._id, projectId: todo.projectId });
      setNewSubText('');
      setIsAddingSub(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowSubtasks(true);
    }
  };

  const toggleSubtasks = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSubtasks(!showSubtasks);
  };

  const handleSaveSubEdit = (sub: any) => {
    if (editingSubText.trim() && editingSubText !== sub.text) updateTodo({ id: sub._id, text: editingSubText.trim() });
    setEditingSubId(null);
    setEditingSubTimerOpen(null);
  };

  // ─── Status colors ──────────────────────────────────────────────────────────
  let badgeText = "Not Started";
  let badgeBg = colors.border;
  let badgeColor = colors.text;
  let timerIconColor = colors.primary;
  let timerText = formatTime(timeLeft);
  let cardBg = colors.surface;

  if (todo.status === "in_progress") { badgeText = "In Progress"; badgeBg = colors.warning + '20'; badgeColor = colors.warning; cardBg = colors.taskInProgressBg; }
  else if (todo.status === "paused") { badgeText = "Paused"; badgeBg = colors.border; badgeColor = colors.text; timerIconColor = colors.textMuted; cardBg = colors.taskPausedBg; }
  else if (todo.status === "done") { badgeText = "Done"; badgeBg = colors.success + '20'; badgeColor = colors.success; timerText = "Done"; timerIconColor = colors.textMuted; cardBg = colors.taskDoneBg; }
  else if (todo.status === "not_done") { badgeText = "Not Done"; badgeBg = colors.danger + '20'; badgeColor = colors.danger; timerText = "—"; timerIconColor = colors.danger; cardBg = colors.taskNotDoneBg; }
  else if (todo.status === "not_started") { cardBg = colors.taskNotStartedBg; badgeBg = colors.textMuted + '20'; badgeColor = colors.textMuted; }

  const isTimerSet = !!todo.timerDuration;
  const isDueSoon = todo.dueDate && todo.dueDate < Date.now() + 86400000;
  if (!isTimerSet && hasSubtasks) timerText = `${stats.done}/${stats.total}`;

  return (
    <View style={{ marginLeft: depth * 16 }}>
      <View style={[homeStyles.card, { overflow: 'hidden', position: 'relative', backgroundColor: cardBg }]}>
        <View style={{ zIndex: 1 }}>

          {/* ─── Header Row: Title + Badge + Circle ─── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              {isEditing ? (
                /* ─── FULL EDIT PANEL ─── */
                <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.primary + '40', marginBottom: 8, gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.5, marginBottom: 4 }}>EDITING TASK</Text>

                  {/* Text edit */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: '600', backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border }}
                      value={editText}
                      onChangeText={setEditText}
                      autoFocus
                      onSubmitEditing={handleSaveEdit}
                    />
                    <TouchableOpacity onPress={handleSaveEdit}>
                      <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                    </TouchableOpacity>
                  </View>

                  {/* Timer section */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isTimerSet ? colors.primary + '20' : colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: isTimerSet ? colors.primary + '40' : colors.border, alignSelf: 'flex-start' }}
                    onPress={() => setShowTimerPicker(!showTimerPicker)}
                  >
                    <Ionicons name="timer-outline" size={16} color={isTimerSet ? colors.primary : colors.textMuted} />
                    <Text style={{ color: isTimerSet ? colors.primary : colors.textMuted, fontWeight: '600', fontSize: 13 }}>
                      {isTimerSet ? `Timer: ${Math.floor(todo.timerDuration! / 3600000)}h ${Math.floor((todo.timerDuration! % 3600000) / 60000)}m` : 'Set Timer'}
                    </Text>
                    <Ionicons name={showTimerPicker ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
                  </TouchableOpacity>

                  {showTimerPicker && (
                    <InlineTimerPicker
                      initialMs={todo.timerDuration}
                      colors={colors}
                      onSave={(ms) => {
                        setTimer({ id: todo._id, duration: ms });
                        setShowTimerPicker(false);
                      }}
                      onCancel={() => setShowTimerPicker(false)}
                    />
                  )}

                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    style={{ backgroundColor: colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: 4 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Done Editing</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setIsEditing(true)} onLongPress={() => onLongPress(todo._id)}>
                  <Text style={[homeStyles.cardTitle, { marginBottom: 4 }]} numberOfLines={2}>{todo.text}</Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[homeStyles.badge, { backgroundColor: badgeBg === colors.border ? colors.surface + '80' : badgeBg, alignSelf: 'flex-start' }]}>
                  <Text style={[homeStyles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
                </View>
              </View>
            </View>

            <View style={{ justifyContent: 'center', alignItems: 'center', width: 56 }}>
              <CircularProgress
                size={56} strokeWidth={4} progress={progress}
                color={todo.status === 'paused' ? colors.textMuted : timerIconColor}
                unfilledColor={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: todo.status === 'paused' ? colors.textMuted : timerIconColor, textAlign: 'center' }}>
                  {timerText}
                </Text>
              </CircularProgress>
            </View>
          </View>

          {/* ─── Action Row ─── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            {todo.status === 'not_started' && (
              <View style={homeStyles.actionButtons}>
                {!isTimerSet ? (
                  <TouchableOpacity style={[homeStyles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]} onPress={() => onSetTimer(todo._id)}>
                    <Ionicons name="timer-outline" size={16} color={colors.primary} />
                    <Text style={[homeStyles.actionBtnText, { color: colors.primary }]}>Set Timer</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[homeStyles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleStartTimer}>
                    <Ionicons name="play" size={16} color="#fff" />
                    <Text style={[homeStyles.actionBtnText, { color: '#fff' }]}>Start Task</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {todo.status === 'in_progress' && (
              <View style={homeStyles.actionButtons}>
                <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={handlePauseTimer}>
                  <Ionicons name="pause" size={16} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.successBg }]} onPress={() => moveToStatus('done')}>
                  <Ionicons name="checkmark" size={18} color={colors.success} />
                </TouchableOpacity>
                <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.danger + '20' }]} onPress={() => moveToStatus('not_done')}>
                  <Ionicons name="close" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}

            {todo.status === 'paused' && (
              <View style={homeStyles.actionButtons}>
                <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.primary }]} onPress={handleStartTimer}>
                  <Ionicons name="play" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {(todo.status === 'done' || todo.status === 'not_done') && (
              <View style={homeStyles.actionButtons}>
                <TouchableOpacity style={[homeStyles.iconBtn, { backgroundColor: colors.infoBg }]} onPress={() => moveToStatus('not_started')}>
                  <Ionicons name="refresh" size={18} color={colors.info} />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 12 }}>
              {hasSubtasks && (
                <TouchableOpacity
                  onPress={toggleSubtasks}
                  style={[homeStyles.actionBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', borderWidth: 1 }]}
                >
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                    {subtasks.length} Subtask{subtasks.length > 1 ? 's' : ''} {showSubtasks ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[homeStyles.actionBtn, {
                  paddingHorizontal: hasSubtasks ? 10 : 14,
                  backgroundColor: hasSubtasks ? 'transparent' : colors.primary + '12',
                  borderWidth: hasSubtasks ? 0 : 1,
                  borderColor: colors.primary + '40',
                  borderStyle: 'dashed',
                }]}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsAddingSub(true); }}
              >
                <Ionicons name="add-circle-outline" size={16} color={hasSubtasks ? colors.textMuted : colors.primary} />
                {!hasSubtasks && (
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Add Subtask</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={[homeStyles.dividerDashed, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />

          {/* ─── Project + Date Row ─── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <TouchableOpacity style={homeStyles.projectRow} onPress={() => onLinkProject(todo._id)}>
              <Ionicons name="link-outline" size={16} color={todo.projectId ? colors.primary : colors.textMuted} />
              <Text style={[homeStyles.projectText, todo.projectId && { color: colors.primary, fontStyle: 'normal', fontWeight: '600' }]}>
                {project?.name || todo.projectId || 'No project'}
              </Text>
            </TouchableOpacity>

            {todo.dueDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="calendar-outline" size={14} color={isDueSoon ? colors.danger : colors.textMuted} />
                <Text style={{ fontSize: 12, color: isDueSoon ? colors.danger : colors.textMuted, fontWeight: '500' }}>
                  {new Date(todo.dueDate).toLocaleDateString()}
                </Text>
              </View>
            )}

            {todo.date && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                <Ionicons name="calendar-clear-outline" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '500' }}>
                  {new Date(todo.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
          </View>

          {/* ─── Footer ─── */}
          <View style={homeStyles.footerRow}>
            <View style={homeStyles.footerStats}>
              {hasSubtasks && (
                <View style={homeStyles.statItem}>
                  <Ionicons name="list-outline" size={15} color={colors.textMuted} />
                  <Text style={homeStyles.statText}>{stats.done}/{stats.total} Subtasks</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => { setIsEditing(true); setEditText(todo.text); }}>
                <Ionicons name="create-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteTodo({ id: todo._id })}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </View>

      {/* ─── Add Subtask Input ─── */}
      {isAddingSub && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '30' }}>
          <Ionicons name="return-down-forward" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, color: colors.text, fontSize: 14 }}
            placeholder="What's a sub-step to complete this?"
            placeholderTextColor={colors.textMuted}
            value={newSubText}
            onChangeText={setNewSubText}
            autoFocus
            onSubmitEditing={handleAddSubtask}
            onBlur={() => { if (!newSubText.trim()) { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsAddingSub(false); } }}
          />
          <TouchableOpacity onPress={handleAddSubtask}>
            <Ionicons name="arrow-up-circle" size={28} color={newSubText.trim() ? colors.primary : colors.border} />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Subtask List ─── */}
      {showSubtasks && hasSubtasks && (
        <View style={{ marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.primary + '40', gap: 8 }}>
          {subtasks.map((sub: any) => {
            const isEditingThis = editingSubId === sub._id;
            const isTimerOpenForThis = editingSubTimerOpen === sub._id;
            return (
              <View key={sub._id} style={{ backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden' }}>
                {isEditingThis ? (
                  /* ── FULL EDIT PANEL (expanded) ── */
                  <View style={{ padding: 10, gap: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 }}>EDITING SUBTASK</Text>

                    {/* Top row: check + text input */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity onPress={() => updateStatus({ id: sub._id, status: sub.status === 'done' ? 'not_started' : 'done' })}>
                        <Ionicons
                          name={sub.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={sub.status === 'done' ? colors.success : colors.textMuted}
                        />
                      </TouchableOpacity>
                      <TextInput
                        style={{ flex: 1, color: colors.text, fontSize: 14, backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary, fontWeight: '500' }}
                        value={editingSubText}
                        onChangeText={setEditingSubText}
                        autoFocus
                        onSubmitEditing={() => handleSaveSubEdit(sub)}
                      />
                    </View>

                    {/* Timer toggle — styled like main task Set Timer button */}
                    <TouchableOpacity
                      style={[homeStyles.actionBtn, {
                        backgroundColor: sub.timerDuration ? colors.primary + '15' : colors.surface,
                        borderColor: colors.primary,
                        borderWidth: 1,
                        alignSelf: 'flex-start',
                      }]}
                      onPress={() => setEditingSubTimerOpen(isTimerOpenForThis ? null : sub._id)}
                    >
                      <Ionicons name="timer-outline" size={16} color={colors.primary} />
                      <Text style={[homeStyles.actionBtnText, { color: colors.primary }]}>
                        {sub.timerDuration
                          ? `${Math.floor(sub.timerDuration / 3600000) > 0 ? Math.floor(sub.timerDuration / 3600000) + 'h ' : ''}${Math.floor((sub.timerDuration % 3600000) / 60000)}m`
                          : 'Set Timer'}
                      </Text>
                      <Ionicons name={isTimerOpenForThis ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} />
                    </TouchableOpacity>

                    {isTimerOpenForThis && (
                      <InlineTimerPicker
                        initialMs={sub.timerDuration}
                        maxMs={todo.timerDuration}
                        colors={colors}
                        onSave={(ms) => {
                          setTimer({ id: sub._id, duration: ms });
                          setEditingSubTimerOpen(null);
                        }}
                        onCancel={() => setEditingSubTimerOpen(null)}
                      />
                    )}

                    {/* Save / Cancel buttons */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => handleSaveSubEdit(sub)}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: colors.border, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => { setEditingSubId(null); setEditingSubTimerOpen(null); }}
                      >
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* ── NORMAL ROW (collapsed) ── */
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
                    <TouchableOpacity onPress={() => updateStatus({ id: sub._id, status: sub.status === 'done' ? 'not_started' : 'done' })}>
                      <Ionicons
                        name={sub.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={sub.status === 'done' ? colors.success : colors.textMuted}
                        style={{ marginRight: 10 }}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => { setEditingSubId(sub._id); setEditingSubText(sub.text); }}
                    >
                      <Text style={{ flex: 1, color: sub.status === 'done' ? colors.textMuted : colors.text, textDecorationLine: sub.status === 'done' ? 'line-through' : 'none', fontSize: 14, fontWeight: '500' }}>
                        {sub.text}
                      </Text>
                      <Ionicons name="pencil" size={12} color={colors.textMuted} style={{ marginLeft: 4, opacity: 0.5 }} />
                    </TouchableOpacity>

                    {/* Timer badge */}
                    {!!sub.timerDuration && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 }}>
                        <Ionicons name="timer-outline" size={14} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>
                          {sub.timerDuration >= 3600000
                            ? `${Math.floor(sub.timerDuration / 3600000)}h ${Math.floor((sub.timerDuration % 3600000) / 60000)}m`
                            : `${Math.floor(sub.timerDuration / 60000)}m`}
                        </Text>
                      </View>
                    )}

                    {/* Delete */}
                    <TouchableOpacity style={{ paddingLeft: 12 }} onPress={() => deleteTodo({ id: sub._id })}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default TodoCard;
