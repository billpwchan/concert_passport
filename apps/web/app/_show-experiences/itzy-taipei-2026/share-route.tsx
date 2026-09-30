import { ImageResponse } from 'next/og';
import { experienceAssets } from './assets';

export const runtime = 'nodejs';

const ratios = {
  story: { width: 1080, height: 1920 },
  xiaohongshu: { width: 1200, height: 1600 },
  square: { width: 1200, height: 1200 },
} as const;

type Ratio = keyof typeof ratios;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requested = requestUrl.searchParams.get('ratio');
  const ratio: Ratio = requested && requested in ratios ? requested as Ratio : 'xiaohongshu';
  const { width, height } = ratios[ratio];
  const compact = ratio === 'square';
  const internalPort = process.env.PORT || requestUrl.port || '3000';
  const tourHero = new URL(experienceAssets.tourHeroShare, `http://127.0.0.1:${internalPort}`).href;

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: '#08090c',
          color: '#f7f7f2',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={tourHero}
          width={width}
          height={height}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: compact ? 'center 46%' : '48% center',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: 'linear-gradient(145deg, rgba(201,251,255,.06), rgba(8,9,12,.02) 42%, rgba(255,49,95,.54)), linear-gradient(0deg, rgba(3,3,5,.88), rgba(3,3,5,0) 58%)',
          }}
        />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '8%', display: 'flex', width: 2, background: 'rgba(255,255,255,.42)' }} />
        <div style={{ position: 'absolute', top: '11%', left: '-6%', display: 'flex', width: '72%', height: 18, background: '#c9fbff', opacity: .7, transform: 'rotate(-3deg)' }} />
        <div style={{ position: 'absolute', right: '-5%', bottom: compact ? '31%' : '24%', display: 'flex', width: '58%', height: 24, background: '#ff315f', opacity: .78, transform: 'rotate(4deg)' }} />

        <div
          style={{
            position: 'absolute',
            top: compact ? 62 : 76,
            right: compact ? 64 : 72,
            left: compact ? 64 : 72,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: compact ? 17 : 19,
            fontWeight: 800,
            letterSpacing: '.14em',
            color: '#08090c',
          }}
        >
          <span>CONCERT PASSPORT / MY SHOW</span>
          <span>CP—TPE</span>
        </div>

        <div
          style={{
            position: 'absolute',
            top: compact ? 205 : 260,
            left: compact ? 50 : 58,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ marginLeft: 16, color: '#c9fbff', fontSize: compact ? 19 : 21, fontWeight: 900, letterSpacing: '.2em' }}>MY NEXT SHOW</span>
          <span style={{ marginTop: 4, color: '#08090c', fontSize: compact ? 250 : 300, fontWeight: 900, letterSpacing: '-.115em', lineHeight: .82 }}>ITZY</span>
          <span
            style={{
              marginTop: compact ? 8 : 22,
              marginLeft: 22,
              color: '#08090c',
              fontSize: compact ? 75 : 96,
              fontWeight: 900,
              letterSpacing: '-.07em',
              lineHeight: .78,
              opacity: .94,
            }}
          >
            TUNNEL<br />VISION
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            right: compact ? 74 : 86,
            bottom: compact ? 155 : 205,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <span style={{ fontSize: compact ? 210 : 260, fontWeight: 900, letterSpacing: '-.11em', lineHeight: .66 }}>05</span>
          <span style={{ marginLeft: 20, marginBottom: 6, color: '#ff315f', fontSize: compact ? 22 : 27, fontWeight: 900, letterSpacing: '.14em', lineHeight: 1.1 }}>SEP<br />2026</span>
        </div>

        <div
          style={{
            position: 'absolute',
            right: compact ? 64 : 72,
            bottom: compact ? 55 : 66,
            left: compact ? 64 : 72,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: compact ? 15 : 18,
            fontWeight: 800,
            letterSpacing: '.13em',
          }}
        >
          <span>TAIPEI ARENA</span>
          <span>25.0514° N / 121.5497° E</span>
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Content-Disposition': `inline; filename="concert-passport-itzy-${ratio}.png"`,
      },
    },
  );
}
