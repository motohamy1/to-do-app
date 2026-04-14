import useTheme from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/utils/i18n';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle, Platform } from 'react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function FloatingActionButton({ onPress, style }: FloatingActionButtonProps) {
  const { colors } = useTheme();
  const { language } = useAuth();
  const { isArabic } = useTranslation(language);

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.primary || '#D4F82D' }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.text, 
        { 
          color: '#000000',
          fontSize: 12,
          fontWeight: '800',
          fontFamily: Platform.OS === 'ios' ? 'Inter' : 'sans-serif-medium'
        }
      ]}>
        {isArabic ? 'إضافة مهمة' : 'Add a Task'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  text: {
    textAlign: 'center',
  },
});
