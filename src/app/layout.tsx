import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { RootProviders } from '@/components/providers/root-providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChatApp - Real-time Messaging',
  description: 'Modern, minimal chat application with real-time conversations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
