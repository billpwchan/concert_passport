import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getChatGPTUser } from './chatgpt-auth';
import { AppFrame } from '@/components/app-frame';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://concert-passport.w23a941922a7c.chatgpt.site'),
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
  const user = await getChatGPTUser();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppFrame
          user={user ? { displayName: user.displayName, email: user.email } : null}
        >
          {children}
        </AppFrame>
      </body>
    </html>
  );
}
