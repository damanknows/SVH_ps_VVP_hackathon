'use client';

import React from 'react';
import { LayoutDashboard, SlidersHorizontal, BarChart3, Cpu, ChevronRight } from 'lucide-react';
import { useLiveData } from '@/hooks/useLiveData';
import { mockEngineStatus } from '@/lib/mockData';
import { motion } from 'framer-motion';

/* ── Nav Item Definition ──────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    key: 'dashboard' as const,
    label: 'Command Bridge',
    description: 'Live telemetry & KPIs',
    icon: LayoutDashboard,
    accent: 'text-[#3b82f6]',
    activeBg: 'bg-blue-500/15 dark:bg-blue-500/20',
    activeBorder: 'border-[#3b82f6]',
    activeText: 'text-blue-700 dark:text-blue-300',
  },
  {
    key: 'simulator' as const,
    label: 'Strategy Simulator',
    description: 'Model energy scenarios',
    icon: SlidersHorizontal,
    accent: 'text-[#14b8a6]',
    activeBg: 'bg-teal-500/15 dark:bg-teal-500/20',
    activeBorder: 'border-[#14b8a6]',
    activeText: 'text-teal-700 dark:text-teal-300',
  },
  {
    key: 'reports' as const,
    label: 'Reports & Analytics',
    description: 'Audit, carbon & savings',
    icon: BarChart3,
    accent: 'text-[#f5a623]',
    activeBg: 'bg-amber-500/15 dark:bg-amber-500/20',
    activeBorder: 'border-[#f5a623]',
    activeText: 'text-amber-700 dark:text-amber-300',
  },
] as const;

type TabKey = (typeof NAV_ITEMS)[number]['key'];

interface SidebarProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { isStandalone, latencyMs } = useLiveData();

  return (
    <aside
      className="
        hidden md:flex flex-col w-64 shrink-0
        bg-white/40 dark:bg-slate-950/40
        backdrop-blur-2xl
        border-r border-white/20 dark:border-white/10
        min-h-[calc(100dvh-8rem)]
        overflow-y-auto
        shadow-[4px_0_24px_rgba(0,0,0,0.05)]
        z-10
      "
    >
      {/* ── Navigation Group ──────────────────────────────────────── */}
      <div className="flex-1 p-3 space-y-1.5">
        <p className="px-3 pt-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Navigation
        </p>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          return (
            <motion.button
              key={item.key}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.key)}
              className={`
                w-full text-left flex items-center gap-3 px-3 py-3 rounded-2xl
                border transition-all duration-200 group cursor-pointer
                ${
                  isActive
                    ? `${item.activeBg} ${item.activeBorder} ${item.activeText} font-semibold shadow-xs backdrop-blur-md`
                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-white/20 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100'
                }
              `}
            >
              <span
                className={`
                  w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors
                  ${isActive ? 'bg-white/80 dark:bg-white/10 shadow-xs' : 'bg-black/5 dark:bg-white/5'}
                `}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? item.accent : 'text-zinc-400 dark:text-zinc-500'}`}
                />
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight tracking-tight truncate">{item.label}</p>
                <p className="text-[11px] opacity-70 truncate mt-0.5">{item.description}</p>
              </div>

              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                  isActive ? 'opacity-70' : 'opacity-0 group-hover:opacity-40'
                }`}
              />
            </motion.button>
          );
        })}
      </div>

      {/* ── Frosted Glass System Status Card ──────────────────────── */}
      <div className="p-3 border-t border-white/15 dark:border-white/10">
        <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/[0.04] backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#22c55e]" />
            <span className="text-[11px] font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              VPP Engine Status
            </span>
          </div>
          <div className="space-y-1.5 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>Optimisation:</span>
              <span className="text-[#22c55e] font-bold">{mockEngineStatus.optimizationStatus}</span>
            </div>
            <div className="flex justify-between">
              <span>Protocol:</span>
              <span className="text-emerald-500 font-semibold">{mockEngineStatus.wsProtocol}</span>
            </div>
            <div className="flex justify-between">
              <span>Latency:</span>
              <span>{latencyMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span>Microgrid ID:</span>
              <span className="text-blue-400 font-semibold">{mockEngineStatus.microgridId}</span>
            </div>
          </div>
        </div>

        {/* Footer version */}
        <p className="mt-2.5 px-1 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between font-sans">
          <span>SuryaVayu VPP 2026</span>
          <span className="font-mono">v2.1.0</span>
        </p>
      </div>
    </aside>
  );
}
