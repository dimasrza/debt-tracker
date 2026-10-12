import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = { title: 'Debt Tracker', description: 'Catatan utang pribadi' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0f766e' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
