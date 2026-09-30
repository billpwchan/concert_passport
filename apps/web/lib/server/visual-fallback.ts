import { createHash } from 'node:crypto';

const PALETTES = [
  ['#725cff', '#ff315f', '#c9fbff'],
  ['#ff5f3d', '#ffd84d', '#6e40ff'],
  ['#00a6a6', '#b7fff1', '#ff4f91'],
  ['#a53dff', '#ff89c9', '#75e8ff'],
  ['#0759c7', '#61dafb', '#ffcf56'],
] as const;

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]!);
}

function titleLines(value: string): string[] {
  const compact = value.trim().replace(/\s+/g, ' ');
  if (compact.length <= 14) return [compact];
  const words = compact.split(' ');
  if (words.length === 1) return [compact.slice(0, 14), compact.slice(14, 28)];
  const lines = ['', ''];
  for (const word of words) {
    const target = lines[0].length <= lines[1].length ? 0 : 1;
    lines[target] = `${lines[target]} ${word}`.trim();
  }
  return lines.filter(Boolean);
}

export function fallbackVisualResponse(input: {
  artist: string;
  market?: string;
  city?: string;
  localDate?: string;
}): Response {
  const digest = createHash('sha256').update(input.artist).digest();
  const [primary, secondary, accent] = PALETTES[digest[0] % PALETTES.length];
  const lines = titleLines(input.artist).map(escapeXml);
  const fontSize = lines.some((line) => line.length > 12) ? 154 : 205;
  const detail = escapeXml([input.city, input.market, input.localDate].filter(Boolean).join('  ·  '));
  const title = lines.map((line, index) => (
    `<text x="92" y="${690 + index * 162}" class="title" font-size="${fontSize}">${line}</text>`
  )).join('');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200" role="img" aria-label="${escapeXml(input.artist)} Concert Passport visual">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${primary}"/><stop offset=".48" stop-color="#0a0910"/><stop offset="1" stop-color="${secondary}"/></linearGradient>
        <radialGradient id="light"><stop stop-color="${accent}" stop-opacity=".88"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
        <filter id="grain"><feTurbulence baseFrequency=".72" numOctaves="3" seed="${digest[1]}"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .16 0"/></filter>
        <style>.meta{font:800 22px Arial,sans-serif;letter-spacing:7px}.title{font:950 180px Arial,sans-serif;letter-spacing:-12px;fill:#f6f2ea}.micro{font:700 17px Arial,sans-serif;letter-spacing:4px}</style>
      </defs>
      <rect width="1600" height="1200" fill="url(#bg)"/>
      <ellipse cx="1220" cy="210" rx="590" ry="470" fill="url(#light)" opacity=".56"/>
      <path d="M-80 920 C380 650 710 1070 1680 500" fill="none" stroke="${accent}" stroke-width="3" opacity=".5"/>
      <path d="M-60 980 C470 700 850 1050 1660 630" fill="none" stroke="#fff" stroke-width="1" opacity=".26"/>
      <g opacity=".32">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 145 - 60} 0L${i * 145 + 480} 1200" stroke="#fff"/>`).join('')}</g>
      <circle cx="1305" cy="290" r="168" fill="none" stroke="#fff" stroke-width="2" opacity=".42"/>
      <circle cx="1305" cy="290" r="136" fill="none" stroke="#fff" stroke-dasharray="8 14" opacity=".52"/>
      <text x="1305" y="275" text-anchor="middle" class="meta" fill="#fff">CP—LIVE</text>
      <text x="1305" y="316" text-anchor="middle" class="micro" fill="#fff">MEMORY IN MOTION</text>
      <text x="92" y="92" class="meta" fill="#fff">CONCERT PASSPORT</text>
      <text x="1508" y="92" text-anchor="end" class="micro" fill="#fff">VISUAL / VERIFIED FALLBACK</text>
      ${title}
      <text x="96" y="1092" class="meta" fill="${accent}">${detail || 'UPCOMING PERFORMANCE'}</text>
      <text x="1508" y="1092" text-anchor="end" class="micro" fill="#fff">NO. ${digest.subarray(0, 4).toString('hex').toUpperCase()}</text>
      <rect width="1600" height="1200" filter="url(#grain)" opacity=".36"/>
    </svg>`;
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      'x-content-type-options': 'nosniff',
      'x-concert-passport-media': 'brand-fallback',
    },
  });
}
