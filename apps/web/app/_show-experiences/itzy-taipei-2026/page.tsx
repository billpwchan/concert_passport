'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { useRef, useState } from 'react';
import { experienceAssets, experienceSources } from './assets';
import styles from './page.module.css';

const StageField = dynamic(
  () => import('./stage-field').then((module) => module.StageField),
  { ssr: false },
);

type ShareRatio = 'story' | 'xiaohongshu' | 'square';

const shareRatios: Array<{ id: ShareRatio; label: string; size: string }> = [
  { id: 'story', label: 'Story', size: '9:16' },
  { id: 'xiaohongshu', label: '小红书', size: '3:4' },
  { id: 'square', label: 'Post', size: '1:1' },
];

const tourStops = [
  { city: 'KAOHSIUNG', date: '27 JUN', x: 151, y: 305, code: 'KHH', state: 'PAST' },
  { city: 'TAIPEI', date: '05 SEP', x: 344, y: 185, code: 'TPE', state: 'NEXT' },
  { city: 'LONDON', date: '11 SEP', x: 554, y: 265, code: 'LON', state: '13 DAYS' },
  { city: 'AMSTERDAM', date: '13 SEP', x: 702, y: 124, code: 'AMS', state: '15 DAYS' },
  { city: 'PARIS', date: '15 SEP', x: 824, y: 286, code: 'PAR', state: '17 DAYS' },
  { city: 'FRANKFURT', date: '17 SEP', x: 925, y: 170, code: 'FRA', state: '19 DAYS' },
] as const;

const springTransition = { type: 'spring', stiffness: 150, damping: 24, mass: 0.8 } as const;

function daysUntilTaipeiShow(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const today = Date.parse(`${read('year')}-${read('month')}-${read('day')}T00:00:00+08:00`);
  const showDay = Date.parse('2026-09-05T00:00:00+08:00');
  return Math.max(0, Math.round((showDay - today) / 86_400_000));
}

function MagneticSaveButton({ eventId, initialSaved }: { eventId?: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  if (!eventId) return null;

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch('/api/v1/plans', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (response.ok) setSaved(!saved);
    } finally {
      setPending(false);
    }
  }

  return (
    <motion.button
      type="button"
      className={`${styles.saveButton} ${saved ? styles.saved : ''}`}
      onClick={() => void toggle()}
      disabled={pending}
      whileTap={{ scale: 0.96 }}
      aria-pressed={saved}
    >
      <span>{saved ? '已保存' : '保存这场'}</span>
      <i aria-hidden="true">{saved ? '✓' : '＋'}</i>
    </motion.button>
  );
}

