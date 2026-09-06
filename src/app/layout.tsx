'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { Header } from '@/components/layout/Header';
import { LiveDataProvider } from '@/hooks/useLiveData';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts: Inter + Playfair Display (Serif) + IBM Plex Sans + Space Mono (Editorial Kinfolk) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <title>SuryaVayu VPP · Energy Management · Govt. of Rajasthan DTE</title>
        <meta
          name="description"
          content="Energy Management & Virtual Power Plant Control Cell — Directorate of Technical Education, Government of Rajasthan"
        />
      </head>
      <body className="flex flex-col min-h-dvh">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <LiveDataProvider>
              {/* ── Sticky Government Header ── */}
              <Header />

              {/* ── Page Children (Sidebar lives inside page.tsx) ── */}
              {children}

              {/* ── Global Toast Notifications ── */}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  className:
                    'text-xs font-semibold rounded-xl border border-[hsl(var(--border))] shadow-xl',
                }}
              />
            </LiveDataProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
