'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { mockEngineStatus } from '@/lib/mockData';
import { Cpu, Activity, Globe, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { TiltCard } from '@/components/common/TiltCard';

// Dynamically import 3D Canvas component without SSR
const ThreeDModel = dynamic(() => import('./ThreeDModel'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[150px] sm:h-[170px] rounded-3xl bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 flex items-center justify-center text-xs text-zinc-400 animate-pulse">
      Loading 3D Asset Twin...
    </div>
  ),
});

interface EngineStatusBannerProps {
  optimizationStatus?: string;
  wsProtocol?: string;
  microgridId?: string;
  gridStatusText?: string;
  socPct?: number;
  activeGenKw?: number;
}

export function EngineStatusBanner({
  optimizationStatus = mockEngineStatus.optimizationStatus,
  wsProtocol = mockEngineStatus.wsProtocol,
  microgridId = mockEngineStatus.microgridId,
  gridStatusText = 'Exporting to Grid',
  socPct = 82.4,
  activeGenKw = 395,
}: EngineStatusBannerProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full items-stretch">
      {/* ── Left Box: VPP Engine Status (5 cols) ── */}
      <div className="lg:col-span-4">
        <TiltCard className="h-full">
          <div className="p-5 h-full rounded-3xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Cpu className="w-4 h-4" />
                </span>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  VPP Engine Status
                </h4>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                <Activity className="w-3 h-3 animate-pulse" />
                Autonomous Active
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 dark:border-white/10 font-mono text-xs">
              <div>
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase block">
                  Optimization
                </span>
                <span className="font-bold text-[#22c55e] truncate block mt-0.5">
                  {optimizationStatus}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase block">
                  Protocol
                </span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block mt-0.5">
                  {wsProtocol}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase block">
                  Microgrid ID
                </span>
                <span className="font-bold text-[#3b82f6] truncate block mt-0.5">
                  {microgridId}
                </span>
              </div>
            </div>
          </div>
        </TiltCard>
      </div>

      {/* ── Middle Box: Grid Interconnect State (4 cols) ── */}
      <div className="lg:col-span-4">
        <TiltCard className="h-full">
          <div className="p-5 h-full rounded-3xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-500/15 text-[#3b82f6]">
                  <Globe className="w-4 h-4" />
                </span>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Grid Interconnect State
                </h4>
              </div>

              {/* Green Pulsing Dot Beacon */}
              <div className="flex items-center gap-2">
                <div className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  Live Feed
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/20 dark:border-white/10 flex items-center justify-between">
              <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-sans tracking-tight">
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                {gridStatusText}
              </span>
              <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 bg-white/30 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                45 kW Export
              </span>
            </div>
          </div>
        </TiltCard>
      </div>

      {/* ── Right Box: 3D Interactive Solar & Turbine Asset Twin (4 cols) ── */}
      <div className="lg:col-span-4">
        <ThreeDModel socPct={socPct} activeGenKw={activeGenKw} />
      </div>
    </div>
  );
}