function AssetCard({
  className,
  image,
  index,
  label,
  title,
}: {
  className: string;
  image: string;
  index: string;
  label: string;
  title: string;
}) {
  return (
    <motion.article
      className={`${styles.assetCard} ${className}`}
      initial={{ opacity: 0, y: 80, rotate: 2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={springTransition}
    >
      <div
        className={styles.assetImage}
        style={{ backgroundImage: `url("${image}")` }}
        role="img"
        aria-label={title}
      />
      <span className={styles.assetIndex}>{index}</span>
      <div className={styles.assetCaption}>
        <small>{label}</small>
        <strong>{title}</strong>
      </div>
    </motion.article>
  );
}

function TourSignal() {
  const [activeIndex, setActiveIndex] = useState(1);
  const active = tourStops[activeIndex];

  return (
    <section className={styles.tourSection} id="tour">
      <div className={styles.sectionHeading}>
        <span>02 / 3RD WORLD TOUR</span>
        <h2>TAIPEI<br />→ EUROPE</h2>
      </div>

      <div className={styles.tourCanvas}>
        <div className={styles.mapMeta}>
          <span>ITZY 3RD WORLD TOUR</span>
          <span>ASIA → EUROPE / 2026</span>
        </div>
        <svg viewBox="0 0 1080 440" aria-hidden="true" preserveAspectRatio="none">
          <defs>
            <linearGradient id="route-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#c9fbff" />
              <stop offset="0.42" stopColor="#ffffff" />
              <stop offset="1" stopColor="#ff315f" />
            </linearGradient>
            <filter id="route-glow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path className={styles.mapGridLine} d="M20 98 H1060 M20 220 H1060 M20 342 H1060" />
          <motion.path
            className={styles.tourPath}
            d="M45 365 C180 356 216 128 344 185 S456 325 554 265 S615 86 702 124 S741 324 824 286 S864 118 1018 198"
            fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.circle
            cx={active.x}
            cy={active.y}
            initial={{ cx: active.x, cy: active.y }}
            animate={{ cx: active.x, cy: active.y }}
            transition={springTransition}
            r="9"
            fill="#ff315f"
            filter="url(#route-glow)"
          />
          {tourStops.map((stop, index) => (
            <g key={stop.city} transform={`translate(${stop.x} ${stop.y})`}>
              <circle r="3.5" fill={index <= activeIndex ? '#f5f4ef' : '#4b4c51'} />
              <text x="0" y={index % 2 === 0 ? -17 : 25}>{stop.code}</text>
            </g>
          ))}
        </svg>

        <div className={styles.activeStop}>
          <span>{String(activeIndex + 1).padStart(2, '0')} / {String(tourStops.length).padStart(2, '0')}</span>
          <strong>{active.city}</strong>
          <time>{active.date} · 2026</time>
          <small>{active.state}</small>
        </div>

        <div className={styles.stopSelector} role="list" aria-label="巡演城市">
          {tourStops.map((stop, index) => (
            <button
              type="button"
              role="listitem"
              className={activeIndex === index ? styles.activeCity : ''}
              key={stop.city}
              onClick={() => setActiveIndex(index)}
            >
              <small>{stop.date}</small>
              <strong>{stop.city}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShareStudio() {
  const [ratio, setRatio] = useState<ShareRatio>('xiaohongshu');

  return (
    <section className={styles.shareSection} id="share">
      <div className={styles.shareCopy}>
        <span>03 / YOUR COVER</span>
        <h2>05 SEP<br />TAIPEI</h2>
        <p>Story、小红书或方形动态。</p>

        <div className={styles.ratioPicker} aria-label="分享图片比例">
          {shareRatios.map((option) => (
            <button
              key={option.id}
              type="button"
              className={ratio === option.id ? styles.activeRatio : ''}
              onClick={() => setRatio(option.id)}
              aria-pressed={ratio === option.id}
            >
              <span>{option.label}</span>
              <small>{option.size}</small>
            </button>
          ))}
        </div>

        <a
          className={styles.exportLink}
          href={`/shows/itzy-taipei-2026/share?ratio=${ratio}`}
          target="_blank"
          rel="noreferrer"
        >
          打开高清成品 <span>↗</span>
        </a>
      </div>

      <motion.div
        layout
        className={`${styles.shareFrame} ${styles[`shareFrame_${ratio}`]}`}
        transition={springTransition}
      >
        <div className={styles.shareCard}>
          <div
            className={styles.sharePhoto}
            style={{ backgroundImage: `url("${experienceAssets.tourHero}")` }}
            role="img"
            aria-label="ITZY 台北巡演官方主视觉"
          />
          <div className={styles.shareLight} aria-hidden="true" />
          <div className={styles.shareNoise} aria-hidden="true" />
          <header>
            <span>CONCERT PASSPORT / MY SHOW</span>
            <i>CP—TPE</i>
          </header>
          <div className={styles.shareTitle}>
            <span>MY NEXT SHOW</span>
            <strong>ITZY</strong>
            <em>TUNNEL<br />VISION</em>
          </div>
          <div className={styles.shareDate}>
            <strong>05</strong>
            <span>SEP<br />2026</span>
          </div>
          <footer>
            <span>TAIPEI ARENA</span>
            <span>25.0514° N / 121.5497° E</span>
          </footer>
        </div>
      </motion.div>
    </section>
  );
}

export default function ExperienceLabPage({
  canonicalEventId,
  initialSaved = false,
}: {
  canonicalEventId?: string;
  initialSaved?: boolean;
}) {
  const reducedMotion = Boolean(useReducedMotion());
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const artworkY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const artworkScale = useTransform(scrollYProgress, [0, 1], [1, 0.84]);
  const titleX = useTransform(scrollYProgress, [0, 1], ['0%', '-9%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.86, 1], [1, 1, 0]);
  const daysToGo = daysUntilTaipeiShow();

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
      <main className={styles.experience}>
        <nav className={styles.topNav} aria-label="Concert Passport">
          <Link href="/" className={styles.wordmark}>CP<span>°</span></Link>
          <div><a href="#assets">SHOW</a><a href="#tour">TOUR</a><a href="#share">COVER</a></div>
          <Link href="/" className={styles.labMark}>BACK TO DISCOVER</Link>
        </nav>

        <motion.section
          className={styles.hero}
          ref={heroRef}
          id="top"
          style={{ opacity: heroOpacity }}
        >
          <div className={styles.lightField}><StageField reducedMotion={reducedMotion} /></div>
          <motion.div
            className={styles.heroArtwork}
            style={{ y: artworkY, scale: artworkScale }}
          >
            <div
              className={styles.heroImage}
              style={{ backgroundImage: `url("${experienceAssets.tourHero}")` }}
              role="img"
              aria-label="ITZY 3RD WORLD TOUR TUNNEL VISION 台北场官方主视觉"
            />
            <motion.div className={styles.heroSliceOne} style={{ backgroundImage: `url("${experienceAssets.tourHero}")` }} />
            <motion.div className={styles.heroSliceTwo} style={{ backgroundImage: `url("${experienceAssets.tourHero}")` }} />
          </motion.div>

          <motion.div className={styles.heroTitle} style={{ x: titleX }}>
            <motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: 0.32, duration: 0.9 }}>ITZY</motion.span>
            <motion.span className={styles.titleOutline} initial={{ y: '-110%' }} animate={{ y: 0 }} transition={{ delay: 0.4, duration: 1.05 }}>ITZY</motion.span>
          </motion.div>

          <motion.div className={styles.showIdentity} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.82 }}>
            <span>3RD WORLD TOUR</span>
            <strong>TUNNEL VISION</strong>
            <small>TAIPEI / 05.09.2026</small>
          </motion.div>

          <motion.div className={styles.countdown} initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.95 }}>
            <small>NEXT SHOW</small>
            <strong>{daysToGo}</strong>
            <span>DAYS<br />TO GO</span>
          </motion.div>

          <motion.div className={styles.heroAction} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}>
            <MagneticSaveButton eventId={canonicalEventId} initialSaved={initialSaved} />
            <a href="#share">制作我的场次封面 <span>↘</span></a>
          </motion.div>

          <div className={styles.scrollCue}><span>SCROLL TO ENTER</span><i /></div>
        </motion.section>

        <section className={styles.assetSection} id="assets">
          <div className={styles.sectionHeading}>
            <span>01 / ITZY · 2026</span>
            <h2>TUNNEL<br />VISION</h2>
            <p>TAIPEI ARENA · 05 SEP 2026</p>
          </div>

          <div className={styles.assetMosaic}>
            <AssetCard className={styles.heroAsset} index="A—01" label="TAIPEI" title="TUNNEL VISION / 05 SEP" image={experienceAssets.tourHero} />
            <AssetCard className={styles.mottoAsset} index="A—02" label="NOW PLAYING" title="MOTTO / 2026" image={experienceAssets.mottoCover} />
            <AssetCard className={styles.stageAsset} index="A—03" label="SEOUL" title="TUNNEL VISION / LIVE" image={experienceAssets.liveStage} />
            <AssetCard className={styles.arenaAsset} index="A—04" label="VENUE" title="TAIPEI ARENA / NIGHT" image={experienceAssets.taipeiArena} />
            <AssetCard className={styles.coverAsset} index="A—05" label="TOUR RELEASE" title="TUNNEL VISION / EP" image={experienceAssets.tunnelVisionCover} />
            <AssetCard className={styles.setlistAsset} index="A—06" label="SET LIST" title="3RD WORLD TOUR" image={experienceAssets.tourSetList} />
          </div>
        </section>

        <TourSignal />
        <ShareStudio />

        <footer className={styles.sourcesFooter}>
          <div><strong>CONCERT PASSPORT</strong><span>ITZY / TUNNEL VISION / TAIPEI</span></div>
          <div className={styles.sourceLinks}>
            {experienceSources.map((source) => (
              <a href={source.href} target="_blank" rel="noreferrer" key={source.label}>
                <span>{source.label}</span><small>{source.owner} ↗</small>
              </a>
            ))}
          </div>
        </footer>
      </main>
    </MotionConfig>
  );
}
