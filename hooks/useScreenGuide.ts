import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const GUIDE_PREFIX = 'screen_guide_seen_';

const memoryStore: Record<string, string> = {};

const guideStorage = {
  get: async (key: string): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined'
          ? localStorage.getItem(GUIDE_PREFIX + key) === 'true'
          : !!memoryStore[key];
      }
      const val = await SecureStore.getItemAsync(GUIDE_PREFIX + key);
      return val === 'true';
    } catch {
      return false;
    }
  },
  set: async (key: string) => {
    try {
      memoryStore[key] = 'true';
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(GUIDE_PREFIX + key, 'true');
        return;
      }
      await SecureStore.setItemAsync(GUIDE_PREFIX + key, 'true');
    } catch {
      // silently fail
    }
  },
};

/**
 * Hook to manage per-screen guide visibility.
 * Returns { showGuide, dismissGuide } — showGuide is true the first time the screen is visited.
 */
export function useScreenGuide(screenKey: string) {
  const [showGuide, setShowGuide] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    guideStorage.get(screenKey).then(seen => {
      if (mounted) {
        setShowGuide(!seen);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [screenKey]);

  const dismissGuide = useCallback(async () => {
    setShowGuide(false);
    await guideStorage.set(screenKey);
  }, [screenKey]);

  return { showGuide: !loading && showGuide, dismissGuide };
}
