'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePreferences } from './preferences-provider';

export function SaveEventButton({ eventId, initialSaved, onChange, compact = false }: {
  eventId: string; initialSaved: boolean; onChange?: (saved: boolean) => void; compact?: boolean;
}) {
  const { t } = usePreferences();
  const router = useRouter();
  const [state, setState] = useState({ initial: initialSaved, saved: initialSaved });
  if (state.initial !== initialSaved) setState({ initial: initialSaved, saved: initialSaved });
  const saved = state.saved;
  const setSaved = (value: boolean) => setState({ initial: initialSaved, saved: value });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function toggle() {
    if (pending) return;
    setPending(true); setError(false);
    try {
      const response = await fetch('/api/v1/plans', { method: saved ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventId }) });
      if (!response.ok) throw new Error();
      setSaved(!saved); onChange?.(!saved); router.refresh();
    } catch { setError(true); }
    finally { setPending(false); }
  }
  return <span className="save-control">
    <button type="button" className={compact ? 'save-event compact' : 'save-event'} aria-pressed={saved}
      aria-label={t(saved ? 'explore.unsave' : 'explore.save')} onClick={() => void toggle()} disabled={pending}>
      <span aria-hidden="true">{pending ? '…' : saved ? '✓' : '+'}</span>{t(saved ? 'explore.saved' : 'explore.save')}
    </button>
    {error ? <small role="alert">{t('explore.actionFailed')}</small> : null}
  </span>;
}
