'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { LiveDataProvider } from '@/hooks/useLiveData';

export default function Providers({ children }: { children: React.ReactNode }) {
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <LiveDataProvider>
          {children}
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
  );
}
