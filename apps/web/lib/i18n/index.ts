import { en } from './catalog/en.ts';
import { zhCN } from './catalog/zh-CN.ts';
import { zhTW } from './catalog/zh-TW.ts';
import type { Locale, MessageKey, MessageValues } from './types.ts';

export { intlLocale, localeOptions, normalizeLocale } from './types.ts';
export type { Locale, MessageKey, MessageValues, ThemePreference } from './types.ts';

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

export function translate(locale: Locale, key: MessageKey, values?: MessageValues): string {
  const template = catalogs[locale][key] ?? en[key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}
