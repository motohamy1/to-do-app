import { createHomeStyles } from '@/assets/styles/home.styles'
import { api } from '@/convex/_generated/api'
import useTheme from '@/hooks/useTheme'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from 'convex/react'
import { useAuth } from '@/hooks/useAuth'
import React, { useRef, useEffect } from 'react'
import { Text, View, TouchableOpacity, Animated, StyleSheet } from 'react-native'

const Header = () => {
    const { colors, isDarkMode, toggleDarkMode } = useTheme();
    const { userId, language } = useAuth();
    const homeStyles = createHomeStyles(colors);
    const todos = useQuery(api.todos.get, userId ? { userId } : "skip");

    const totalCount = todos ? todos.length : 0;

    // Animate the toggle pill
    const toggleAnim = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(toggleAnim, {
            toValue: isDarkMode ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
    }, [isDarkMode]);

    const pillTranslate = toggleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 22],
    });

    const trackBg = toggleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#E2E8F0', '#1E2130'],
    });

    const isArabic = language === 'ar';

    return (
        <View style={[homeStyles.header, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={[homeStyles.headerLeft, isArabic && { flexDirection: 'row-reverse' }]}>
                <Text style={homeStyles.headerTitle}>{isArabic ? 'مهامي' : 'TODO'}</Text>
                <Text style={homeStyles.headerCount}>{totalCount}</Text>
            </View>

            {/* Dark / Light Mode Toggle */}
            <TouchableOpacity
                onPress={toggleDarkMode}
                activeOpacity={0.85}
                style={styles.toggleWrapper}
                accessibilityLabel={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
                {/* Icons */}
                <Ionicons
                    name="sunny"
                    size={13}
                    color={isDarkMode ? '#7A8099' : '#FFAB00'}
                    style={styles.sunIcon}
                />
                <Ionicons
                    name="moon"
                    size={12}
                    color={isDarkMode ? '#7C5CFF' : '#C4C9E0'}
                    style={styles.moonIcon}
                />

                {/* Animated Track */}
                <Animated.View
                    style={[styles.track, { backgroundColor: trackBg }]}
                >
                    {/* Pill */}
                    <Animated.View
                        style={[
                            styles.pill,
                            {
                                transform: [{ translateX: pillTranslate }],
                                backgroundColor: isDarkMode ? '#7C5CFF' : '#6C47FF',
                            },
                        ]}
                    />
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    toggleWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sunIcon: {
        marginRight: 2,
    },
    moonIcon: {
        marginRight: 4,
    },
    track: {
        width: 44,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        position: 'relative',
    },
    pill: {
        width: 20,
        height: 20,
        borderRadius: 10,
        position: 'absolute',
        shadowColor: '#6C47FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
    },
});

export default Header;