import { createHomeStyles } from "@/assets/styles/home.styles";
import useTheme from "@/hooks/useTheme";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StatusBar, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from "../../convex/_generated/api";
import { Id } from '../../convex/_generated/dataModel';
import Header from "@/components/Header";
import TodoInput from "@/components/TodoInput";
import TodoCard from "@/components/TodoCard";
import TimerModal from "@/components/TimerModal";
import ProjectPickerModal from "@/components/ProjectPickerModal";

const index = () => {
    const todos = useQuery(api.todos.get);
    const deleteTodo = useMutation(api.todos.deleteTodo);
    const setTimerMutation = useMutation(api.todos.setTimer);
    const linkProject = useMutation(api.todos.linkProject);
    const { colors } = useTheme();

    const [isTimerModalVisible, setTimerModalVisible] = useState(false);
    const [isProjectModalVisible, setProjectModalVisible] = useState(false);
    const [selectedTodoId, setSelectedTodoId] = useState<Id<"todos"> | null>(null);

    const homeStyles = createHomeStyles(colors);

    // Filter into 4 categories
    const normalizedTodos = todos?.map(t => ({
      ...t,
      status: t.status || ((t as any).isCompleted ? 'done' : 'not_started')
    })) || [];

    const inProgressTodos = normalizedTodos.filter(t => t.status === 'in_progress' || t.status === 'paused');
    const notStartedTodos = normalizedTodos.filter(t => t.status === 'not_started');
    const doneTodos = normalizedTodos.filter(t => t.status === 'done');
    const notDoneTodos = normalizedTodos.filter(t => t.status === 'not_done');

    const handleOpenTimerModal = (id: Id<"todos">) => {
      setSelectedTodoId(id);
      setTimerModalVisible(true);
    };

    const handleSaveTimer = (durationInMs: number, dueDate?: number) => {
      if (selectedTodoId) {
        setTimerMutation({ id: selectedTodoId, duration: durationInMs, dueDate });
      }
    };

    const handleOpenProjectModal = (id: Id<"todos">) => {
      setSelectedTodoId(id);
      setProjectModalVisible(true);
    };

    const handleSelectProject = (projectId: string) => {
      if (selectedTodoId) {
        linkProject({ id: selectedTodoId, projectId });
      }
    };

    const renderSection = (title: string, data: any[]) => {
      if (data.length === 0) return null;
      return (
        <View style={homeStyles.section}>
          <Text style={homeStyles.sectionTitle}>{title}</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={homeStyles.horizontalScrollCardContainer}
          >
            {data.map(todo => (
              <TodoCard 
                key={todo._id} 
                todo={todo} 
                onSetTimer={handleOpenTimerModal}
                onLongPress={(id) => deleteTodo({ id })}
                onLinkProject={handleOpenProjectModal}
                homeStyles={homeStyles}
              />
            ))}
          </ScrollView>
        </View>
      );
    };

    return (
        <View style={homeStyles.container}>
            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
            <SafeAreaView style={homeStyles.safeArea}>
                <Header />
                {todos === undefined ? (
                   <View style={homeStyles.loadingContainer}>
                     <ActivityIndicator size="large" color={colors.primary} />
                   </View>
                ) : (
                   <ScrollView contentContainerStyle={homeStyles.scrollContent} showsVerticalScrollIndicator={false}>
                      
                      {renderSection("IN PROGRESS", inProgressTodos)}
                      {renderSection("NOT STARTED", notStartedTodos)}
                      {renderSection("DONE", doneTodos)}
                      {renderSection("NOT DONE", notDoneTodos)}

                      {todos.length === 0 && (
                        <View style={homeStyles.emptyContainer}>
                           <Ionicons name="clipboard-outline" size={48} color={colors.border} />
                           <Text style={homeStyles.emptyText}>No tasks yet. Add one below!</Text>
                        </View>
                      )}
                      
                      <TodoInput />
                   </ScrollView>
                )}
            </SafeAreaView>

            <TimerModal 
              visible={isTimerModalVisible}
              onClose={() => {
                setTimerModalVisible(false);
                setSelectedTodoId(null);
              }}
              onSave={handleSaveTimer}
            />

            <ProjectPickerModal
              visible={isProjectModalVisible}
              onClose={() => {
                setProjectModalVisible(false);
                setSelectedTodoId(null);
              }}
              onSelect={handleSelectProject}
            />
        </View>
    );
};

export default index;
