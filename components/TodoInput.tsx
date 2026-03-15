import { createHomeStyles } from "@/assets/styles/home.styles";
import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { Alert, TextInput, TouchableOpacity, View, Text, Platform } from "react-native";
import TimerModal from "./TimerModal";
import DateTimePicker from "@react-native-community/datetimepicker";

interface TodoInputProps {
  initialDate?: number;
}

const TodoInput: React.FC<TodoInputProps> = ({ initialDate }) => {
  const { colors } = useTheme();
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

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const addTodo = useMutation(api.todos.addTodo);

  const handleAddTodo = async () => {
    if (newTodo.trim()) {
      try {
        await addTodo({ 
          text: newTodo.trim(),
          date: selectedDate,
          status: status,
          ...(timerDuration && { timerDuration }),
          ...(autoStart && timerDuration && status !== 'done' ? { status: 'in_progress', timerStartTime: Date.now() } : {})
        });
        
        // Reset state
        setNewTodo("");
        setTimerDuration(null);
        setAutoStart(false);
        setIsAdding(false);
        setSelectedDate(Date.now());
        setStatus("not_started");
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
    { id: 'in_progress', label: 'Doing', icon: 'play-circle-outline', color: colors.info },
    { id: 'done', label: 'Done', icon: 'checkmark-circle-outline', color: colors.success },
  ];

  if (!isAdding) {
    return (
      <TouchableOpacity style={homeStyles.addButton} onPress={() => setIsAdding(true)}>
        <Ionicons name="add" size={20} color={colors.primary} />
        <Text style={homeStyles.addButtonText}>Add a card</Text>
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
              onPress={() => setTimerModalVisible(true)}
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
          setTimerDuration(ms);
          if (ms === 0) setAutoStart(false); 
        }}
      />
    </>
  );
};

export default TodoInput;