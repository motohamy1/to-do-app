# Welcome Onboarding Guide - Implementation Plan

## Overview

This document outlines the implementation of a welcome onboarding flow that:
1. Shows language selection on first app launch (English / Arabic)
2. Displays welcome guide cards in selected language
3. Stores onboarding completion to prevent showing again

---

## Current Architecture

### Existing Components
- `components/ScreenGuide.tsx` - Shows tips per screen (already implemented)
- `hooks/useScreenGuide.ts` - Uses SecureStore to track seen guides
- `hooks/useAuth.tsx` - Provides language from user profile (defaults to "en")
- `utils/i18n.ts` - Contains all translations

### Language Flow
```
useAuth() → language: "en" | "ar"
     ↓
useTranslation(language) → t object
```

---

## Implementation Plan

### Phase 1: Storage & Hook (Foundation)

**File:** `hooks/useOnboarding.ts` (NEW)

```typescript
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'onboarding_complete';
const LANGUAGE_KEY = 'app_language';

export function useOnboarding() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [savedLanguage, setSavedLanguage] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
        const language = await AsyncStorage.getItem(LANGUAGE_KEY);
        setIsFirstLaunch(completed !== 'true');
        setSavedLanguage(language);
      } catch (e) {
        setIsFirstLaunch(true);
      }
    };
    checkOnboarding();
  }, []);

  const completeOnboarding = async (language: string) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
      setIsFirstLaunch(false);
      setSavedLanguage(language);
    } catch (e) {
      console.warn('Failed to save onboarding:', e);
    }
  };

  const skipOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setIsFirstLaunch(false);
    } catch (e) {
      console.warn('Failed to skip onboarding:', e);
    }
  };

  return {
    isFirstLaunch: isFirstLaunch ?? true,  // Default to true while loading
    savedLanguage,
    completeOnboarding,
    skipOnboarding,
  };
}
```

---

### Phase 2: WelcomeOnboarding Component

**File:** `components/WelcomeOnboarding.tsx` (NEW)

