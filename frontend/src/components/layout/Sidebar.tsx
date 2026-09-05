'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Sliders, FileText, Zap, Shield, Cpu } from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'simulator' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'simulator' | 'reports') => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { t } = useTranslation();

  const navItems = [
    { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { key: 'simulator', label: t('nav.simulator'), icon: Sliders },
    { key: 'reports', label: t('nav.reports'), icon: FileText },
  ] as const;

  return (
    <aside className="w-64 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Navigation Group */}
        <div>
          <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-3">
            Navigation
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Specs Box */}
        <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 text-xs space-y-2">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold">
            <Cpu className="w-4 h-4 text-emerald-500" />
            VPP Engine Status
          </div>
          <div className="space-y-1 text-[11px] text-zinc-500 font-mono">
            <div className="flex justify-between">
              <span>Optimization:</span>
              <span className="text-emerald-500 font-semibold">Active (P10-P90)</span>
            </div>
            <div className="flex justify-between">
              <span>WS Protocol:</span>
              <span>Raw JSON WS</span>
            </div>
            <div className="flex justify-between">
              <span>Microgrid ID:</span>
              <span>SV-VPP-01</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 text-[11px] text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <span>SuryaVayu Hackathon</span>
        <span className="font-mono">v1.2.0</span>
      </div>
    </aside>
  );
}
