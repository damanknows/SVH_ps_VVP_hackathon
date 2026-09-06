'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { mockEngineStatus } from '@/lib/mockData';
import { Cpu, Activity, Globe, ArrowUpRight } from 'lucide-react';

interface EngineStatusBannerProps {
  optimizationStatus?: string;
  wsProtocol?: string;
  microgridId?: string;
  gridStatusText?: string;
}

export function EngineStatusBanner({
  optimizationStatus = mockEngineStatus.optimizationStatus,
  wsProtocol = mockEngineStatus.wsProtocol,
  microgridId = mockEngineStatus.microgridId,
  gridStatusText = 'Exporting to Grid',
}: EngineStatusBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 w-full"
    >
      {/* ── Left Box: VPP Engine Status ── */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Cpu className="w-4 h-4" />
            </span>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              VPP Engine Status
            </h4>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Activity className="w-3 h-3 animate-pulse" />
            Online & Optimizing
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 font-mono text-xs">
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase block">
              Optimization
            </span>
            <span className="font-bold text-[#22c55e] truncate block">
              {optimizationStatus}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase block">
              WS Protocol
            </span>
            <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block">
              {wsProtocol}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase block">
              Microgrid ID
            </span>
            <span className="font-bold text-[#3b82f6] truncate block">
              {microgridId}
            </span>
          </div>
        </div>
      </div>

      {/* ── Right Box: Grid Interconnect State ── */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-[#3b82f6]">
              <Globe className="w-4 h-4" />
            </span>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Grid Interconnect State
            </h4>
          </div>

          <div className="flex items-center gap-2.5 pt-1 pl-8">
            <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              {gridStatusText}
            </span>
          </div>
        </div>

        {/* Green Pulsing Dot Indicator */}
        <div className="flex items-center gap-2 pr-2">
          <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono hidden sm:inline">
            Active Feed
          </span>
        </div>
      </div>
    </motion.div>
  );
}
