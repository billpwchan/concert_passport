import type { DiscoveredEvent } from './types.ts';
const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
// RFC 5545 folding counts UTF-8 bytes, not JavaScript characters.
function fold(line: string): string {
  const lines: string[] = []; let current = ''; let size = 0;
  for (const char of line) { const bytes = new TextEncoder().encode(char).length;
    if (size + bytes > 75) { lines.push(current); current = ' '; size = 1; }
    current += char; size += bytes;
  }
  return [...lines, current].join('\r\n');
}
export function eventCalendar(event: DiscoveredEvent & { id: string }, now = new Date()): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Concert Passport//Shows//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${escape(event.id)}@concert-passport`, `DTSTAMP:${stamp(now.toISOString())}`,
    `DTSTART:${stamp(event.startsAt)}`, `SUMMARY:${escape(event.name)}`, `LOCATION:${escape([event.venue, event.city, event.countryCode].filter(Boolean).join(', '))}`,
    'DESCRIPTION:Saved snapshot. Check Concert Passport and the official source for updates.', 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
