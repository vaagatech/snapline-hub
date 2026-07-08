import { useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type FontPreference = 'system' | 'serif' | 'mono';

const THEME_KEY = 'snapline-hub-theme';
const FONT_KEY = 'snapline-hub-font';

function readTheme(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function readFont(): FontPreference {
  const stored = localStorage.getItem(FONT_KEY);
  if (stored === 'serif' || stored === 'mono' || stored === 'system') return stored;
  return 'system';
}

function applyPreferences(theme: ThemePreference, font: FontPreference) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.font = font;
}

export function initPreferences() {
  applyPreferences(readTheme(), readFont());
}

export function usePreferences() {
  const [theme, setThemeState] = useState<ThemePreference>(readTheme);
  const [font, setFontState] = useState<FontPreference>(readFont);

  useEffect(() => {
    applyPreferences(theme, font);
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(FONT_KEY, font);
  }, [theme, font]);

  return {
    theme,
    font,
    setTheme: setThemeState,
    setFont: setFontState,
  };
}
