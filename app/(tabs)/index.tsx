import { createHomeStyles } from "@/assets/styles/home.styles";
import useTheme from "@/hooks/useTheme";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo, useRef } from 'react';

import { StatusBar, View, Text, ScrollView, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from "../../convex/_generated/api";
import { Id } from '../../convex/_generated/dataModel';
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import TodoInput from "@/components/TodoInput";
import TodoCard from "@/components/TodoCard";
import TimerModal from "@/components/TimerModal";
import ProjectPickerModal from "@/components/ProjectPickerModal";
import CircularProgress from "@/components/CircularProgress";
import { useAuth } from "@/hooks/useAuth";

import { useTranslation } from "@/utils/i18n";

const index = () => {
    const { userId, language } = useAuth();
    const { t, isArabic } = useTranslation(language);
    const todos = useQuery(api.todos.get, userId ? { userId } : "skip");
    const deleteTodo = useMutation(api.todos.deleteTodo);
    const router = useRouter();
    const setTimerMutation = useMutation(api.todos.setTimer);
    const linkProject = useMutation(api.todos.linkProject);
    const { colors, isDarkMode } = useTheme();

    const [isTimerModalVisible, setTimerModalVisible] = useState(false);
    const [isProjectModalVisible, setProjectModalVisible] = useState(false);
    const [selectedTodoId, setSelectedTodoId] = useState<Id<"todos"> | null>(null);
    const [activeFilter, setActiveFilter] = useState<'All' | 'In Progress' | 'Done'>('All');

    const scrollViewRef = useRef<ScrollView>(null);
    const homeStyles = createHomeStyles(colors, isArabic);

    const scrollToBottom = () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    };


    const normalizedTodos = todos?.map(t => ({

      ...t,
      status: t.status || ((t as any).isCompleted ? 'done' : 'not_started')
    })) || [];

    const todayTodos = normalizedTodos; 
    const doneTodosCount = todayTodos.filter(t => t.status === 'done').length;
    const inProgressCount = todayTodos.filter(t => t.status === 'in_progress' || t.status === 'paused').length;
    const totalCount = todayTodos.length;

    const progressPercent = totalCount === 0 ? 0 : Math.round((doneTodosCount / totalCount) * 100);

    const handleOpenTimerModal = (id: Id<"todos">) => {
      setSelectedTodoId(id);
      setTimerModalVisible(true);
    };

    const handleSaveTimer = (durationInMs: number, dueDate?: number, date?: number) => {
      if (selectedTodoId) {
        setTimerMutation({ id: selectedTodoId, duration: durationInMs, dueDate, date });
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

    const displayedTodos = useMemo(() => {
        if (activeFilter === 'Done') return todayTodos.filter(t => t.status === 'done');
        if (activeFilter === 'In Progress') return todayTodos.filter(t => t.status === 'in_progress' || t.status === 'paused');
        return todayTodos;
    }, [todayTodos, activeFilter]);

    return (
        <KeyboardAvoidingView 
            style={[homeStyles.container, isArabic && { direction: 'rtl' }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >

            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />
            <SafeAreaView style={homeStyles.safeArea}>
                <Header />
                {todos === undefined ? (
                   <View style={homeStyles.loadingContainer}>
                     <ActivityIndicator size="large" color={colors.primary} />
                   </View>
                ) : (
                   <ScrollView 
                     ref={scrollViewRef}
                     contentContainerStyle={homeStyles.scrollContent} 
                     showsVerticalScrollIndicator={false} 
                     keyboardShouldPersistTaps="handled"
                   >

                      
                      {/* Today's Plan Card */}
                      <View style={[homeStyles.todaysPlanCard, isArabic && { flexDirection: 'row-reverse' }]}>
                          <View style={isArabic && { alignItems: 'flex-end' }}>
                              <Text style={homeStyles.todaysPlanTitle}>{t.todaysPlan}</Text>
                              <Text style={homeStyles.todaysPlanSubtitle}>{doneTodosCount}/{totalCount} {t.tasksCompleted}</Text>
                          </View>
                          <CircularProgress 
                              size={64} 
                              strokeWidth={6} 
                              progress={progressPercent} 
                              color="#000000" 
                              unfilledColor="rgba(0,0,0,0.1)"
                          >
                              <Text style={{ fontSize: 16, fontWeight: "800", color: "#000000" }}>{progressPercent}%</Text>
                          </CircularProgress>
                      </View>

                      {/* Filter Pills */}
                      <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={[homeStyles.pillsContainer, isArabic && { flexDirection: 'row-reverse' }]}
                      >
                          {(['All', 'In Progress', 'Done'] as const).map(filter => {
                              const isActive = activeFilter === filter;
                              let count = 0;
                              if (filter === 'All') count = totalCount;
                              if (filter === 'In Progress') count = inProgressCount;
                              if (filter === 'Done') count = doneTodosCount;

                              const filterLabel = filter === 'All' ? t.all : 
                                                filter === 'In Progress' ? t.inProgress : t.done;

                              return (
                                  <TouchableOpacity 
                                      key={filter} 
                                      style={[homeStyles.pill, isActive ? homeStyles.pillActive : homeStyles.pillInactive]}
                                      onPress={() => setActiveFilter(filter)}
                                  >
                                      <Text style={[homeStyles.pillText, { color: isActive ? colors.primary : colors.textMuted }]}>
                                          {filterLabel}
                                      </Text>
                                      <Text style={[homeStyles.pillSubText, { color: isActive ? colors.primary + 'CC' : colors.textMuted }]}>
                                          {count} {count === 1 ? t.task : t.tasks}
                                      </Text>
                                  </TouchableOpacity>
                              );
                          })}
                      </ScrollView>

                      {/* Tasks List */}
                      <View style={[homeStyles.sectionTitleContainer, isArabic && { flexDirection: 'row-reverse' }]}>
                          <Text style={homeStyles.sectionTitleText}>{t.tasksForToday}</Text>
                          <TouchableOpacity>
                              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
                          </TouchableOpacity>
                      </View>

                      {displayedTodos.length === 0 && (
                        <View style={homeStyles.emptyContainer}>
                           <Ionicons name="clipboard-outline" size={48} color={colors.border} />
                           <Text style={homeStyles.emptyText}>{t.noTasksFound}</Text>
                        </View>
                      )}

                      {displayedTodos.map(todo => (
                          <TodoCard 
                              key={todo._id} 
                              todo={todo} 
                              onSetTimer={handleOpenTimerModal}
                              onLongPress={(id) => deleteTodo({ id })}
                              onLinkProject={handleOpenProjectModal}
                              homeStyles={homeStyles}
                              isTimelineMode={true}
                          />
                      ))}
                      
                      {activeFilter === 'All' && (
                          <View style={{ marginTop: 24, marginBottom: 80 }}>
                              <TodoInput onFocus={scrollToBottom} />
                          </View>
                      )}

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
              initialDate={todos?.find(t => t._id === selectedTodoId)?.date}
            />

            <ProjectPickerModal
              visible={isProjectModalVisible}
              onClose={() => {
                setProjectModalVisible(false);
                setSelectedTodoId(null);
              }}
              onSelect={handleSelectProject}
            />

        </KeyboardAvoidingView>
    );
};

export default index;
