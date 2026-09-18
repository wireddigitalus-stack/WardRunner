import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CampaignOS | Command Map & Field Intelligence',
  description: 'Live field operations, sign tracking map, and campaign strategy center.',
  icons: {
    apple: [
      { url: '/icon-dashboard.jpg', sizes: '1024x1024' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'COS Command',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
