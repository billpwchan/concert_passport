import { ImageResponse } from 'next/og';
import { editorialShows } from '@/lib/editorial/spotlights';

export const alt = 'Concert Passport show card';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage({ params }: { params: Promise<{ showId: string }> }) {
  const { showId } = await params;
  const show = editorialShows.find((item) => item.id === showId);
  const artist = show?.artist ?? 'Concert Passport';
  const city = show?.city ?? 'Asia';
  const date = show?.dateLabel ?? 'UPCOMING';
  return new ImageResponse(
    <div style={{
      display: 'flex', width: '100%', height: '100%', padding: 64,
      flexDirection: 'column', justifyContent: 'space-between',
      background: 'linear-gradient(135deg,#08080b 0%,#18152b 58%,#ff315f 140%)',
      color: '#f4f4ef', fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, letterSpacing: 4 }}>
        <span>CONCERT PASSPORT</span><span>{show?.market ?? 'CP'}°</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: '#c9fbff', fontSize: 24, letterSpacing: 5 }}>{city.toUpperCase()} · {date}</span>
        <span style={{ marginTop: 18, fontSize: artist.length > 10 ? 112 : 154, fontWeight: 900, letterSpacing: -9, lineHeight: .82 }}>{artist}</span>
        <span style={{ marginTop: 32, maxWidth: 980, fontSize: 30, fontWeight: 700 }}>{show?.tour ?? 'Keep the night.'}</span>
      </div>
    </div>,
    size,
  );
}
