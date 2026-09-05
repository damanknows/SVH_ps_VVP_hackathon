'use client';

import React, { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LiveDataProvider } from '@/hooks/useLiveData';
import { Navbar } from '@/components/layout/Navbar';
import { DemoControlPanel } from '@/components/common/DemoControlPanel';
import { Toaster } from 'sonner';
import '@/lib/i18n';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 antialiased selection:bg-emerald-500 selection:text-white">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <LiveDataProvider>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                {children}
              </div>
              <DemoControlPanel />
              <Toaster position="bottom-left" />
            </LiveDataProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
