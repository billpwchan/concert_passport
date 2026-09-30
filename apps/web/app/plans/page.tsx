import { getPassportEntriesForCurrentSession } from '@/lib/server/passport';
import { FollowManager } from '@/components/follow-manager';
import { SavedShowsDirectory } from '@/components/saved-shows-directory';
import { getSavedEventsForCurrentSession } from '@/lib/server/saved-events';

export const metadata = {
  title: 'Saved — Concert Passport',
  description: 'The shows you want to keep close.',
};

export default async function PlansPage() {
  const [events, entries] = await Promise.all([getSavedEventsForCurrentSession(), getPassportEntriesForCurrentSession()]);
  return <div className="page-body saved-page"><SavedShowsDirectory events={events} attendedIds={entries.flatMap(e => e.eventId ? [e.eventId] : [])} nowIso={new Date().toISOString()} /><FollowManager /></div>;
}
