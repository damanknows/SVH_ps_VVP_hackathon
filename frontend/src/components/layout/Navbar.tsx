'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useLiveData } from '@/hooks/useLiveData';
import { Sun, Moon, Languages, Radio, Activity, Sparkles } from 'lucide-react';

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { connected, isStandalone, latencyMs } = useLiveData();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="h-16 px-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        {/* Emblem Logo */}
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center p-1.5 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-800 dark:text-zinc-200" fill="currentColor">
            {/* Ashoka Pillar / Emblem Stylized Representation */}
            <path d="M50 8 C42 8 38 15 38 22 C38 28 42 32 50 32 C58 32 62 28 62 22 C62 15 58 8 50 8 Z M50 14 C54 14 56 18 56 22 C56 26 54 28 50 28 C46 28 44 26 44 22 C44 18 46 14 50 14 Z" />
            <path d="M35 34 H65 V42 H35 Z M42 42 H58 V68 H42 Z M35 68 H65 V74 H35 Z M30 74 H70 V82 H30 Z M25 82 H75 V90 H25 Z" />
            <circle cx="50" cy="78" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
            {t('app.title')}
          </h1>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {t('app.subtitle')}
          </p>
        </div>
      </div>

      {/* Connection & Actions */}
      <div className="flex items-center gap-3">
        {/* Live / Standalone Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connected ? (isStandalone ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-red-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                connected ? (isStandalone ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-red-500'
              }`}
            />
          </span>
          <span className="text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">
            {isStandalone ? t('status.offline') : t('status.live')}
          </span>
          <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-0.5 border-l border-zinc-300 dark:border-zinc-700 pl-2">
            <Activity className="w-3 h-3 text-emerald-500" />
            {latencyMs}ms
          </span>
        </div>

        {/* Secret Demo Hint */}
        <div
          title="Secret Demo Controller (Ctrl+Shift+D)"
          className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-zinc-500 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Ctrl+Shift+D
        </div>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer border border-zinc-200 dark:border-zinc-700"
        >
          <Languages className="w-3.5 h-3.5 text-emerald-500" />
          {i18n.language.toUpperCase()}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer border border-zinc-200 dark:border-zinc-700"
        >
          <Sun className="w-4 h-4 hidden dark:block text-amber-400" />
          <Moon className="w-4 h-4 block dark:hidden text-zinc-700" />
        </button>
      </div>
    </header>
  );
}
