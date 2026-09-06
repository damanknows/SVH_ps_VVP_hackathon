import type { Metadata } from 'next';
import React from 'react';
import { Header } from '@/components/layout/Header';
import Providers from './Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'SuryaVayu VPP | Energy Management | Govt. of Rajasthan DTE',
  description:
    'Energy Management & Virtual Power Plant Control Cell — Directorate of Technical Education, Government of Rajasthan',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts: Inter + Playfair Display + IBM Plex Sans + Space Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </head>
      <body className="flex flex-col min-h-dvh">
        <Providers>
          {/* Sticky Government Header */}
          <Header />

          {/* Page Children (Sidebar lives inside page.tsx) */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
