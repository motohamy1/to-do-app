import { useAuth } from '@/hooks/useAuth';
import useTheme from '@/hooks/useTheme';
import { useTranslation } from '@/utils/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleProp, StyleSheet, Text, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PRESS_SPRING } from './LivePress';

interface FloatingActionButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  label?: string;
}

const FAB_RADIUS = 22;

export default function FloatingActionButton({ onPress, style, label }: FloatingActionButtonProps) {
  const { colors } = useTheme();
  const { language } = useAuth();
  const { isArabic } = useTranslation(language);

  const breath = useSharedValue(1);
  const press = useSharedValue(1);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withDelay(2200, withTiming(1.025, { duration: 1100, easing: Easing.inOut(Easing.ease) })),
        withDelay(400, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }))
      ),
      -1,
      false
    );
    return () => {
      breath.value = 1;
    };
  }, [breath]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value * press.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, { ...colors.shadows.glow, shadowColor: '#e5f19d' }, animatedStyle, style]}>
      <TouchableWithoutFeedback
        onPress={onPress}
        onPressIn={() => { press.value = withSpring(0.96, PRESS_SPRING); }}
        onPressOut={() => { press.value = withSpring(1, PRESS_SPRING); }}
      >
        <View style={[styles.fab, { backgroundColor: '#e5f19d' }]}>
          <Text style={[styles.text, { color: '#16270E', fontWeight: '800' }]}>
            {label || (isArabic ? 'إضافة مهمة' : 'Add Task')}
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
    borderRadius: FAB_RADIUS,
    overflow: 'hidden',
  },
  fab: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: FAB_RADIUS,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
