import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { AppFrame } from '@/components/app-frame';
import { PreferencesProvider } from '@/components/preferences-provider';
import { normalizeLocale, type ThemePreference } from '@/lib/i18n';
import { getCurrentAccount } from '@/lib/server/auth';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.CONCERT_PASSPORT_SITE_URL ?? 'https://concert-passport.52-198-144-26.sslip.io',
  ),
  title: 'Concert Passport — K-pop shows, in one place',
  description:
    'Find K-pop shows across Asia, save ticket windows and keep every live memory.',
  openGraph: {
    title: 'Concert Passport',
    description: 'K-pop dates, ticket windows and every city you made it to.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Concert Passport' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Concert Passport',
    description: 'K-pop dates, ticket windows and every city you made it to.',
    images: ['/og.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, requestHeaders, account] = await Promise.all([
    cookies(),
    headers(),
    getCurrentAccount(),
  ]);
  const preferredLocale =
    cookieStore.get('cp_locale')?.value ?? requestHeaders.get('accept-language')?.split(',')[0];
  const initialLocale = normalizeLocale(preferredLocale);
  const storedTheme = cookieStore.get('cp_theme')?.value;
  const initialTheme: ThemePreference = storedTheme === 'dark' ? 'dark' : 'light';

  return (
    <html lang={initialLocale} data-theme={initialTheme} suppressHydrationWarning>
      <body>
        <PreferencesProvider initialLocale={initialLocale} initialTheme={initialTheme}>
          <AppFrame account={account}>{children}</AppFrame>
        </PreferencesProvider>
      </body>
    </html>
  );
}
