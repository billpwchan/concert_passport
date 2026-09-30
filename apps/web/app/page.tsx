import { HomeHub } from '@/components/home-hub';
import { getUpcomingCatalogEvents } from '@/db/events';
import { getSavedEventsForCurrentSession } from '@/lib/server/saved-events';
import { getCurrentAccount } from '@/lib/server/auth';

export default async function Home() {
  const [events, catalogEvents, account] = await Promise.all([
    getSavedEventsForCurrentSession(),
    Promise.resolve(getUpcomingCatalogEvents(12)),
    getCurrentAccount(),
  ]);
  return <HomeHub events={events} catalogEvents={catalogEvents} signedIn={Boolean(account)} nowIso={new Date().toISOString()} />;
}
