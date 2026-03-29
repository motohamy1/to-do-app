import "fast-text-encoding";
import "react-native-get-random-values";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { ThemeProvider } from "@/hooks/useTheme";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import { requestPermissionsAsync, scheduleDailyReminders } from "@/utils/notifications";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function RootLayoutContent() {
  const { isLoading } = useAuth();

  useEffect(() => {
    async function setupApp() {
      const granted = await requestPermissionsAsync();
      if (granted) {
        await scheduleDailyReminders();
      }
    }
    setupApp();
  }, []);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
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
