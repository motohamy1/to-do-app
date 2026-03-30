import { createHomeStyles } from "@/assets/styles/home.styles";
import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { Alert, TextInput, TouchableOpacity, View, Text, Platform } from "react-native";
import TimerModal from "./TimerModal";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "@/hooks/useAuth";

interface TodoInputProps {
  initialDate?: number;
  projectId?: string;
}

const TodoInput: React.FC<TodoInputProps> = ({ initialDate, projectId }) => {
  const { colors } = useTheme();
  const { userId } = useAuth();
  const homeStyles = createHomeStyles(colors);

  const [newTodo, setNewTodo] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  
  // New State variables for timer configurations
  const [isTimerModalVisible, setTimerModalVisible] = useState(false);
  const [timerDuration, setTimerDuration] = useState<number | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number>(initialDate || Date.now());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState<string>("not_started");

  // Subtasks State
  const [pendingSubtasks, setPendingSubtasks] = useState<{text: string, timerDuration?: number}[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [activeTimerIndex, setActiveTimerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const addTodo = useMutation(api.todos.addTodo);

  const handleAddTodo = async () => {
    if (!userId) {
      Alert.alert("Error", "You must be logged in to add tasks");
      return;
    }
    if (newTodo.trim()) {
      try {
        const todoId = await addTodo({ 
          userId,
          text: newTodo.trim(),
          date: selectedDate,
          status: status,
          ...(timerDuration && { timerDuration }),
          ...(autoStart && timerDuration && status !== 'done' ? { status: 'in_progress', timerStartTime: Date.now() } : {}),
          ...(projectId ? { projectId } : {}),
        });

        // Add pending subtasks
        for (const sub of pendingSubtasks) {
          await addTodo({
            userId,
            text: sub.text,
            status: "not_started",
            parentId: todoId,
            ...(sub.timerDuration && { timerDuration: sub.timerDuration }),
            ...(projectId ? { projectId } : {}),
          });
        }
        
        // Reset state
        setNewTodo("");
        setTimerDuration(null);
        setAutoStart(false);
        setIsAdding(false);
        setSelectedDate(Date.now());
        setStatus("not_started");
        setPendingSubtasks([]);
        setNewSubtaskText("");
        setActiveTimerIndex(null);
      } catch (error) {
        console.log("Error adding a todo", error);
        Alert.alert("Error", "Failed to add todo");
      }
    } else {
      setIsAdding(false);
    }
  };

  const statusOptions = [
    { id: 'not_started', label: 'Todo', icon: 'ellipse-outline', color: colors.textMuted },
    { id: 'in_progress', label: 'In Progress', icon: 'play-circle-outline', color: colors.info },
    { id: 'done', label: 'Done', icon: 'checkmark-circle-outline', color: colors.success },
  ];

  if (!isAdding) {
    return (
      <TouchableOpacity style={homeStyles.addButton} onPress={() => setIsAdding(true)}>
        <Ionicons name="add" size={20} color={colors.primary} />
        <Text style={homeStyles.addButtonText}>Add a task</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <View style={[homeStyles.addInputContainer, { flexDirection: 'column', alignItems: 'stretch' }]}>
        
        {/* Top Input Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: timerDuration ? 12 : 0 }}>
          <Ionicons name="ellipse-outline" size={20} color={colors.border} />
          <TextInput
            style={[homeStyles.addInput, { flex: 1, paddingVertical: 0 }]}
            placeholder="Task title..."
            value={newTodo}
            onChangeText={setNewTodo}
            onSubmitEditing={handleAddTodo}
            onBlur={() => {
              if (!newTodo.trim() && !timerDuration) setIsAdding(false);
            }}
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="done"
          />
          <TouchableOpacity onPress={handleAddTodo}>
            <Ionicons name="arrow-up-circle" size={28} color={newTodo.trim() ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Pending Subtasks List */}
        {pendingSubtasks.length > 0 && (
          <View style={{ gap: 8, marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.primary + '40' }}>
            {pendingSubtasks.map((sub, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 8, borderRadius: 8 }}>
                <Ionicons name="ellipse-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                <Text style={{ flex: 1, color: colors.text, fontSize: 13 }}>{sub.text}</Text>
                
                <TouchableOpacity 
                   style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: sub.timerDuration ? colors.primary + '20' : 'transparent', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, marginRight: 8 }}
                   onPress={() => { setActiveTimerIndex(idx); setTimerModalVisible(true); }}
                >
                  <Ionicons name="timer-outline" size={14} color={sub.timerDuration ? colors.primary : colors.textMuted} />
                  {!!sub.timerDuration && <Text style={{ fontSize: 11, color: colors.primary }}>{Math.floor(sub.timerDuration / 60000)}m</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPendingSubtasks(prev => prev.filter((_, i) => i !== idx))}>
                  <Ionicons name="close-circle" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add Subtask Input */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.border }}>
           <Ionicons name="return-down-forward" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
           <TextInput
             style={[homeStyles.addInput, { flex: 1, paddingVertical: 4, fontSize: 13 }]}
             placeholder="Add a sub-task..."
             placeholderTextColor={colors.textMuted}
             value={newSubtaskText}
             onChangeText={setNewSubtaskText}
             onSubmitEditing={() => {
               if (newSubtaskText.trim()) {
                 setPendingSubtasks(prev => [...prev, { text: newSubtaskText.trim() }]);
                 setNewSubtaskText("");
               }
             }}
           />
           <TouchableOpacity onPress={() => {
             if (newSubtaskText.trim()) {
                 setPendingSubtasks(prev => [...prev, { text: newSubtaskText.trim() }]);
                 setNewSubtaskText("");
             }
           }}>
             <Ionicons name="add-circle" size={24} color={newSubtaskText.trim() ? colors.primary : colors.textMuted} />
           </TouchableOpacity>
        </View>

        {/* Status Selection Row */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '40', flexWrap: 'wrap' }}>
            {statusOptions.map(opt => (
                <TouchableOpacity 
                    key={opt.id}
                    onPress={() => setStatus(opt.id)}
                    style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        gap: 4, 
                        paddingHorizontal: 10, 
                        paddingVertical: 6, 
                        borderRadius: 12,
                        backgroundColor: status === opt.id ? opt.color + '15' : 'transparent',
                        borderWidth: 1,
                        borderColor: status === opt.id ? opt.color : colors.border
                    }}
                >
                    <Ionicons name={opt.icon as any} size={16} color={status === opt.id ? opt.color : colors.textMuted} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: status === opt.id ? opt.color : colors.textMuted }}>{opt.label}</Text>
                </TouchableOpacity>
            ))}
        </View>

        {/* Bottom Actions Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: timerDuration ? colors.primary + '20' : 'transparent', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }} 
              onPress={() => { setActiveTimerIndex(null); setTimerModalVisible(true); }}
            >
              <Ionicons name="timer-outline" size={18} color={timerDuration ? colors.primary : colors.textMuted} />
              <Text style={{ fontSize: 13, color: timerDuration ? colors.primary : colors.textMuted, fontWeight: '500' }}>
                {timerDuration ? `${Math.floor(timerDuration / 60000)}m set` : 'Set Timer'}
              </Text>
            </TouchableOpacity>

            {timerDuration && status !== 'done' && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: autoStart ? colors.primary + '20' : 'transparent', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
                onPress={() => setAutoStart(!autoStart)}
              >
                <Ionicons name={autoStart ? "play" : "play-outline"} size={18} color={autoStart ? colors.primary : colors.textMuted} />
                <Text style={{ fontSize: 13, color: autoStart ? colors.primary : colors.textMuted, fontWeight: '500' }}>
                  {autoStart ? 'Auto-Start ON' : 'Auto-Start OFF'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }} 
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>
                {new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={{ paddingHorizontal: 12, paddingVertical: 6 }} 
            onPress={() => setIsAdding(false)}
          >
            <Text style={{ fontSize: 14, color: colors.danger, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(selectedDate)}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setSelectedDate(date.getTime());
          }}
        />
      )}

      <TimerModal 
        visible={isTimerModalVisible}
        onClose={() => setTimerModalVisible(false)}
        onSave={(ms: number) => {
          if (activeTimerIndex === null) {
            // Main task timer validation
            const totalSubTime = pendingSubtasks.reduce((acc, sub) => acc + (sub.timerDuration || 0), 0);
            if (ms > 0 && totalSubTime > ms) {
              Alert.alert("Invalid Timer", "The main task timer cannot be less than the sum of its subtask timers.");
              return;
            }
            setTimerDuration(ms);
            if (ms === 0) setAutoStart(false); 
          } else {
            // Subtask timer validation
            const currentSubTime = pendingSubtasks[activeTimerIndex].timerDuration || 0;
            const otherSubTime = pendingSubtasks.reduce((acc, sub) => acc + (sub.timerDuration || 0), 0) - currentSubTime;
            if (timerDuration && (otherSubTime + ms) > timerDuration) {
               Alert.alert("Invalid Timer", "The sum of all subtask timers cannot exceed the main task timer.");
               return;
            }
            setPendingSubtasks(prev => prev.map((sub, i) => i === activeTimerIndex ? { ...sub, timerDuration: ms > 0 ? ms : undefined } : sub));
          }
          setTimerModalVisible(false);
        }}
      />
    </>
  );
};

export default TodoInput;