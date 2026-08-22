'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  intlLocale,
  translate,
  type Locale,
  type MessageKey,
  type MessageValues,
  type ThemePreference,
} from '@/lib/i18n';

type PreferencesContextValue = {
  locale: Locale;
  theme: ThemePreference;
  dateLocale: string;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemePreference) => void;
  t: (key: MessageKey, values?: MessageValues) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  children,
  initialLocale,
  initialTheme,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialTheme: ThemePreference;
}) {
  const [locale, updateLocale] = useState<Locale>(initialLocale);
  const [theme, updateTheme] = useState<ThemePreference>(initialTheme);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
    window.localStorage.setItem('cp_locale', locale);
    document.cookie = `cp_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('cp_theme', theme);
    document.cookie = `cp_theme=${theme}; path=/; max-age=31536000; samesite=lax`;
  }, [theme]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      locale,
      theme,
      dateLocale: intlLocale(locale),
      setLocale: updateLocale,
      setTheme: updateTheme,
      t: (key, values) => translate(locale, key, values),
    }),
    [locale, theme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
