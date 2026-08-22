'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localeOptions, type MessageKey } from '@/lib/i18n';
import { usePreferences } from './preferences-provider';

type AppFrameProps = {
  children: React.ReactNode;
};

const navItems: Array<{ href: string; labelKey: MessageKey }> = [
  { href: '/', labelKey: 'nav.today' },
  { href: '/atlas', labelKey: 'nav.atlas' },
  { href: '/plans', labelKey: 'nav.plans' },
  { href: '/passport', labelKey: 'nav.passport' },
  { href: '/sources', labelKey: 'nav.sources' },
];

export function AppFrame({ children }: AppFrameProps) {
  const pathname = usePathname();
  const { locale, setLocale, theme, setTheme, t } = usePreferences();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="app-shell">
      <header className="global-header">
        <div className="global-header-inner">
          <Link className="wordmark" href="/" aria-label={t('brand.name')}>
            <span className="wordmark-symbol" aria-hidden="true"><i /></span>
            <span><strong>{t('brand.name')}</strong><small>{t('brand.product')}</small></span>
          </Link>

          <nav className="desktop-nav" aria-label={t('nav.primary')}>
            {navItems.map((item) => (
              <Link
                className={isActive(item.href) ? 'active' : ''}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                key={item.href}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <label className="language-control">
              <span className="sr-only">{t('preferences.language')}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as typeof locale)}
                aria-label={t('preferences.language')}
              >
                {localeOptions.map((option) => (
                  <option value={option.value} key={option.value}>{t(option.labelKey)}</option>
                ))}
              </select>
            </label>

            <button
              className="theme-control"
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? t('preferences.toLight') : t('preferences.toDark')}
              title={theme === 'dark' ? t('preferences.light') : t('preferences.dark')}
            >
              <span className={`theme-glyph ${theme}`} aria-hidden="true" />
            </button>

            <span className="private-beta-label">{t('account.privateBeta')}</span>
          </div>
        </div>
      </header>

      <main className="workspace">{children}</main>

      <nav className="mobile-nav" aria-label={t('nav.primary')}>
        {navItems.map((item) => (
          <Link
            className={isActive(item.href) ? 'active' : ''}
            href={item.href}
            aria-current={isActive(item.href) ? 'page' : undefined}
            key={item.href}
          >
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
