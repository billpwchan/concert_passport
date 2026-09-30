'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  intlLocale,
  translate,
  type Locale,
  type MessageKey,
  type MessageValues,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/i18n';

type PreferencesContextValue = {
  locale: Locale;
  theme: ResolvedTheme;
  appearance: ThemePreference;
  dateLocale: string;
  setLocale: (locale: Locale) => void;
  setAppearance: (appearance: ThemePreference) => void;
  t: (key: MessageKey, values?: MessageValues) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialAppearance: ThemePreference;
  initialResolvedTheme: ResolvedTheme;
}) {
  const [locale, updateLocale] = useState<Locale>(initialLocale);
  const appearance: ThemePreference = 'light';
  const theme: ResolvedTheme = 'light';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
    document.documentElement.dataset.script = locale === 'en' ? 'latin' : 'cjk';
    window.localStorage.setItem('cp_locale', locale);
    document.cookie = `cp_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  const setAppearance = useCallback(() => {}, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      locale,
      theme,
      appearance,
      dateLocale: intlLocale(locale),
      setLocale: updateLocale,
      setAppearance,
      t: (key, values) => translate(locale, key, values),
    }),
    [appearance, locale, setAppearance, theme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
