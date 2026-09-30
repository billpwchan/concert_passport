/** Read public serialized content as data; never execute third-party scripts. */
type Row = Record<string, unknown>;
function balancedObject(input: string, start: number): string | undefined {
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < Math.min(input.length, start + 400000); i++) {
    const c = input[i];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return input.slice(start, i + 1);
  }
}
export function liveNationRows(html: string): Row[] {
  let stream = '';
  for (const match of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\);?<\/script>/g)) {
    try { const frame = JSON.parse(match[1]); if (frame[0] === 1 && typeof frame[1] === 'string') stream += frame[1]; } catch { /* not a data frame */ }
  }
  const found = new Map<string, Row>(); let examined = 0;
  for (const match of stream.matchAll(/\{\s*"id"\s*:/g)) {
    if (++examined > 2500) break;
    const raw = balancedObject(stream, match.index); if (!raw) continue;
    try { const row = JSON.parse(raw); if (row.eventDate && row.name && row.venue && row.url && !row.isDeleted) found.set(String(row.id), row); } catch { /* incomplete streaming frame */ }
  }
  return [...found.values()];
}
export function liveNationNodes(html: string, pageUrl: string): Row[] {
  return liveNationRecordsToNodes(liveNationRows(html),pageUrl);
}
export function liveNationRecordsToNodes(rows: Row[], pageUrl: string): Row[] {
  return rows.filter(row=>!row.isDeleted && row.venue && row.eventDate && row.url).map(row => {
    const venue = row.venue as Row;
    const lineup = Array.isArray(row.lineup) ? row.lineup as Row[] : [];
    const performer = lineup.find(artist => artist.isPrimary) ?? lineup[0];
    const tickets = Array.isArray(row.tickets) ? row.tickets as Row[] : [];
    const sale = tickets.find(ticket => ticket.isVisible && (ticket.type === 'General Onsale' || ticket.typeId === 2));
    // eventDate is a local calendar day disguised as UTC; eventSortDateUtc is a sorting placeholder.
    // Only showTime + eventDateUtc establishes a concrete performance time.
    const start = row.showTime && /^\d{1,2}:\d{2}$/.test(String(row.showTime)) && row.eventDateUtc
      ? row.eventDateUtc : String(row.eventDate).slice(0, 10);
    const url = new URL(pageUrl).pathname.includes(`edp${row.id}`) ? pageUrl : String(row.url);
    return { '@type': 'MusicEvent', '@id': new URL(`/show/${row.id}`, pageUrl).toString(), url,
      name: row.name, startDate: start, image: row.image, description: row.mainEventInformation,
      performer: performer ? { '@type': 'PerformingGroup', name: performer.name } : undefined,
      _ticketmasterArtistId: performer?.tmId, _ianaTimeZone: row.ianaTimeZone, _dateRangeEnd: String(row.eventDateTo ?? row.eventDate).slice(0,10),
      location: { '@type': 'Place', name: venue.name, address: { addressLocality: venue.city, addressCountry: venue.country } },
      offers: sale ? { validFrom: sale.validFromUtc, priceCurrency: sale.currencyCode,
        price: Number(sale.priceFrom) > 0 ? String(sale.priceFrom) : undefined, url: sale.ticketUrl || undefined } : undefined,
      // Textual cancellation notices need review; never decode undocumented numeric status enums.
    };
  });
}
const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
export function thaiTicketPerformances(html: string, node: Row, pageUrl: string): Row[] {
  const rounds: Row[] = [];
  const parts = html.split(/<div\s+class="date">/).slice(1);
  for (const part of parts) {
    const date = part.slice(0, part.indexOf('</div>')).replace(/<[^>]*>/g, '');
    const match = date.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
    if (!match) continue;
    const month = thaiMonths.indexOf(match[2]) + 1, year = Number(match[3]) - 543;
    if (!month || year < 2020 || year > 2100) continue;
    const row = part.split(/<div\s+class="row">/)[0];
    for (const time of row.matchAll(/rdId=(\d+)[\s\S]*?<span\s+class="item-show">(\d{2}:\d{2})<\/span>/g)) {
      rounds.push({ ...node, '@id': `${pageUrl}#round-${time[1]}`, startDate: `${year}-${String(month).padStart(2,'0')}-${match[1].padStart(2,'0')}T${time[2]}:00+07:00`, endDate: undefined });
    }
  }
  return rounds.length ? rounds : [node];
}
