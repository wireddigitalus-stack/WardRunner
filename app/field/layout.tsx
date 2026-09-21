import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Melissa K. Brown Campaign | Yard Sign Field Ops',
  description: 'Fast, mobile-first yard sign placement and retrieval portal for Melissa K. Brown Campaign.',
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
