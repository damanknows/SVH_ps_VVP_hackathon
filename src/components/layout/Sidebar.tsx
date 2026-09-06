'use client';

import React from 'react';
import { LayoutDashboard, SlidersHorizontal, BarChart3, Cpu, ChevronRight } from 'lucide-react';
import { useLiveData } from '@/hooks/useLiveData';
import { mockEngineStatus } from '@/lib/mockData';

/* ── Nav Item Definition ──────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    key: 'dashboard' as const,
    label: 'Command Bridge',
    description: 'Live telemetry & KPIs',
    icon: LayoutDashboard,
    accent: 'text-[#3b82f6]',
    activeBg: 'bg-blue-50 dark:bg-[#1e3a5f]',
    activeBorder: 'border-[#3b82f6]',
    activeText: 'text-blue-700 dark:text-blue-300',
  },
  {
    key: 'simulator' as const,
    label: 'Strategy Simulator',
    description: 'Model energy scenarios',
    icon: SlidersHorizontal,
    accent: 'text-[#14b8a6]',
    activeBg: 'bg-teal-50 dark:bg-[#0d3331]',
    activeBorder: 'border-[#14b8a6]',
    activeText: 'text-teal-700 dark:text-teal-300',
  },
  {
    key: 'reports' as const,
    label: 'Reports & Analytics',
    description: 'Audit, carbon & savings',
    icon: BarChart3,
    accent: 'text-[#f5a623]',
    activeBg: 'bg-amber-50 dark:bg-[#3b2a0d]',
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
        bg-[var(--sidebar-bg)] dark:bg-[#0f172a]
        border-r border-[hsl(var(--border))]
        min-h-[calc(100dvh-8rem)]
        overflow-y-auto
      "
    >
      {/* ── Navigation Group ──────────────────────────────────────── */}
      <div className="flex-1 p-3 space-y-1">
        <p className="px-3 pt-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
          Navigation
        </p>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`
                w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl
                border-l-2 transition-all duration-150 group cursor-pointer
                ${
                  isActive
                    ? `${item.activeBg} ${item.activeBorder} ${item.activeText} font-semibold shadow-sm`
                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
                }
              `}
            >
              <span
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                  ${isActive ? 'bg-white/60 dark:bg-white/10' : 'bg-[hsl(var(--muted))]'}
                `}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? item.accent : 'text-[hsl(var(--muted-foreground))]'}`}
                />
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{item.label}</p>
                <p className="text-[11px] opacity-60 truncate mt-0.5">{item.description}</p>
              </div>

              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                  isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-30'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* ── System Status Card ────────────────────────────────────── */}
      <div className="p-3 border-t border-[hsl(var(--border))]">
        <div className="p-3 rounded-xl bg-[hsl(var(--muted))] space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#22c55e]" />
            <span className="text-[11px] font-bold text-[hsl(var(--foreground))]">
              VPP Engine Status
            </span>
          </div>
          <div className="space-y-1 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
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
        <p className="mt-2 px-1 text-[10px] text-[hsl(var(--muted-foreground))] flex items-center justify-between">
          <span>SuryaVayu Hackathon 2026</span>
          <span className="font-mono">v2.0.0</span>
        </p>
      </div>
    </aside>
  );
}
