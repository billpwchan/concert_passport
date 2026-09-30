import { load } from 'cheerio';
/** Decode entities without interpreting artist/tour angle brackets as HTML tags. */
export function announcementText(value: string, max = 400): string {
  const text = value.replace(/<\/?(?:p|br|div|span|strong|em|b|i|a|ul|ol|li|h[1-6])(?:\s[^>]*)?\s*\/?>/gi,' ');
  return load(`<body>${text.replace(/</g,'&lt;')}</body>`).text().replace(/\s+/g,' ').trim().slice(0,max);
}
