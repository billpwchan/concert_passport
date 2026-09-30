export const ambiguousArtistNames = new Set([
  'alice', 'as one', 'belle', 'chen', 'dawn', 'drop', 'fia', 'haee', 'henry', 'i', 'jay',
  'jia', 'kai', 'key', 'moon', 'rain', 'saturday', 'shannon', 'sun', 'sunny', 'toy',
  'us', 'v', 'solar', 'hana', 'lucy',
]);

export function isAmbiguousArtistName(value: string): boolean {
  const normalized = value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return ambiguousArtistNames.has(normalized);
}
