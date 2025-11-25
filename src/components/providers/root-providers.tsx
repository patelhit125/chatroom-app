'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SessionProvider } from './session-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';

export function RootProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Pages where footer should be hidden
  const hideFooterPaths = ['/chat', '/wallet', '/auth/signin', '/auth/signup'];
  const shouldHideFooter = hideFooterPaths.includes(pathname);

  return (
    <SessionProvider>
      <Header />
      <main>{children}</main>
      {!shouldHideFooter && <Footer />}
      <Toaster />
    </SessionProvider>
  );
}

