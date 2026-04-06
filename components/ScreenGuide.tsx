import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface GuideTip {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accentColor?: string;
}

interface ScreenGuideProps {
  visible: boolean;
  tips: GuideTip[];
  onDismiss: () => void;
  isArabic?: boolean;
}

export default function ScreenGuide({ visible, tips, onDismiss, isArabic = false }: ScreenGuideProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (visible) {
      // Delay entrance slightly so the screen renders first
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 9,
            useNativeDriver: true,
          }),
        ]).start();
      }, 600);
      return () => clearTimeout(timer);
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(80);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 80,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY: slideAnim }],
            bottom: insets.bottom + 90,
          },
          isArabic && { direction: 'rtl' },
        ]}
      >
        {/* Header */}
        <View style={[styles.cardHeader, isArabic && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.headerLeft, isArabic && { flexDirection: 'row-reverse' }]}>
            <View style={styles.sparkle}>
              <Ionicons name="sparkles" size={16} color="#D4F82D" />
            </View>
            <Text style={styles.headerTitle}>
              {isArabic ? 'نصائح سريعة' : 'Quick Tips'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.gotItBtn}>
              {isArabic ? 'فهمت' : 'Got it'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          {tips.map((tip, index) => (
            <View 
              key={index} 
              style={[
                styles.tipRow,
                isArabic && { flexDirection: 'row-reverse' },
                index < tips.length - 1 && styles.tipBorder,
              ]}
            >
              <View style={[styles.tipIcon, { backgroundColor: (tip.accentColor || '#D4F82D') + '18' }]}>
                <Ionicons name={tip.icon} size={20} color={tip.accentColor || '#D4F82D'} />
              </View>
              <View style={[styles.tipText, isArabic && { alignItems: 'flex-end' }]}>
                <Text style={[styles.tipTitle, isArabic && { textAlign: 'right' }]}>
                  {tip.title}
                </Text>
                <Text style={[styles.tipDesc, isArabic && { textAlign: 'right' }]}>
                  {tip.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'flex-end',
  },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(28, 28, 33, 0.97)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 248, 45, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  gotItBtn: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D4F82D',
    letterSpacing: 0.2,
  },
  tipsContainer: {
    gap: 2,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 10,
  },
  tipBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipText: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  tipDesc: {
    fontSize: 13,
    color: '#9494B8',
    lineHeight: 19,
  },
});
