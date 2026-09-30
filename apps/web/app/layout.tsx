import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { AppFrame } from '@/components/app-frame';
import { PreferencesProvider } from '@/components/preferences-provider';
import {
  normalizeLocale,
} from '@/lib/i18n';
import { getCurrentAccount } from '@/lib/server/auth';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import './discovery.css';
import './stage.css';

export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  metadataBase: new URL(
    process.env.CONCERT_PASSPORT_SITE_URL ?? 'https://concert-passport.52-198-144-26.sslip.io',
  ),
  title: 'Concert Passport — Find the show. Keep the night.',
  description:
    'Discover upcoming K-pop shows across Asia, save the ones you want, and keep every night in your Passport.',
  openGraph: {
    title: 'Concert Passport',
    description: 'Find the show. Keep the night.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Concert Passport' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Concert Passport',
    description: 'Find the show. Keep the night.',
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
  const initialAppearance = 'light' as const;
  const initialResolvedTheme = 'light' as const;

  return (
    <html
      lang={initialLocale}
      data-appearance={initialAppearance}
      data-theme={initialResolvedTheme}
      data-script={initialLocale === 'en' ? 'latin' : 'cjk'}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >

      <body>
        <PreferencesProvider
          initialLocale={initialLocale}
          initialAppearance={initialAppearance}
          initialResolvedTheme={initialResolvedTheme}
        >
          <AppFrame account={account} demo={process.env.CONCERT_PASSPORT_DEMO === '1'}>{children}</AppFrame>
        </PreferencesProvider>
      </body>
    </html>
  );
}
