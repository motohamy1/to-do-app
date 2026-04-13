import "fast-text-encoding";
import "react-native-get-random-values";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { ThemeProvider } from "@/hooks/useTheme";
import * as SplashScreen from "expo-splash-screen";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || "https://dummy-fallback.convex.cloud";
const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import { requestPermissionsAsync } from "@/utils/notifications";
import { useSyncManager } from "@/hooks/useSyncManager";
import { useNotifications } from "@/hooks/useNotifications";
import { useTranslation } from "@/utils/i18n";
import { NOTIFICATION_CATEGORIES, TIMER_ACTIONS, Notifications } from "@/utils/notifications";
import { BACKGROUND_NOTIFICATION_TASK } from "@/utils/backgroundTask";
import { useOnboarding } from "@/hooks/useOnboarding";
import WelcomeOnboarding from "@/components/WelcomeOnboarding";

// Register the background task (already defined in backgroundTask.ts via defineTask)

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function RootLayoutContent() {
  useSyncManager();
  const { hasPermission } = useNotifications();
  const { isLoading, language, setLanguage } = useAuth();
  const { t } = useTranslation(language);
  const { isFirstLaunch, completeOnboarding } = useOnboarding();

  useEffect(() => {
    Notifications?.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.TIMER_ACTIVE, [
      {
        identifier: TIMER_ACTIONS.PAUSE,
        buttonTitle: t.pause || 'Pause',
      },
      {
        identifier: TIMER_ACTIONS.RESUME,
        buttonTitle: t.resume || 'Resume',
      },
      {
        identifier: TIMER_ACTIONS.RESET,
        buttonTitle: t.reset || 'Reset',
        options: {
          isDestructive: true,
        }
      },
    ]);
    
    // Hide splash screen once loading and onboarding check are complete
    if (!isLoading && isFirstLaunch !== null) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [language, t, isLoading, isFirstLaunch]);

  // Still checking storage
  if (isLoading || isFirstLaunch === null) return null;

  if (isFirstLaunch) {
    return (
      <WelcomeOnboarding
        onComplete={async (lang) => {
          await setLanguage(lang);
          await completeOnboarding();
        }}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
      <Stack.Screen 
        name="add-reminder" 
        options={{ 
          presentation: 'modal',
          headerShown: false,
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <RootLayoutContent />
        </AuthProvider>
      </ConvexProvider>
    </ThemeProvider>
  );
}
