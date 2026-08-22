'use client';

import { useState } from 'react';
import type { PublicAccount } from '@/lib/server/auth';
import type { MessageKey } from '@/lib/i18n';
import { usePreferences } from './preferences-provider';

const authErrorKeys: Record<string, MessageKey> = {
  invalid_email: 'account.invalidEmail',
  invalid_password: 'account.invalidPassword',
  invalid_display_name: 'account.invalidDisplayName',
  email_exists: 'account.emailExists',
  invalid_credentials: 'account.invalidCredentials',
  rate_limited: 'account.rateLimited',
};

export function AccountPanel({ account }: { account?: PublicAccount }) {
  const { t } = usePreferences();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    const payload = {
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
      displayName: String(data.get('displayName') ?? ''),
    };
    const response = await fetch(`/api/v1/auth/${mode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { code?: string };
    if (response.ok) window.location.assign('/');
    else setMessage(t(authErrorKeys[result.code ?? ''] ?? 'account.error'));
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    window.location.assign('/');
  }

  if (account) {
    return (
      <div className="page-body account-page">
        <section className="account-summary">
          <span className="section-label">{t('account.membership')}</span>
          <h1>{account.displayName}</h1>
          <p>{account.email}</p>
          <dl>
            <div><dt>{t('account.savedAcrossDevices')}</dt><dd>{t('account.active')}</dd></div>
            <div><dt>{t('account.sessionSecurity')}</dt><dd>{t('account.protectedCookie')}</dd></div>
          </dl>
          <button className="button-secondary" type="button" onClick={signOut} disabled={busy}>
            {t('account.signOut')}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-body account-page">
      <section className="auth-shell">
        <div className="auth-intro">
          <span className="section-label">{t('account.eyebrow')}</span>
          <h1>{t('account.title')}</h1>
          <p>{t('account.description')}</p>
          <ul>
            <li>{t('account.benefitPlans')}</li>
            <li>{t('account.benefitArtists')}</li>
            <li>{t('account.benefitPassport')}</li>
          </ul>
        </div>
        <div className="auth-form-panel">
          <div className="auth-tabs">
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>{t('account.create')}</button>
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>{t('account.login')}</button>
          </div>
          <form onSubmit={submit}>
            {mode === 'register' ? (
              <label><span>{t('account.displayName')}</span><input name="displayName" autoComplete="name" minLength={2} maxLength={60} required /></label>
            ) : null}
            <label><span>{t('account.email')}</span><input name="email" type="email" autoComplete="email" required /></label>
            <label><span>{t('account.password')}</span><input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={12} maxLength={128} required /><small>{t('account.passwordHelp')}</small></label>
            <button className="button-primary" type="submit" disabled={busy}>{busy ? t(mode === 'register' ? 'account.creating' : 'account.signingIn') : mode === 'register' ? t('account.createAction') : t('account.loginAction')}</button>
            <p className="form-message" role="status">{message}</p>
          </form>
        </div>
      </section>
    </div>
  );
}
