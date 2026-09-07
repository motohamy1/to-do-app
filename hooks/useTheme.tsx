import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

const memoryStorage: Record<string, string> = {};

const safeStorage = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === "web") {
        return typeof localStorage !== "undefined" ? localStorage.getItem(key) : memoryStorage[key];
      }
      if (SecureStore && typeof SecureStore.getItemAsync === "function") {
        return await SecureStore.getItemAsync(key);
      }
      return memoryStorage[key] || null;
    } catch (error) {
      console.warn("Storage getItem failed:", error);
      return memoryStorage[key] || null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      memoryStorage[key] = value;
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
        return;
      }
      if (SecureStore && typeof SecureStore.setItemAsync === "function") {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.warn("Storage setItem failed:", error);
    }
  },
};

export interface ShadowPreset {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ColorScheme {
  bg: string;
  surface: string;
  surfaceHigh: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryText: string;
  secondary: string;
  secondaryText: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  shadow: string;
  infoBg: string;
  successBg: string;
  warningBg: string;
  dangerBg: string;
  taskInProgressBg: string;
  taskNotStartedBg: string;
  taskDoneBg: string;
  taskPausedBg: string;
  taskNotDoneBg: string;
  surfaceText: string;
  statusBarStyle: "light-content" | "dark-content";
  palette: {
    cream: string;
    lime: string;
    mint: string;
    lavender: string;
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
    tab: number;
  };
  shadows: {
    sm: ShadowPreset;
    md: ShadowPreset;
    lg: ShadowPreset;
    glow: ShadowPreset;
    auroraGlow: ShadowPreset;
  };
}

const darkColors: ColorScheme = {
  bg: "#0E0F14",
  surface: "#181922",
  surfaceHigh: "#222432",
  text: "#FFFFFF",
  textMuted: "#8E92A0",
  border: "#282A38",
  primary: "#dbd4fd",
  primaryText: "#181326",
  secondary: "#e5f19d",
  secondaryText: "#1a1a2e",
  success: "#10B981",
  warning: "#f6e5c9",
  danger: "#FB7185",
  info: "#defef9",
  shadow: "#000000",
  infoBg: "rgba(222, 254, 249, 0.15)",
  successBg: "rgba(16, 185, 129, 0.15)",
  warningBg: "rgba(246, 229, 201, 0.15)",
  dangerBg: "rgba(251, 113, 133, 0.15)",
  taskInProgressBg: "#1C1D2B",
  taskNotStartedBg: "#181922",
  taskDoneBg: "#141F1C",
  taskPausedBg: "#1A1B24",
  taskNotDoneBg: "#221619",
  surfaceText: "#FFFFFF",
  statusBarStyle: "light-content" as const,
  palette: {
    cream: "#f6e5c9",
    lime: "#e5f19d",
    mint: "#defef9",
    lavender: "#dbd4fd",
  },
  radii: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 22,
    full: 28,
    tab: 24,
  },
  shadows: {
    sm: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 3,
    },
    md: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 6,
    },
    lg: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.55,
      shadowRadius: 24,
      elevation: 10,
    },
    glow: {
      shadowColor: "#dbd4fd",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    auroraGlow: {
      shadowColor: "#defef9",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 6,
    },
  },
};

const lightColors: ColorScheme = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceHigh: "#F1F5F9",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  primary: "#7C6EF0",
  primaryText: "#FFFFFF",
  secondary: "#e5f19d",
  secondaryText: "#1a1a2e",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#0284C7",
  shadow: "#0F172A",
  infoBg: "#E0F2FE",
  successBg: "#D1FAE5",
  warningBg: "#FEF3C7",
  dangerBg: "#FEE2E2",
  taskInProgressBg: "#EEF2FF",
  taskNotStartedBg: "#FFFFFF",
  taskDoneBg: "#ECFDF5",
  taskPausedBg: "#F8FAFC",
  taskNotDoneBg: "#FEF2F2",
  surfaceText: "#0F172A",
  statusBarStyle: "dark-content" as const,
  palette: {
    cream: "#f6e5c9",
    lime: "#e5f19d",
    mint: "#defef9",
    lavender: "#dbd4fd",
  },
  radii: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 22,
    full: 28,
    tab: 24,
  },
  shadows: {
    sm: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 8,
    },
    glow: {
      shadowColor: "#7C6EF0",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.20,
      shadowRadius: 16,
      elevation: 6,
    },
    auroraGlow: {
      shadowColor: "#10B981",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: ColorScheme;
}

const ThemeContext = createContext<undefined | ThemeContextType>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }): React.JSX.Element => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    safeStorage.getItem("darkMode").then((value) => {
      if (value) setIsDarkMode(JSON.parse(value));
    });
  }, []);

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await safeStorage.setItem("darkMode", JSON.stringify(newMode));
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default useTheme;
