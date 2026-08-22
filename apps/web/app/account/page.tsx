import { AccountPanel } from '@/components/account-panel';
import { getCurrentAccount } from '@/lib/server/auth';

export const metadata = {
  title: 'Account — Concert Passport',
  description: 'Keep your concert plans and followed artists with you.',
};

export default async function AccountPage() {
  return <AccountPanel account={await getCurrentAccount()} />;
}