```typescript
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  icon: keyof typeof Ionicons.glyphMap;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  accentColor: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: 'add-circle-outline',
    titleEn: 'Add Tasks Quickly',
    titleAr: 'أضف مهام سريعة',
    descEn: 'Type your task and tap send. Simple and fast.',
    descAr: 'اكتب مهمتك واضغط إرسال. بسيطة وسريعة.',
    accentColor: '#D4F82D',
  },
  {
    icon: 'timer-outline',
    titleEn: 'Set Smart Timers',
    titleAr: 'ضبط مؤقتات ذكية',
    descEn: 'Add timers to track your focus time.',
    descAr: 'أضف مؤقتات لتتبع وقت ��ركيزك.',
    accentColor: '#00E096',
  },
  {
    icon: 'folder-outline',
    titleEn: 'Organize with Projects',
    titleAr: 'نظم مع المشاريع',
    descEn: 'Group tasks by project for better focus.',
    descAr: 'قوم المهام حسب المشروع للتركيز الأفضل.',
    accentColor: '#5CB2FF',
  },
  {
    icon: 'notifications-outline',
    titleEn: 'Smart Notifications',
    titleAr: 'إشعارات ذكية',
    descEn: 'Get notified when timer completes.',
    descAr: 'احصل على إشعار عند انتهاء المؤقت.',
    accentColor: '#FF5C77',
  },
];

interface WelcomeOnboardingProps {
  onComplete: (language: string) => void;
  onSkip: () => void;
}

export default function WelcomeOnboarding({ onComplete, onSkip }: WelcomeOnboardingProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'language' | 'welcome'>('language');
  const [selectedLang, setSelectedLang] = useState<'en' | 'ar'>('en');
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isArabic = selectedLang === 'ar';

  // Language Selection Screen
  if (step === 'language') {
    return (
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.languageContainer}>
          <Text style={styles.selectLangTitle}>
            {isArabic ? 'اختر لغتك' : 'Select Your Language'}
          </Text>
          <Text style={styles.selectLangSubtitle}>
            {isArabic 
              ? 'سيكون دليل الترحيب بلغتك المختارة' 
              : 'The welcome guide will be in your selected language'}
          </Text>

          <View style={styles.langOptions}>
            {/* English Option */}
            <TouchableOpacity
              style={[
                styles.langCard,
                selectedLang === 'en' && styles.langCardSelected,
              ]}
              onPress={() => setSelectedLang('en')}
            >
              <Text style={styles.flag}>🇺🇸</Text>
              <Text style={[
                styles.langLabel,
                selectedLang === 'en' && styles.langLabelSelected,
              ]}>English</Text>
              {selectedLang === 'en' && (
                <Ionicons name="checkmark-circle" size={24} color="#D4F82D" />
              )}
            </TouchableOpacity>

            {/* Arabic Option */}
            <TouchableOpacity
              style={[
                styles.langCard,
                selectedLang === 'ar' && styles.langCardSelected,
              ]}
              onPress={() => setSelectedLang('ar')}
            >
              <Text style={styles.flag}>🇸🇦</Text>
              <Text style={[
                styles.langLabel,
                selectedLang === 'ar' && styles.langLabelSelected,
              ]}>العربية</Text>
              {selectedLang === 'ar' && (
                <Ionicons name="checkmark-circle" size={24} color="#D4F82D" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => setStep('welcome')}
          >
            <Text style={styles.continueBtnText}>
              {isArabic ? 'متابعة' : 'Continue'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Welcome Slides Screen
  const slide = SLIDES[currentSlide];
  const isLastSlide = currentSlide === SLIDES.length - 1;

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]}>
      {/* Skip Button */}
      <TouchableOpacity 
        style={[styles.skipBtn, { top: insets.top + 16 }]}
        onPress={onSkip}
      >
        <Text style={styles.skipBtnText}>
          {isArabic ? 'تخطي' : 'Skip'}
        </Text>
      </TouchableOpacity>

      {/* Slide Content */}
      <View style={styles.slideContainer}>
        <View style={[styles.slideIcon, { backgroundColor: slide.accentColor + '18' }]}>
          <Ionicons name={slide.icon} size={48} color={slide.accentColor} />
        </View>
        
        <Text style={[
          styles.slideTitle,
          isArabic && { textAlign: 'right', writingDirection: 'rtl' }
        ]}>
          {isArabic ? slide.titleAr : slide.titleEn}
        </Text>
        
        <Text style={[
          styles.slideDesc,
          isArabic && { textAlign: 'right', writingDirection: 'rtl' }
        ]}>
          {isArabic ? slide.descAr : slide.descEn}
        </Text>
      </View>

      {/* Progress Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentSlide === index && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={[styles.navButtons, { paddingBottom: insets.bottom + 24 }]}>
        {isLastSlide ? (
          <TouchableOpacity
            style={styles.getStartedBtn}
            onPress={() => onComplete(selectedLang)}
          >
            <Text style={styles.getStartedBtnText}>
              {isArabic ? 'لنبدأ!' : "Let's Go!"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => {
                Animated.timing(slideAnim, {
                  toValue: -(currentSlide + 1) * SCREEN_WIDTH,
                  duration: 300,
                  useNativeDriver: true,
                }).start();
                setCurrentSlide(currentSlide + 1);
              }}
            >
              <Text style={styles.nextBtnText}>
                {isArabic ? 'التالي' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.prevBtn}
              onPress={() => {
                if (currentSlide > 0) {
                  setCurrentSlide(currentSlide - 1);
                }
              }}
              disabled={currentSlide === 0}
            >
              <Ionicons 
                name="arrow-back" 
                size={18} 
                color={currentSlide === 0 ? '#666' : '#fff'} 
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  
  // Language Screen
  languageContainer: {
    width: '100%',
    alignItems: 'center',
  },
  selectLangTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  selectLangSubtitle: {
    fontSize: 16,
    color: '#9494B8',
    marginBottom: 48,
    textAlign: 'center',
  },
  langOptions: {
    width: '100%',
    gap: 16,
    marginBottom: 48,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1F',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  langCardSelected: {
    borderColor: '#D4F82D',
    backgroundColor: '#D4F82D15',
  },
  flag: {
    fontSize: 32,
    marginRight: 16,
  },
  langLabel: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  langLabelSelected: {
    color: '#D4F82D',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4F82D',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    gap: 8,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },

  // Welcome Slides
  skipBtn: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9494B8',
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  slideIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  slideDesc: {
    fontSize: 17,
    color: '#9494B8',
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  dotActive: {
    backgroundColor: '#D4F82D',
    width: 24,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    paddingHorizontal: 24,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D4F82D',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  prevBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  getStartedBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D4F82D',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  getStartedBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
});
```

