import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CampaignOS | Door Canvassing & Turf',
  description: 'Neighborhood turf walking and voter contact logging portal.',
  icons: {
    apple: [
      { url: '/icon-canvass.jpg', sizes: '1024x1024' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'COS Canvass',
  },
};

export default function CanvassLayout({ children }: { children: React.ReactNode }) {
  return children;
}
