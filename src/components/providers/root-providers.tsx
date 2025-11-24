'use client';

import { ReactNode } from 'react';
import { SessionProvider } from './session-provider';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Header />
      <main>{children}</main>
      <Toaster />
    </SessionProvider>
  );
}

