import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

// In-memory fallback
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
      console.warn("AsyncStorage getItem failed, falling back to memory:", error);
      return memoryStorage[key] || null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      memoryStorage[key] = value;
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(key, value);
        }
        return;
      }
      if (SecureStore && typeof SecureStore.setItemAsync === "function") {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.warn("AsyncStorage setItem failed, using memory instead:", error);
    }
  },
};

export interface ColorScheme {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  shadow: string;
  info: string;
  infoBg: string;
  successBg: string;
  warningBg: string;
  dangerBg: string;
  taskInProgressBg: string;
  taskNotStartedBg: string;
  taskDoneBg: string;
  taskPausedBg: string;
  taskNotDoneBg: string;
  gradients: {
    background: [string, string];
    surface: [string, string];
    primary: [string, string];
    success: [string, string];
    warning: [string, string];
    danger: [string, string];
    muted: [string, string];
    empty: [string, string];
  };
  backgrounds: {
    input: string;
    editInput: string;
  };
  surfaceText: string;
  statusBarStyle: "light-content" | "dark-content";
}

const lightColors: ColorScheme = {
  bg: "#F0F2FA",
  surface: "#FFFFFF",
  text: "#0D0F1A",
  textMuted: "#475569",
  border: "#E2E8F0",
  primary: "#6C47FF",
  success: "#00C58E",
  warning: "#FFAB00",
  danger: "#FF4D6A",
  info: "#2196F3",
  infoBg: "#EBF5FF",
  successBg: "#E0FBF2",
  warningBg: "#FFF8E1",
  dangerBg: "#FFEBEE",
  taskInProgressBg: "#fdc448ff", // Custom orange for in-progress
  taskNotStartedBg: "#F1F5F9", // Slightly gray
  taskDoneBg: "#E0FBF2",
  taskPausedBg: "#FFF7ED", // Orange 50 - subtler orange
  taskNotDoneBg: "#FFEBEE",
  shadow: "#1A0050",
  gradients: {
    background: ["#F0F2FA", "#E8ECF8"],
    surface: ["#FFFFFF", "#F8F9FF"],
    primary: ["#7C5CFF", "#6C47FF"],
    success: ["#00C58E", "#00A87A"],
    warning: ["#FFAB00", "#E09600"],
    danger: ["#FF4D6A", "#E0394F"],
    muted: ["#64748B", "#475569"],
    empty: ["#EEF0F8", "#E2E8F0"],
  },
  backgrounds: {
    input: "#FFFFFF",
    editInput: "#F8F9FF",
  },
  surfaceText: "#0D0F1A",
  statusBarStyle: "dark-content" as const,
};

const darkColors: ColorScheme = {
  bg: "#0F0F12",
  surface: "#1C1C21",
  surfaceText: "#FFFFFF",
  text: "#FFFFFF",
  textMuted: "#9494B8",
  border: "#2C2C35",
  primary: "#D4F82D",
  success: "#00E096",
  warning: "#FFB800",
  danger: "#FF5C77",
  info: "#5CB2FF",
  infoBg: "#121A2B",
  successBg: "#10261E",
  warningBg: "#2B2100",
  dangerBg: "#2B1014",
  taskInProgressBg: "#ffe100ff", // Bright Orange
  taskNotStartedBg: "#2C2C35", // Dark Gray (matched to border)
  taskDoneBg: "#10261E",
  taskPausedBg: "#1C1C21",
  taskNotDoneBg: "#ff0000", // Pure Red
  shadow: "#000000",
  gradients: {
    background: ["#0F0F12", "#0F0F12"],
    surface: ["#1C1C21", "#1C1C21"],
    primary: ["#D4F82D", "#C4E81D"],
    success: ["#00E096", "#00C58E"],
    warning: ["#FFB800", "#FFAB00"],
    danger: ["#FF5C77", "#FF4D6A"],
    muted: ["#2C2C35", "#1C1C21"],
    empty: ["#0F0F12", "#1C1C21"],
  },
  backgrounds: {
    input: "#1C1C21",
    editInput: "#1C1C21",
  },
  statusBarStyle: "light-content" as const,
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