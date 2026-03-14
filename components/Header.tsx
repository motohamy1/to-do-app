import { createHomeStyles } from '@/assets/styles/home.styles'
import { api } from '@/convex/_generated/api'
import useTheme from '@/hooks/useTheme'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from 'convex/react'
import React from 'react'
import { Text, View, TouchableOpacity } from 'react-native'

const Header = () => {
    const { colors } = useTheme();
    const homeStyles = createHomeStyles(colors);
    const todos = useQuery(api.todos.get);

    const totalCount = todos ? todos.length : 0;

    return (
        <View style={homeStyles.header}>
            <View style={homeStyles.headerLeft}>
                <Text style={homeStyles.headerTitle}>TODO</Text>
                <Text style={homeStyles.headerCount}>{totalCount}</Text>
            </View>
            <TouchableOpacity style={homeStyles.headerRight}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
            </TouchableOpacity>
        </View>
    )
}

export default Header