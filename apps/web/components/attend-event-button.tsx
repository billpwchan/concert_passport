'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePreferences } from './preferences-provider';
export function AttendEventButton({ eventId, recorded }: { eventId: string; recorded: boolean }) {
  const { t } = usePreferences(); const router = useRouter();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(false);
  async function attend() {
    setBusy(true); setError(false);
    try { const r = await fetch('/api/v1/passport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventId }) }); if (!r.ok) throw new Error(); router.refresh(); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return <div className="attendance-action">{recorded ? <Link href="/passport">{t('journal.recorded')} ↗</Link> : <button className="button-secondary" disabled={busy} onClick={() => void attend()}>{busy ? '…' : t('journal.attended')} ↗</button>}{error && <small role="alert">{t('journal.error')}</small>}</div>;
}
