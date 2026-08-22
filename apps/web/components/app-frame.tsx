'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type AppFrameProps = {
  children: React.ReactNode;
  user: { displayName: string; email: string } | null;
};

const navItems = [
  { href: '/', label: 'Today', index: '01' },
  { href: '/atlas', label: 'Atlas', index: '02' },
  { href: '/plans', label: 'Plans', index: '03' },
  { href: '/passport', label: 'Passport', index: '04' },
  { href: '/sources', label: 'Sources', index: '05' },
];

export function AppFrame({ children, user }: AppFrameProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  const initial = (user?.displayName ?? 'Guest').trim().charAt(0).toUpperCase();

  return (
    <main className="app-shell">
      <aside className="side-rail" aria-label="Primary navigation">
        <Link className="brand-mark" href="/" aria-label="Concert Passport home">
          <span>CP</span>
        </Link>
        <nav className="rail-nav">
          {navItems.map((item) => (
            <Link
              className={`rail-link ${isActive(item.href) ? 'active' : ''}`}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              key={item.href}
            >
              <span className="rail-icon">{item.index}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="rail-foot">
          <span className="status-dot" />
          <span>Source ledger online</span>
        </div>
      </aside>

      <section className="workspace">
        <div className="global-account">
          <span className="preview-mode">PRODUCT PREVIEW</span>
          {user ? (
            <>
              <span className="account-name">{user.displayName}</span>
              <a className="avatar" href="/signout-with-chatgpt?return_to=/" aria-label="Sign out">
                {initial}
              </a>
            </>
          ) : (
            <a className="sign-in-link" href="/signin-with-chatgpt?return_to=/">
              Sign in to save
            </a>
          )}
        </div>
        {children}
      </section>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 4).map((item) => (
          <Link
            className={isActive(item.href) ? 'active' : ''}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
