import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JourneyLifecycle } from '@/components/journey-lifecycle';
import { demoJourneys, getJourneyBySlug } from '@/lib/domain/demo';
import { formatVenueTime } from '@/lib/domain/lifecycle';

export function generateStaticParams() {
  return demoJourneys.map((journey) => ({ slug: journey.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const journey = getJourneyBySlug((await params).slug);
  if (!journey) return { title: 'Journey not found — Concert Passport' };
  const title = `${journey.artist.name} · ${journey.venue.city} — Concert Passport`;
  const description = `${journey.tourName} at ${journey.venue.name}. View the complete ticket lifecycle and source ledger.`;
  return {
    title,
    description,
    openGraph: { title, description, images: [] },
    twitter: { title, description, images: [] },
  };
}

export default async function JourneyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const journey = getJourneyBySlug((await params).slug);
  if (!journey) notFound();

  return (
    <>
      <header className="journey-hero">
        <div className="journey-hero-top">
          <Link href="/plans">← All plans</Link>
          <span>ILLUSTRATIVE TIMINGS · SOURCE MODEL DEMO</span>
        </div>
        <div className="journey-title-row">
          <div>
            <p>{journey.artist.koreanName} · {journey.artist.agency}</p>
            <h1>{journey.artist.name}</h1>
            <h2>{journey.tourName}</h2>
          </div>
          <div className="journey-city-code">{journey.venue.market}</div>
        </div>
        <div className="journey-facts">
          <div><span>PERFORMANCE</span><strong>{formatVenueTime(journey.performanceStartsAt, journey.venue.timezone)}</strong><small>{journey.venue.timezone}</small></div>
          <div><span>VENUE</span><strong>{journey.venue.name}</strong><small>{journey.venue.city}</small></div>
          <div><span>OFFICIAL SELLER</span><strong>{journey.officialSeller}</strong><small>{journey.officialSellerHost}</small></div>
          <div><span>TICKET LIMIT</span><strong>{journey.ticketLimit ?? '—'} per account</strong><small>Confirm on event page</small></div>
        </div>
      </header>

      <div className="journey-page-grid">
        <JourneyLifecycle journey={journey} />
        <aside className="journey-sidebar">
          <section className="source-ledger-card">
            <p className="eyebrow">SOURCE LEDGER</p>
            <h3>Why we trust this plan</h3>
            {journey.sources.map((source) => (
              <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                <span className="source-seal">✓</span>
                <div><strong>{source.name}</strong><span>{source.confidence} · {source.host}</span></div>
                <b>↗</b>
              </a>
            ))}
            <small>Every critical field retains its own source and checked time. Changes create a new version instead of silently overwriting the old value.</small>
          </section>

          <section className="ticket-day-card">
            <p className="eyebrow">TICKET-DAY KIT</p>
            <h3>Ready before the queue opens.</h3>
            <ul>
              <li><span>✓</span> Membership confirmed</li>
              <li><span>✓</span> Registration window tracked</li>
              <li><span>·</span> Access code stays private</li>
              <li><span>·</span> One device and browser reminder</li>
            </ul>
            <a href={`https://${journey.officialSellerHost}`} target="_blank" rel="noreferrer">Open verified seller <span>↗</span></a>
          </section>
        </aside>
      </div>
    </>
  );
}
