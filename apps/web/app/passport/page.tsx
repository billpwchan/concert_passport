import { PageHeader } from '@/components/page-header';
import { PassportLedger } from '@/components/passport-ledger';
import { demoAttendances } from '@/lib/domain/demo';

export const metadata = {
  title: 'Passport — Concert Passport',
  description: 'Your lifetime of live music, mapped and remembered.',
};

export default function PassportPage() {
  return (
    <>
      <PageHeader
        eyebrowKey="passport.eyebrow"
        titleKey="passport.title"
        descriptionKey="passport.description"
      />
      <PassportLedger attendances={demoAttendances} />
    </>
  );
}
