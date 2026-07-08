"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ThemeMode = "light" | "dark";
type FontSize = "comfortable" | "large" | "extra-large";

type AppSettings = {
  themeMode: ThemeMode;
  fontSize: FontSize;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  resetSettings: () => void;
};

const STORAGE_KEY = "oculi:settings";
const DEFAULT_THEME_MODE: ThemeMode = "light";
const DEFAULT_FONT_SIZE: FontSize = "comfortable";

const AppSettingsContext = createContext<AppSettings | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isFontSize(value: unknown): value is FontSize {
  return value === "comfortable" || value === "large" || value === "extra-large";
}

function readStoredSettings() {
  if (typeof window === "undefined") {
    return { themeMode: DEFAULT_THEME_MODE, fontSize: DEFAULT_FONT_SIZE };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { themeMode: DEFAULT_THEME_MODE, fontSize: DEFAULT_FONT_SIZE };
    }

    const parsed = JSON.parse(stored) as Partial<Record<keyof Pick<AppSettings, "themeMode" | "fontSize">, unknown>>;
    return {
      themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : DEFAULT_THEME_MODE,
      fontSize: isFontSize(parsed.fontSize) ? parsed.fontSize : DEFAULT_FONT_SIZE,
    };
  } catch {
    return { themeMode: DEFAULT_THEME_MODE, fontSize: DEFAULT_FONT_SIZE };
  }
}

function applySettings(themeMode: ThemeMode, fontSize: FontSize) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.theme = themeMode;
  document.documentElement.dataset.fontSize = fontSize;
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  const [fontSize, setFontSizeState] = useState<FontSize>(DEFAULT_FONT_SIZE);

  useEffect(() => {
    const stored = readStoredSettings();
    setThemeModeState(stored.themeMode);
    setFontSizeState(stored.fontSize);
    applySettings(stored.themeMode, stored.fontSize);
  }, []);

  useEffect(() => {
    applySettings(themeMode, fontSize);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeMode, fontSize }));
    } catch {
      // The visual setting still applies even if localStorage is unavailable.
    }
  }, [themeMode, fontSize]);

  const value = useMemo<AppSettings>(
    () => ({
      themeMode,
      fontSize,
      setThemeMode: setThemeModeState,
      setFontSize: setFontSizeState,
      resetSettings: () => {
        setThemeModeState(DEFAULT_THEME_MODE);
        setFontSizeState(DEFAULT_FONT_SIZE);
      },
    }),
    [fontSize, themeMode],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }

  return context;
}
