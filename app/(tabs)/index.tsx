import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const index = () => {
    const todos = useQuery(api.todos.get);
    const addTodo = useMutation(api.todos.addTodo);
    const toggleTodo = useMutation(api.todos.toggleTodo);
    const deleteTodo = useMutation(api.todos.deleteTodo);
    const updateTodo = useMutation(api.todos.updateTodo);
    const [text, setText] = useState("");

    const handleAdd = async () => {
        if (text.trim()) {
            await addTodo({ text });
            setText("");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Convex To-Do List</Text>
            </View>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a new task..."
                    value={text}
                    onChangeText={setText}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                    <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={todos}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.taskItem}
                        onPress={() => toggleTodo({ id: item._id })}
                    >
                        <Text style={[styles.taskText, item.isCompleted && styles.completedText]}>
                            {item.isCompleted ? "✅ " : "⭕ "}
                            {item.text}
                        </Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
};

export default index;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6b46c1',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#fff',
        marginTop: 10,
        marginHorizontal: 15,
        borderRadius: 12,
        elevation: 1,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        backgroundColor: '#f1f3f5',
        color: '#333',
    },
    addButton: {
        backgroundColor: '#6b46c1',
        borderRadius: 8,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    list: {
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    taskItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    taskText: {
        fontSize: 16,
        color: '#333',
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#adb5bd',
    },
});