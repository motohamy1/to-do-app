import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ONBOARDING_KEY = 'onboarding_complete';

const memoryStore: Record<string, string> = {};

const storage = {
  get: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : memoryStore[key] ?? null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  },
  set: async (key: string, value: string) => {
    try {
      memoryStore[key] = value;
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      // silently fail
    }
  },
};

export function useOnboarding() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    storage.get(ONBOARDING_KEY).then(val => {
      setIsFirstLaunch(val !== 'true');
    });
  }, []);

  const completeOnboarding = async () => {
    await storage.set(ONBOARDING_KEY, 'true');
    setIsFirstLaunch(false);
  };

  return {
    isFirstLaunch,
    completeOnboarding,
  };
}
