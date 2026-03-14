import { createHomeStyles } from "@/assets/styles/home.styles";
import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Alert, TextInput, TouchableOpacity, View, Text } from "react-native";
import TimerModal from "./TimerModal";

const TodoInput = () => {
  const { colors } = useTheme();
  const homeStyles = createHomeStyles(colors);

  const [newTodo, setNewTodo] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  
  // New State variables for timer configurations
  const [isTimerModalVisible, setTimerModalVisible] = useState(false);
  const [timerDuration, setTimerDuration] = useState<number | null>(null);
  const [autoStart, setAutoStart] = useState(false);

  const addTodo = useMutation(api.todos.addTodo);

  const handleAddTodo = async () => {
    if (newTodo.trim()) {
      try {
        await addTodo({ 
          text: newTodo.trim(),
          ...(timerDuration && { timerDuration }),
          ...(autoStart && timerDuration ? { status: 'in_progress', timerStartTime: Date.now() } : {})
        });
        
        // Reset state
        setNewTodo("");
        setTimerDuration(null);
        setAutoStart(false);
        setIsAdding(false);
      } catch (error) {
        console.log("Error adding a todo", error);
        Alert.alert("Error", "Failed to add todo");
      }
    } else {
      setIsAdding(false);
    }
  };

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

        {/* Bottom Actions Row (Always visible while adding to show the options) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: timerDuration ? colors.primary + '20' : 'transparent', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }} 
              onPress={() => setTimerModalVisible(true)}
            >
              <Ionicons name="timer-outline" size={18} color={timerDuration ? colors.primary : colors.textMuted} />
              <Text style={{ fontSize: 13, color: timerDuration ? colors.primary : colors.textMuted, fontWeight: '500' }}>
                {timerDuration ? `${Math.floor(timerDuration / 60000)}m set` : 'Set Timer'}
              </Text>
            </TouchableOpacity>

            {timerDuration && (
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
          </View>
          
        </View>
      </View>

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