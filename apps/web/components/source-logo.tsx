'use client';

import Image from 'next/image';
import { useState } from 'react';

export function SourceLogo({ host, name, size = 36 }: { host: string; name: string; size?: number }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <span className="source-logo" style={{ width: size, height: size }}>
      <Image
        src={`/api/v1/sources/${encodeURIComponent(host)}/logo?v=4&attempt=${attempt}`}
        alt=""
        width={size}
        height={size}
        unoptimized
        onError={() => {
          if (attempt < 2) window.setTimeout(() => setAttempt((current) => current + 1), 250);
        }}
      />
      <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
    </span>
  );
}
