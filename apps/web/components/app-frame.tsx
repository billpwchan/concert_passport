'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localeOptions, type MessageKey } from '@/lib/i18n';
import type { PublicAccount } from '@/lib/server/auth';
import { usePreferences } from './preferences-provider';
import styles from './app-frame.module.css';
import { BrandMark } from './brand-mark';

type AppFrameProps = { children: React.ReactNode; account?: PublicAccount; demo?: boolean };

const navItems: Array<{ href: string; labelKey: MessageKey }> = [
  { href: '/', labelKey: 'nav.today' },
  { href: '/atlas', labelKey: 'nav.atlas' },
  { href: '/plans', labelKey: 'nav.plans' },
  { href: '/passport', labelKey: 'nav.passport' },
];


export function AppFrame({ children, account, demo }: AppFrameProps) {
  const pathname = usePathname();
  const { locale, setLocale, t } = usePreferences();
  const immersive = pathname.startsWith('/shows/itzy-taipei-2026');
  const isHome = pathname === '/';
  const isActive = (href: string) => href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);

  if (immersive) {
    return <div className={styles.shell}><main className={styles.immersiveWorkspace}>{demo && <div className="demo-banner">{t('journal.demo')}</div>}{children}</main>
      <footer className="site-footer"><span>CONCERT PASSPORT © {new Date().getFullYear()}</span><nav aria-label="Project"><Link href="/sources">{t('nav.sources')}</Link><a href="https://github.com/billpwchan/concert_passport" target="_blank" rel="noreferrer">GitHub ↗</a><Link href="/account">{t('account.signIn')}</Link></nav></footer></div>;
  }

  return (
    <div className={`${styles.shell} ${isHome ? styles.homeShell : ''}`}>
      <a className="skip-link" href="#main-content">{t('explore.skip')}</a>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label={t('brand.name')}>
          <BrandMark /><small>CONCERT<br />PASSPORT</small>
        </Link>

        <nav className={styles.desktopNav} aria-label={t('nav.primary')}>
          {navItems.map((item) => (
            <Link
              className={isActive(item.href) ? styles.active : ''}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              key={item.href}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <label className={styles.languageControl}>
            <span className="sr-only">{t('preferences.language')}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)} aria-label={t('preferences.language')}>
              {localeOptions.map((option) => <option value={option.value} key={option.value}>{t(option.labelKey)}</option>)}
            </select>
          </label>

          <Link className={styles.account} href="/account">{account?.displayName ?? t('account.signIn')}</Link>
        </div>
      </header>

      <main id="main-content" className={`${styles.workspace} ${isHome ? styles.homeWorkspace : ''}`}>{demo && <div className="demo-banner">{t('journal.demo')}</div>}{children}</main>
      <footer className="site-footer"><span>CONCERT PASSPORT © {new Date().getFullYear()}</span><nav aria-label="Project"><Link href="/sources">{t('nav.sources')}</Link><a href="https://github.com/billpwchan/concert_passport" target="_blank" rel="noreferrer">GitHub ↗</a><Link href="/account">{t('account.signIn')}</Link></nav></footer>

      <nav className={styles.mobileNav} aria-label={t('nav.primary')}>
        {navItems.map((item) => (
          <Link className={isActive(item.href) ? styles.active : ''} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} key={item.href}>
            <i aria-hidden="true" /><span>{t(item.labelKey)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
