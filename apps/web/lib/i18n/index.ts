import IntlMessageFormat from 'intl-messageformat';
import { en } from './catalog/en.ts';
import { ja } from './catalog/ja.ts';
import { ko } from './catalog/ko.ts';
import { zhCN } from './catalog/zh-CN.ts';
import { zhTW } from './catalog/zh-TW.ts';
import { intlLocale, type Locale, type MessageKey, type MessageValues } from './types.ts';

export { intlLocale, localeOptions, normalizeLocale } from './types.ts';
export type {
  Locale,
  MessageKey,
  MessageValues,
  ResolvedTheme,
  ThemePreference,
} from './types.ts';

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja,
  ko,
};

const messageCache = new Map<string, IntlMessageFormat>();

function compiledMessage(locale: Locale, key: MessageKey, template: string): IntlMessageFormat {
  const cacheKey = `${locale}:${key}:${template}`;
  const cached = messageCache.get(cacheKey);
  if (cached) return cached;
  const message = new IntlMessageFormat(template, intlLocale(locale));
  messageCache.set(cacheKey, message);
  return message;
}

export function translate(locale: Locale, key: MessageKey, values?: MessageValues): string {
  const template = catalogs[locale][key] ?? en[key];
  try {
    return String(compiledMessage(locale, key, template).format(values));
  } catch {
    const fallback = en[key];
    return String(compiledMessage('en', key, fallback).format(values));
  }
}
