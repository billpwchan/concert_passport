import { PassportLedger } from '@/components/passport-ledger';
import { getCurrentAccount } from '@/lib/server/auth';
import { getPassportEntriesForCurrentSession } from '@/lib/server/passport';

export const metadata = {
  title: 'Passport — Concert Passport',
  description: 'Your lifetime of live music, mapped and remembered.',
};

export default async function PassportPage() {
  const [entries, account] = await Promise.all([
    getPassportEntriesForCurrentSession(),
    getCurrentAccount(),
  ]);
  return <PassportLedger entries={entries} displayName={account?.displayName} />;
}
