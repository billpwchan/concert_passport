export type CoreArtist = {
  id: string;
  name: string;
  query: string;
  aliases?: string[];
};

export const coreArtists: CoreArtist[] = [
  { id: 'bts', name: 'BTS', query: 'BTS' },
  { id: 'blackpink', name: 'BLACKPINK', query: 'BLACKPINK' },
  { id: 'bigbang', name: 'BIGBANG', query: 'BIGBANG' },
  { id: '2ne1', name: '2NE1', query: '2NE1' },
  { id: 'twice', name: 'TWICE', query: 'TWICE' },
  { id: 'seventeen', name: 'SEVENTEEN', query: 'SEVENTEEN' },
  { id: 'stray-kids', name: 'Stray Kids', query: 'Stray Kids' },
  { id: 'enhypen', name: 'ENHYPEN', query: 'ENHYPEN' },
  { id: 'txt', name: 'TOMORROW X TOGETHER', query: 'TOMORROW X TOGETHER', aliases: ['TXT'] },
  { id: 'ateez', name: 'ATEEZ', query: 'ATEEZ' },
  { id: 'aespa', name: 'aespa', query: 'aespa' },
  { id: 'ive', name: 'IVE', query: 'IVE' },
  { id: 'le-sserafim', name: 'LE SSERAFIM', query: 'LE SSERAFIM' },
  { id: 'newjeans', name: 'NewJeans', query: 'NewJeans' },
  { id: 'katseye', name: 'KATSEYE', query: 'KATSEYE' },
  { id: 'illit', name: 'ILLIT', query: 'ILLIT' },
  { id: 'babymonster', name: 'BABYMONSTER', query: 'BABYMONSTER' },
  { id: 'treasure', name: 'TREASURE', query: 'TREASURE' },
  { id: 'idle', name: 'i-dle', query: 'i-dle', aliases: ['(G)I-DLE', 'I-DLE'] },
  { id: 'itzy', name: 'ITZY', query: 'ITZY' },
  { id: 'nmixx', name: 'NMIXX', query: 'NMIXX' },
  { id: 'stayc', name: 'STAYC', query: 'STAYC' },
  { id: 'dreamcatcher', name: 'Dreamcatcher', query: 'Dreamcatcher' },
  { id: 'mamamoo', name: 'MAMAMOO', query: 'MAMAMOO' },
  { id: 'kiss-of-life', name: 'KISS OF LIFE', query: 'KISS OF LIFE' },
  { id: 'red-velvet', name: 'Red Velvet', query: 'Red Velvet' },
  { id: 'nct-127', name: 'NCT 127', query: 'NCT 127' },
  { id: 'nct-dream', name: 'NCT DREAM', query: 'NCT DREAM' },
  { id: 'nct-wish', name: 'NCT WISH', query: 'NCT WISH' },
  { id: 'wayv', name: 'WayV', query: 'WayV' },
  { id: 'monsta-x', name: 'MONSTA X', query: 'MONSTA X' },
  { id: 'got7', name: 'GOT7', query: 'GOT7' },
  { id: 'super-junior', name: 'SUPER JUNIOR', query: 'SUPER JUNIOR' },
  { id: 'tvxq', name: 'TVXQ!', query: 'TVXQ', aliases: ['TVXQ'] },
  { id: 'riize', name: 'RIIZE', query: 'RIIZE' },
  { id: 'exo', name: 'EXO', query: 'EXO' },
  { id: 'shinee', name: 'SHINee', query: 'SHINee' },
  { id: 'day6', name: 'DAY6', query: 'DAY6' },
  { id: 'xdinary-heroes', name: 'Xdinary Heroes', query: 'Xdinary Heroes' },
  { id: 'the-rose', name: 'The Rose', query: 'The Rose' },
  { id: 'kard', name: 'KARD', query: 'KARD' },
  { id: 'zerobaseone', name: 'ZEROBASEONE', query: 'ZEROBASEONE' },
  { id: 'boynextdoor', name: 'BOYNEXTDOOR', query: 'BOYNEXTDOOR' },
  { id: 'tws', name: 'TWS', query: 'TWS' },
  { id: 'the-boyz', name: 'THE BOYZ', query: 'THE BOYZ' },
  { id: 'p1harmony', name: 'P1Harmony', query: 'P1Harmony' },
  { id: 'xikers', name: 'xikers', query: 'xikers' },
  { id: 'cravity', name: 'CRAVITY', query: 'CRAVITY' },
  { id: 'hearts2hearts', name: 'Hearts2Hearts', query: 'Hearts2Hearts' },
  { id: 'meovv', name: 'MEOVV', query: 'MEOVV' },
  { id: 'izna', name: 'izna', query: 'izna' },
  { id: 'kep1er', name: 'Kep1er', query: 'Kep1er' },
  { id: 'kiiikiii', name: 'KiiiKiii', query: 'KiiiKiii' },
  { id: 'all-day-project', name: 'ALLDAY PROJECT', query: 'ALLDAY PROJECT' },
  { id: 'iu', name: 'IU', query: 'IU' },
  { id: 'taeyeon', name: 'TAEYEON', query: 'TAEYEON' },
  { id: 'boa', name: 'BoA', query: 'BoA' },
  { id: 'taemin', name: 'TAEMIN', query: 'TAEMIN' },
  { id: 'key', name: 'KEY', query: 'KEY SHINee', aliases: ['KEY'] },
  { id: 'onew', name: 'ONEW', query: 'ONEW' },
  { id: 'baekhyun', name: 'BAEKHYUN', query: 'BAEKHYUN' },
  { id: 'kai', name: 'KAI', query: 'KAI EXO', aliases: ['KAI'] },
  { id: 'chen', name: 'CHEN', query: 'CHEN EXO', aliases: ['CHEN'] },
  { id: 'd-o', name: 'D.O.', query: 'D.O. EXO', aliases: ['D.O.'] },
  { id: 'j-hope', name: 'j-hope', query: 'j-hope' },
  { id: 'suga', name: 'SUGA', query: 'SUGA' },
  { id: 'rm', name: 'RM', query: 'RM BTS', aliases: ['RM'] },
  { id: 'jungkook', name: 'Jung Kook', query: 'Jung Kook', aliases: ['Jungkook'] },
  { id: 'jimin', name: 'Jimin', query: 'Jimin BTS', aliases: ['Jimin'] },
  { id: 'v', name: 'V', query: 'V BTS', aliases: ['V'] },
  { id: 'jin', name: 'Jin', query: 'Jin BTS', aliases: ['Jin'] },
  { id: 'g-dragon', name: 'G-DRAGON', query: 'G-DRAGON' },
  { id: 'bibi', name: 'BIBI', query: 'BIBI' },
  { id: 'jay-park', name: 'Jay Park', query: 'Jay Park' },
  { id: 'epik-high', name: 'Epik High', query: 'Epik High' },
  { id: 'jackson-wang', name: 'Jackson Wang', query: 'Jackson Wang' },
];

export const coreArtistSearchNames = new Set(
  coreArtists.flatMap((artist) => [artist.name, artist.query, ...(artist.aliases ?? [])])
    .map((name) => name.toLocaleLowerCase('en-US')),
);

export function getCoreArtistBatch(now = Date.now(), requestedBatch?: number, size = 6): CoreArtist[] {
  const totalBatches = Math.ceil(coreArtists.length / size);
  const scheduledBatch = Math.floor(now / (20 * 60_000)) % totalBatches;
  const batch = requestedBatch === undefined
    ? scheduledBatch
    : Math.max(0, Math.min(totalBatches - 1, Math.trunc(requestedBatch)));
  return coreArtists.slice(batch * size, batch * size + size);
}

export function coreArtistBatchCount(size = 6): number {
  return Math.ceil(coreArtists.length / size);
}

export function canonicalCoreArtistName(value: string): string | undefined {
  const normalized = value.toLocaleLowerCase('en-US').trim();
  return coreArtists.find((artist) => (
    [artist.name, artist.query, ...(artist.aliases ?? [])]
      .some((candidate) => candidate.toLocaleLowerCase('en-US') === normalized)
  ))?.name;
}
