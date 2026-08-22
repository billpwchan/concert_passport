import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JourneyOverview } from '@/components/journey-overview';
import { demoJourneys, getJourneyBySlug } from '@/lib/domain/demo';
import { getJourneysForCurrentSession } from '@/lib/server/journeys';

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
  const slug = (await params).slug;
  const journey = (await getJourneysForCurrentSession()).find((item) => item.slug === slug);
  if (!journey) notFound();
  return <JourneyOverview journey={journey} />;
}
