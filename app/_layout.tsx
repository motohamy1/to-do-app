import { ThemeProvider } from "@/hooks/useTheme";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "fast-text-encoding";
import "react-native-get-random-values";
import "../utils/periodicSyncManager";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || "https://dummy-fallback.convex.cloud";
const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

import WelcomeOnboarding from "@/components/WelcomeOnboarding";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useOfflineFirstInit } from "@/hooks/useOfflineFirstInit";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useSyncManager } from "@/hooks/useSyncManager";
import { useTranslation } from "@/utils/i18n";
import { NOTIFICATION_CATEGORIES, Notifications, TIMER_ACTIONS } from "@/utils/notifications";
import { useEffect } from "react";
import { Platform, UIManager } from "react-native";

// Register the background task (already defined in backgroundTask.ts via defineTask)

function RootLayoutContent() {
  useSyncManager();
  const { isInitialized, migrationInProgress, error: offlineError } = useOfflineFirstInit();
  const { hasPermission } = useNotifications();
  const { isLoading, language, setLanguage } = useAuth();
  const { t } = useTranslation(language);
  const { isFirstLaunch, completeOnboarding } = useOnboarding();

  useEffect(() => {
    if (Platform.OS !== 'web' && Notifications?.setNotificationCategoryAsync) {
      Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.TIMER_ACTIVE, [
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

      Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.TIMER_COMPLETED, [
        {
          identifier: TIMER_ACTIONS.RESET,
          buttonTitle: t.reset || 'Reset',
          options: {
            isDestructive: true,
          }
        },
      ]);
    }

    
    // Hide splash screen once loading and onboarding check are complete
    if (!isLoading && isFirstLaunch !== null) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [language, t, isLoading, isFirstLaunch]);

  // Still checking storage and offline-first initialization
  if (isLoading || isFirstLaunch === null || migrationInProgress) return null;

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
      <Stack.Screen name="goals-detail" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
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
