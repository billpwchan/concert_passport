import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { AppFrame } from '@/components/app-frame';
import { PreferencesProvider } from '@/components/preferences-provider';
import { normalizeLocale, type ThemePreference } from '@/lib/i18n';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.CONCERT_PASSPORT_SITE_URL ?? 'https://concert-passport.52-198-144-26.sslip.io',
  ),
  title: 'Concert Passport — Never miss the moment',
  description:
    'Track every K-pop concert milestone across Asia, coordinate the journey, and keep every live memory.',
  openGraph: {
    title: 'Concert Passport',
    description: 'Never miss the moment. Keep every one.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Concert Passport' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Concert Passport',
    description: 'Never miss the moment. Keep every one.',
    images: ['/og.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const preferredLocale =
    cookieStore.get('cp_locale')?.value ?? requestHeaders.get('accept-language')?.split(',')[0];
  const initialLocale = normalizeLocale(preferredLocale);
  const storedTheme = cookieStore.get('cp_theme')?.value;
  const initialTheme: ThemePreference = storedTheme === 'dark' ? 'dark' : 'light';

  return (
    <html lang={initialLocale} data-theme={initialTheme} suppressHydrationWarning>
      <body>
        <PreferencesProvider initialLocale={initialLocale} initialTheme={initialTheme}>
          <AppFrame>{children}</AppFrame>
        </PreferencesProvider>
      </body>
    </html>
  );
}
