import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CampaignOS | Yard Sign Field Ops',
  description: 'Fast, mobile-first yard sign placement and retrieval portal.',
  icons: {
    apple: [
      { url: '/icon-field.jpg', sizes: '1024x1024' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'COS Signs',
  },
};

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return children;
}