---

### Phase 3: Integration in App Layout

**File:** `app/_layout.tsx` (MODIFY)

```typescript
import { useOnboarding } from '@/hooks/useOnboarding';
import WelcomeOnboarding from '@/components/WelcomeOnboarding';

export default function RootLayout() {
  // ... existing code ...
  const { isFirstLaunch, savedLanguage, completeOnboarding, skipOnboarding } = useOnboarding();
  const { language, setLanguage } = useAuth(); // Need to add setLanguage to auth context

  // After onboarding, sync language to auth
  useEffect(() => {
    if (savedLanguage && language !== savedLanguage) {
      // Update auth language
      // setLanguage(savedLanguage); // Add this to useAuth
    }
  }, [savedLanguage]);

  if (isFirstLaunch) {
    return (
      <WelcomeOnboarding 
        onComplete={async (lang) => {
          await completeOnboarding(lang);
          // setLanguage(lang); // Update auth context
        }}
        onSkip={async () => {
          await skipOnboarding();
        }}
      />
    );
  }

  return (
    // ... existing layout code
  );
}
```

---

### Phase 4: Add setLanguage to useAuth

**File:** `hooks/useAuth.tsx` (MODIFY)

Add `setLanguage` function to AuthContext:

```typescript
interface AuthContextType {
  // ... existing fields
  language: string;
  setLanguage?: (lang: string) => void;  // ADD
}

// Inside AuthProvider:
const setLanguage = async (lang: string) => {
  if (user) {
    await updateUserProfile({ language: lang });
  }
  // Also save to AsyncStorage for persistence
  await AsyncStorage.setItem('app_language', lang);
};

return (
  <AuthContext.Provider value={{
    // ... existing values
    language: user?.language ?? savedLanguage ?? "en",
    setLanguage,  // ADD
  }}>
```

---

## Testing Checklist

- [ ] First launch shows language selection
- [ ] Selecting language updates UI immediately
- [ ] Welcome slides show in selected language
- [ ] "Skip" hides onboarding permanently
- [ ] "Let's Go" saves language and completes onboarding
- [ ] Subsequent launches bypass onboarding
- [ ] Language persists in app settings

---

## File Summary

| File | Action |
|------|--------|
| `hooks/useOnboarding.ts` | CREATE - New hook for onboarding state |
| `components/WelcomeOnboarding.tsx` | CREATE - New onboarding UI |
| `app/_layout.tsx` | MODIFY - Add onboarding check |
| `hooks/useAuth.tsx` | MODIFY - Add setLanguage function |
| `ONBOARDING.md` | CREATE - This documentation |

---

## Alternative: Simpler Implementation (If need faster)

If you want to skip the full onboarding and just show language picker first:

```typescript
// In _layout.tsx - Simplified version
if (isFirstLaunch && !savedLanguage) {
  return <LanguagePickerModal onSelect={completeOnboarding} />;
}
```

Then use existing `ScreenGuide` for tips after the user picks language.

---

Let me know when you're ready to start implementation, or if you want me to create the actual files now.