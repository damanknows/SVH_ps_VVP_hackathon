'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useLiveData } from '@/hooks/useLiveData';
import { Sun, Moon, Languages, Activity, Sparkles, Menu, X, Globe, Radio } from 'lucide-react';

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { connected, isStandalone, latencyMs, setScenario } = useLiveData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Emblem Logo */}
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center p-1 shrink-0 overflow-hidden">
          <img
            src="/emblem.svg"
            alt="Government of Rajasthan Emblem"
            className="w-full h-full object-contain dark:invert"
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm md:text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight truncate">
            {t('app.title')}
          </h1>
          <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate">
            {t('app.subtitle')}
          </p>
        </div>
      </div>

      {/* Connection & Desktop Controls */}
      <div className="hidden sm:flex items-center gap-2.5 sm:gap-3">
        {/* Live / Standalone Status Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connected ? (isStandalone ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-red-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                connected ? (isStandalone ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-red-500'
              }`}
            />
          </span>
          <span className="text-zinc-700 dark:text-zinc-300 font-mono text-[11px] hidden lg:inline">
            {isStandalone ? t('status.offline') : t('status.live')}
          </span>
          <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-0.5 border-l border-zinc-300 dark:border-zinc-700 pl-1.5 lg:pl-2">
            <Activity className="w-3 h-3 text-emerald-500" />
            {latencyMs}ms
          </span>
        </div>

        {/* Secret Demo Hint */}
        <div
          title="Secret Demo Controller (Ctrl+Shift+D)"
          className="hidden xl:flex items-center gap-1 text-[11px] font-mono text-zinc-500 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Ctrl+Shift+D
        </div>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer border border-zinc-200 dark:border-zinc-700"
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

      {/* Mobile Hamburger Toggle Button */}
      <div className="flex sm:hidden items-center gap-1.5">
        <button
          onClick={toggleLanguage}
          className="p-1.5 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
        >
          {i18n.language.toUpperCase()}
        </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu Overlay */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 p-4 shadow-2xl flex flex-col gap-3 sm:hidden animate-in slide-in-from-top-2 duration-200 z-50">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs font-semibold">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {isStandalone ? t('status.offline') : t('status.live')}
            </span>
            <span className="font-mono text-zinc-400">{latencyMs}ms latency</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Quick Scenarios
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => { setScenario('sunny_day'); setMobileMenuOpen(false); }}
                className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-left"
              >
                ☀️ Sunny Day
              </button>
              <button
                onClick={() => { setScenario('grid_outage'); setMobileMenuOpen(false); }}
                className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-left"
              >
                ⚡ Grid Outage
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
