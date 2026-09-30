import { en } from './catalog/en.ts';

export type Locale = 'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko';
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export type MessageKey = keyof typeof en;
export type MessageValues = Record<string, string | number | boolean | Date>;

export const localeOptions: Array<{ value: Locale; labelKey: MessageKey; shortLabel: string }> = [
  { value: 'en', labelKey: 'language.en', shortLabel: 'EN' },
  { value: 'zh-CN', labelKey: 'language.zhCN', shortLabel: '简' },
  { value: 'zh-TW', labelKey: 'language.zhTW', shortLabel: '繁' },
  { value: 'ja', labelKey: 'language.ja', shortLabel: '日' },
  { value: 'ko', labelKey: 'language.ko', shortLabel: '한' },
];

export function normalizeLocale(value?: string | null): Locale {
  const normalized = value?.toLowerCase();
  if (normalized === 'zh-tw' || normalized === 'zh-hk' || normalized?.startsWith('zh-hant')) {
    return 'zh-TW';
  }
  if (normalized === 'zh-cn' || normalized === 'zh-sg' || normalized?.startsWith('zh-hans') || normalized === 'zh') {
    return 'zh-CN';
  }
  if (normalized === 'ja' || normalized?.startsWith('ja-')) return 'ja';
  if (normalized === 'ko' || normalized?.startsWith('ko-')) return 'ko';
  return 'en';
}

export function intlLocale(locale: Locale): string {
  if (locale === 'zh-CN') return 'zh-Hans';
  if (locale === 'zh-TW') return 'zh-Hant';
  if (locale === 'ja') return 'ja-JP';
  if (locale === 'ko') return 'ko-KR';
  return 'en-GB';
}
