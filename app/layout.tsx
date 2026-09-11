import type { Metadata, Viewport } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://wardrunner.app'),
  title: 'CampaignOS | Field Logistics & Yard Sign Intelligence',
  description: 'Fast, mobile-first field logistics, yard sign intelligence, and campaign operations for political campaigns.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/campaignos-social-icon.jpg',
  },
  openGraph: {
    title: 'CampaignOS | Field Logistics & Yard Sign Intelligence',
    description: 'Fast, mobile-first field logistics, yard sign intelligence, and campaign operations for political campaigns.',
    url: 'https://wardrunner.app',
    siteName: 'CampaignOS',
    images: [
      {
        url: '/og-image.jpg',
        width: 1376,
        height: 768,
        alt: 'CampaignOS - Field Logistics & Yard Sign Intelligence',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CampaignOS | Field Logistics & Yard Sign Intelligence',
    description: 'Fast, mobile-first field logistics, yard sign intelligence, and campaign operations for political campaigns.',
    images: ['/og-image.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
