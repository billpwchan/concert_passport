import { load } from 'cheerio';
import type { CollectionSource } from './manifest.ts';
import { permittedPage } from './manifest.ts';

/** HTML is parsed only; page scripts and external XML entities are never executed. */
export function sitemapLinks(xml: string, source: CollectionSource): Array<{url: string; kind: 'sitemap' | 'event'}> {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('unsupported_xml_declaration');
  const $ = load(xml, { xml: true });
  const isIndex = $('sitemapindex').length === 1;
  if (!isIndex && $('urlset').length !== 1) throw new Error('Invalid sitemap schema');
  const links = new Map<string, {url: string; kind: 'sitemap' | 'event'}>();
  $(isIndex ? 'sitemapindex > sitemap > loc' : 'urlset > url > loc').slice(0, 1000).each((_, element) => {
    const url = permittedPage($(element).text().trim(), source);
    if (!url) return;
    const pathname = new URL(url).pathname;
    if (isIndex && /\.xml$/i.test(pathname)) links.set(url, {url, kind: 'sitemap'});
    else if (!isIndex && source.eventPath.test(pathname)) links.set(url, {url, kind: 'event'});
  });
  return [...links.values()];
}

function singaporeTimestamp(date: string, time: string): string | undefined {
  const match = date.match(/^(?:\w+,\s*)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})$/i);
  const clock = time.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match || !clock) return;
  const month = ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(match[1].toLowerCase()) + 1;
  const day = Number(match[2]), year = Number(match[3]), hour = Number(clock[1]), minute = Number(clock[2]);
  if (hour < 1 || hour > 12 || minute > 59 || year < 2020 || year > 2100) return;
  const localDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsedDate = new Date(`${localDate}T00:00:00Z`);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== localDate) return;
  return `${localDate}T${String(hour % 12 + (clock[3].toLowerCase() === 'pm' ? 12 : 0)).padStart(2, '0')}:${clock[2]}:00+08:00`;
}

/** The Star's server-rendered Webflow event template. No page-wide date guessing. */
export function starVenueNodes(html: string, pageUrl: string): Array<Record<string, unknown>> {
  if (new URL(pageUrl).hostname !== 'www.thestar.sg' || !new URL(pageUrl).pathname.startsWith('/events/')) return [];
  const $ = load(html);
  $('.w-condition-invisible, [hidden], script, style, template').remove();
  const name = $('h1.event-header').text().trim();
  const schedule = $('.event-sidebar .event-start-and-end-date');
  if (!name || schedule.length !== 1) return [];
  const parts = schedule.find('.event-detail-part');
  const dateLabel = parts.first().find('.event-detail-subheader').text().trim();
  // Ranges need an explicit per-performance parser; never turn Start/End into invented shows.
  if (dateLabel !== 'Date') return [];
  const date = parts.first().find('.event-detail-value').text().trim();
  const timePart = parts.filter((_, element) => /^Time:?$/i.test($(element).find('.event-detail-subheader').text().trim()));
  const startsAt = singaporeTimestamp(date, timePart.find('.event-detail-value').text().trim());
  const venuePart = $('.event-sidebar .event-detail').filter((_, element) => $(element).find('.event-detail-header').text().trim() === 'Venue');
  const venue = venuePart.find('.event-detail-value').text().trim();
  if (!startsAt || !venue) return [];
  const image = $('.event-hero img').first().attr('src');
  const ticketUrl = $('.event-main > a').filter((_, element) => /buy tickets|book\s+now/i.test($(element).text())).first().attr('href');
  return [{
    '@type': 'MusicEvent', '@id': pageUrl, url: pageUrl, name, startDate: startsAt,
    _ianaTimeZone: 'Asia/Singapore', image,
    location: {name: venue, address: {addressLocality: 'Singapore', addressCountry: 'SG'}},
    offers: ticketUrl ? {url: ticketUrl} : undefined,
  }];
}
