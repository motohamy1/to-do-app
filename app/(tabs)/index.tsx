import { createHomeStyles } from "@/assets/styles/home.styles";
import useTheme from "@/hooks/useTheme";
import { useMutation, useQuery } from "convex/react";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from "../../convex/_generated/api";
import Header from "@/components/Header";
import TodoInput from "@/components/TodoInput";

const index = () => {
    const todos = useQuery(api.todos.get);
    const addTodo = useMutation(api.todos.addTodo);
    const toggleTodo = useMutation(api.todos.toggleTodo);
    const deleteTodo = useMutation(api.todos.deleteTodo);
    const updateTodo = useMutation(api.todos.updateTodo);
    const [text, setText] = useState("");
    const { toggleDarkMode, colors } = useTheme();

    const homeStyles = createHomeStyles(colors)

    const handleAdd = async () => {
        if (text.trim()) {
            await addTodo({ text });
            setText("");
        }
    };

    return (
        <LinearGradient colors={colors.gradients.background} style={homeStyles.container}>
            <StatusBar barStyle={colors.statusBarStyle} />
            <SafeAreaView >
                <Header />
                <TodoInput />
            </SafeAreaView>
        </LinearGradient>
    );
};

export default index;

