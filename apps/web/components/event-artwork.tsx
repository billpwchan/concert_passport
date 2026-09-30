'use client';

import Image from 'next/image';
import { useState } from 'react';

export function EventArtwork({ src, name, market, priority = false, sizes = '(max-width: 760px) 100vw, 420px' }: {
  src?: string; name: string; market?: string; priority?: boolean; sizes?: string;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const hash = [...name].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  return <div className="event-artwork" style={{ '--art-hue': `${hash % 90 + 185}` } as React.CSSProperties}>
    <div className="artwork-fallback" aria-hidden="true"><span>LIVE / {market ?? 'ASIA PACIFIC'}</span><strong>{name}</strong><i>CONCERT PASSPORT ↗</i></div>
    {src && failedSource !== src ? <Image src={src} alt="" fill sizes={sizes} priority={priority} unoptimized={src.startsWith('/api/')}
      onError={() => setFailedSource(src)} /> : null}
  </div>;
}
