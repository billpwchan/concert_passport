import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { demoJourneys } from '@/lib/domain/demo';
import { formatVenueTime, getJourneyProgress, getNextMilestone } from '@/lib/domain/lifecycle';

export const metadata = {
  title: 'Plans — Concert Passport',
  description: 'Every protected concert journey, from registration to show day.',
};

export default function PlansPage() {
  return (
    <>
      <PageHeader
        eyebrow="PROTECTED JOURNEYS"
        title="Every plan has a next move."
        description="The lifecycle stays visible across registration, presale, purchase, fulfillment, and travel."
        side={<div className="plan-summary"><strong>4</strong><span>active journeys</span></div>}
      />
      <section className="plans-grid">
        {demoJourneys.map((journey, index) => {
          const progress = getJourneyProgress(journey);
          const next = getNextMilestone(journey, new Date('2026-08-22T11:42:00+08:00'));
          const ratio = Math.round((progress.complete / progress.total) * 100);
          return (
            <Link className="plan-card" href={`/plans/${journey.slug}`} key={journey.id}>
              <div className="plan-card-top">
                <span>{String(index + 1).padStart(2, '0')} · {journey.venue.market}</span>
                <span className="verified-plan">VERIFIED</span>
              </div>
              <div className="plan-artist">
                <i style={{ background: journey.artist.accent }} />
                <div><strong>{journey.artist.name}</strong><span>{journey.tourName}</span></div>
              </div>
              <div className="plan-destination">
                <span>{journey.venue.city}</span>
                <strong>{formatVenueTime(journey.performanceStartsAt, journey.venue.timezone)}</strong>
                <small>{journey.venue.name}</small>
              </div>
              <div className="plan-progress">
                <div><i style={{ width: `${Math.max(6, ratio)}%`, background: journey.artist.accent }} /></div>
                <span>{progress.complete}/{progress.total} steps</span>
              </div>
              <div className="plan-next">
                <span>NEXT</span>
                <div><strong>{next?.title ?? 'Ready for show day'}</strong><small>{next ? formatVenueTime(next.startsAt, next.timezone) : ''}</small></div>
                <b>↗</b>
              </div>
            </Link>
          );
        })}
      </section>
      <p className="demo-disclaimer">All event names and timings shown in this product build are illustrative until live provider credentials and publisher agreements are configured.</p>
    </>
  );
}
