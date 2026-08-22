'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
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
  const themeTimer = useRef<number | undefined>(undefined);

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

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    window.clearTimeout(themeTimer.current);
    const root = document.documentElement;
    const commitTheme = () => {
      root.dataset.theme = nextTheme;
      root.style.colorScheme = nextTheme;
      flushSync(() => updateTheme(nextTheme));
    };
    const viewTransitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commitTheme();
      return;
    }

    if (viewTransitionDocument.startViewTransition) {
      root.classList.add('theme-transitioning');
      const transition = viewTransitionDocument.startViewTransition(commitTheme);
      void transition.finished.finally(() => root.classList.remove('theme-transitioning'));
      return;
    }

    root.classList.add('theme-transitioning-fallback');
    commitTheme();
    themeTimer.current = window.setTimeout(() => {
      root.classList.remove('theme-transitioning-fallback');
    }, 320);
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      locale,
      theme,
      dateLocale: intlLocale(locale),
      setLocale: updateLocale,
      setTheme,
      t: (key, values) => translate(locale, key, values),
    }),
    [locale, setTheme, theme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
