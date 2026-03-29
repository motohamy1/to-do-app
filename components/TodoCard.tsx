import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, LayoutAnimation } from 'react-native';
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

const TodoCard: React.FC<TodoCardProps> = ({ todo, onSetTimer, onLongPress, onLinkProject, homeStyles, depth = 0 }) => {
  const { colors, isDarkMode } = useTheme();
  const { userId } = useAuth();
  const updateStatus = useMutation(api.todos.updateStatus);
  const startTimer = useMutation(api.todos.startTimer);
  const pauseTimer = useMutation(api.todos.pauseTimer);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const addTodo = useMutation(api.todos.addTodo);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  
  const project = useQuery(api.projects.getProjectMetadata, todo.projectId ? { id: todo.projectId } : "skip");
  const subtasks = useQuery(api.todos.getSubtasks, { parentId: todo._id });

  const [timeLeft, setTimeLeft] = useState(todo.timerDuration || 0);
  const [progress, setProgress] = useState(0);

  const [showSubtasks, setShowSubtasks] = useState(false);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubText, setNewSubText] = useState("");

  const [lastNotifId, setLastNotifId] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (todo.status === 'in_progress' && todo.timerDuration && todo.timerStartTime) {
      const calculateTimeInfo = () => {
        const elapsed = Date.now() - todo.timerStartTime!;
        const remaining = Math.max(0, todo.timerDuration! - elapsed);
        
        setTimeLeft(remaining);
        
        const prog = Math.min(100, (elapsed / todo.timerDuration!) * 100);
        setProgress(prog);

        if (remaining === 0 && todo.status === 'in_progress') {
          updateStatus({ id: todo._id, status: 'done' });
        }
      };

      calculateTimeInfo();
      interval = setInterval(calculateTimeInfo, 1000);
    } else if (todo.status === 'paused') {
      const remaining = todo.timeLeftAtPause || 0;
      setTimeLeft(remaining);
      const prog = todo.timerDuration ? Math.min(100, ((todo.timerDuration - remaining) / todo.timerDuration) * 100) : 0;
      setProgress(prog);
    } else if (todo.status === 'done' || todo.status === 'not_done') {
      setProgress(todo.status === 'done' ? 100 : 0);
      setTimeLeft(0);
    } else {
      setProgress(0);
      setTimeLeft(todo.timerDuration || 0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [todo.status, todo.timerDuration, todo.timerStartTime, todo.timeLeftAtPause]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStats = (id: string) => {
    const num = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
    return {
      clip: (num % 5) + 1,
      chat: (num % 8),
      checkDone: num % 4,
      checkTotal: (num % 4) + 2
    };
  };

  const stats = getStats(todo._id || "123");

  const handleStartTimer = async () => {
    startTimer({ id: todo._id });
    const id = await scheduleTimerNotification(todo.text, timeLeft);
    setLastNotifId(id);
  };

  const handlePauseTimer = async () => {
    pauseTimer({ id: todo._id });
    if (lastNotifId) {
      await cancelNotification(lastNotifId);
      setLastNotifId(null);
    }
  };

  const moveToStatus = (status: string) => {
    updateStatus({ id: todo._id, status });
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== todo.text) {
      updateTodo({ id: todo._id, text: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleAddSubtask = () => {
    if (newSubText.trim() && userId) {
      addTodo({
        userId,
        text: newSubText.trim(),
        parentId: todo._id,
        projectId: todo.projectId,
      });
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

  let badgeText = "Not Started";
  let badgeBg = colors.border;
  let badgeColor = colors.text;
  let timerIconColor = colors.primary;
  let timerText = formatTime(timeLeft);
  let arrowColor = colors.danger;
  let arrowName = "arrow-up" as any;
  let cardBg = colors.surface;
  
  if (todo.status === "in_progress") {
    badgeText = "In Progress";
    badgeBg = colors.warning + '20';
    badgeColor = colors.warning;
    cardBg = colors.taskInProgressBg;
  } else if (todo.status === "paused") {
    badgeText = "Paused";
    badgeBg = colors.border;
    badgeColor = colors.text;
    timerIconColor = colors.textMuted;
    cardBg = colors.taskPausedBg;
  } else if (todo.status === "done") {
    badgeText = "Done";
    badgeBg = colors.success + '20';
    badgeColor = colors.success;
    timerText = "00:00:00";
    arrowColor = colors.success;
    timerIconColor = colors.textMuted;
    cardBg = colors.taskDoneBg;
  } else if (todo.status === "not_done") {
    badgeText = "Not Done";
    badgeBg = colors.danger + '20'; 
    badgeColor = colors.danger;
    timerText = "00:00:00";
    timerIconColor = colors.danger;
    cardBg = colors.taskNotDoneBg;
  } else if (todo.status === "not_started") {
    cardBg = colors.taskNotStartedBg;
    badgeBg = colors.textMuted + '20';
    badgeColor = colors.textMuted;
  }

  const isTimerSet = !!todo.timerDuration;
  const isDueSoon = todo.dueDate && todo.dueDate < Date.now() + 86400000;
  
  const hasSubtasks = subtasks && subtasks.length > 0;

  return (
    <View style={{ marginLeft: depth * 16 }}>
      <TouchableOpacity 
        style={[homeStyles.card, { overflow: 'hidden', position: 'relative', backgroundColor: cardBg }]}
        onLongPress={() => onLongPress(todo._id)}
        activeOpacity={0.8}
      >
        <View style={{ zIndex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
             <View style={{ flex: 1, paddingRight: 12 }}>
               {isEditing ? (
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                   <TextInput
                     style={[homeStyles.cardTitle, { flex: 1, backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary }]}
                     value={editText}
                     onChangeText={setEditText}
                     autoFocus
                     onBlur={handleSaveEdit}
                     onSubmitEditing={handleSaveEdit}
                   />
                   <TouchableOpacity onPress={handleSaveEdit}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                   </TouchableOpacity>
                 </View>
               ) : (
                 <TouchableOpacity onPress={() => setIsEditing(true)}>
                   <Text style={[homeStyles.cardTitle, { marginBottom: 8 }]} numberOfLines={2}>{todo.text}</Text>
                 </TouchableOpacity>
               )}
               <View style={{ flexDirection: 'row', gap: 8 }}>
                 <View style={[homeStyles.badge, { backgroundColor: badgeBg === colors.border ? colors.surface + '80' : badgeBg, alignSelf: 'flex-start' }]}>
                   <Text style={[homeStyles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
                 </View>
                 {hasSubtasks && (
                   <TouchableOpacity onPress={toggleSubtasks} style={[homeStyles.badge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[homeStyles.badgeText, { color: colors.primary }]}>
                        {subtasks.length} Subtask{subtasks.length > 1 ? 's' : ''} {showSubtasks ? '▲' : '▼'}
                      </Text>
                   </TouchableOpacity>
                 )}
               </View>
             </View>
  
             <View style={{ justifyContent: 'center', alignItems: 'center', width: 64 }}>
               <CircularProgress 
                 size={64} 
                 strokeWidth={5} 
                 progress={progress} 
                 color={todo.status === 'paused' ? colors.textMuted : timerIconColor} 
                 unfilledColor={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
               >
                 <Text style={{ fontSize: 11, fontWeight: "700", color: todo.status === 'paused' ? colors.textMuted : timerIconColor, textAlign: 'center' }}>
                   {timerText}
                 </Text>
               </CircularProgress>
             </View>
          </View>
  
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
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
            
            <TouchableOpacity style={[homeStyles.actionBtn, { paddingHorizontal: 12, marginLeft: 'auto' }]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsAddingSub(true); }}>
              <Ionicons name="add" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
  
          <View style={[homeStyles.dividerDashed, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
  
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity 
              style={homeStyles.projectRow} 
              onPress={() => onLinkProject(todo._id)}
            >
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
  
          <View style={homeStyles.footerRow}>
             <View style={homeStyles.footerStats}>
                <View style={homeStyles.statItem}>
                   <Ionicons name="checkbox-outline" size={15} color={colors.textMuted} />
                   <Text style={homeStyles.statText}>{stats.checkDone}/{stats.checkTotal}</Text>
                </View>
             </View>
             
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
               <TouchableOpacity onPress={() => setIsEditing(true)}>
                 <Ionicons name="create-outline" size={18} color={colors.textMuted} />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => deleteTodo({ id: todo._id })}>
                 <Ionicons name="trash-outline" size={18} color={colors.danger} />
               </TouchableOpacity>
               <Ionicons name={arrowName} size={18} color={arrowColor} style={homeStyles.priorityArrow} />
             </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Subtasks Section */}
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
              onBlur={() => {
                if (!newSubText.trim()) {
                   LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                   setIsAddingSub(false);
                }
              }}
           />
           <TouchableOpacity onPress={handleAddSubtask}>
              <Ionicons name="arrow-up-circle" size={28} color={newSubText.trim() ? colors.primary : colors.border} />
           </TouchableOpacity>
        </View>
      )}

      {showSubtasks && hasSubtasks && (
        <View style={{ marginTop: 8, gap: 8 }}>
          {subtasks.map((sub: any) => (
            <TodoCard 
               key={sub._id}
               todo={sub} 
               onSetTimer={onSetTimer} 
               onLongPress={onLongPress} 
               onLinkProject={onLinkProject} 
               homeStyles={homeStyles}
               depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default TodoCard;
