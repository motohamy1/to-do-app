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
  statusBarStyle: "light-content" | "dark-content";
}

const lightColors: ColorScheme = {
  bg: "#F0F2FA",
  surface: "#FFFFFF",
  text: "#0D0F1A",
  textMuted: "#64748B",
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
  taskInProgressBg: "#f6bf0aff", // Orange 100 - clearly orange tinted
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
    muted: ["#94A3B8", "#64748B"],
    empty: ["#EEF0F8", "#E2E8F0"],
  },
  backgrounds: {
    input: "#FFFFFF",
    editInput: "#F8F9FF",
  },
  statusBarStyle: "dark-content" as const,
};

const darkColors: ColorScheme = {
  bg: "#0A0B10",
  surface: "#12141C",
  text: "#EDF0FF",
  textMuted: "#7A8099",
  border: "#1E2130",
  primary: "#7C5CFF",
  success: "#00C58E",
  warning: "#FFAB00",
  danger: "#FF4D6A",
  info: "#47A3FF",
  infoBg: "#0D1A2E",
  successBg: "#0A2E24",
  warningBg: "#2A1E00",
  dangerBg: "#2A0A10",
  taskInProgressBg: "#4C2B0A", // More saturated dark orange
  taskNotStartedBg: "#1E2130", // Slightly gray-dark
  taskDoneBg: "#0A2E24",
  taskPausedBg: "#2A1E0D", // Muted dark orange
  taskNotDoneBg: "#2A0A10",
  shadow: "#000000",
  gradients: {
    background: ["#0A0B10", "#0D0F18"],
    surface: ["#12141C", "#161824"],
    primary: ["#7C5CFF", "#6C47FF"],
    success: ["#00C58E", "#00A87A"],
    warning: ["#FFAB00", "#E09600"],
    danger: ["#FF4D6A", "#E0394F"],
    muted: ["#2A2D3E", "#3A3D52"],
    empty: ["#1A1C28", "#1E2030"],
  },
  backgrounds: {
    input: "#12141C",
    editInput: "#0A0B10",
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