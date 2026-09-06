'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Telemetry } from '@/types';
import { ShieldCheck, IndianRupee, Sun, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';
import { TiltCard } from '@/components/common/TiltCard';
import { LiveCounter } from '@/components/common/LiveCounter';

interface KPIStripProps {
  telemetry: Telemetry;
  latencyMs?: number;
}

// Circular Gauge component for Autonomy %
function CircularGauge({ value, size = 52, strokeWidth = 4.5 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-zinc-200/50 dark:text-zinc-800/60"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#22c55e"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
      </div>
    </div>
  );
}

export function KPIStrip({ telemetry }: KPIStripProps) {
  const autonomy = telemetry.autonomyPct ?? 82.4;
  const savings = telemetry.savingsPerHour ?? 3413;
  const activeGen = telemetry.activeGenKw ?? 395;
  const isExporting = telemetry.gridStatus === 'export' || (telemetry.flowsKw?.grid ?? 0) < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* ── KPI 1: Microgrid Autonomy ── */}
      <TiltCard>
        <div className="p-5 h-full rounded-3xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-between transition-all hover:border-[#22c55e]/50 group kpi-shimmer-sweep">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Microgrid Autonomy
            </p>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-3xl sm:text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
                <LiveCounter value={autonomy} decimals={1} suffix="%" showTrend={true} />
              </span>
            </div>
            <div className="mt-1">
              <span className="text-[10px] sm:text-xs font-semibold text-[#22c55e] bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                Self-Reliant
              </span>
            </div>
          </div>
          <CircularGauge value={autonomy} />
        </div>
      </TiltCard>

      {/* ── KPI 2: Savings This Hour ── */}
      <TiltCard>
        <div className="p-5 h-full rounded-3xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-between transition-all hover:border-emerald-500/50 group kpi-shimmer-sweep">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Savings this hour
            </p>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-3xl sm:text-4xl font-light tracking-tight text-emerald-600 dark:text-emerald-400 font-mono flex items-center">
                <IndianRupee className="w-6 h-6 -mr-1" />
                <LiveCounter value={savings} showTrend={true} />
              </span>
            </div>
            <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-wider">
              per hour
            </p>
          </div>
          <div className="p-3.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0 group-hover:scale-110 transition-transform shadow-xs">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </TiltCard>

      {/* ── KPI 3: Active Gen ── */}
      <TiltCard>
        <div className="p-5 h-full rounded-3xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-between transition-all hover:border-[#f5a623]/50 group kpi-shimmer-sweep">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Active Gen
            </p>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-3xl sm:text-4xl font-light tracking-tight text-[#f5a623] font-mono">
                <LiveCounter value={activeGen} suffix=" kW" showTrend={true} />
              </span>
            </div>
            <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-wider">
              Solar + Wind Output
            </p>
          </div>
          <div className="p-3.5 bg-amber-500/15 text-[#f5a623] rounded-2xl shrink-0 group-hover:scale-110 transition-transform shadow-xs">
            <Sun className="w-5 h-5" />
          </div>
        </div>
      </TiltCard>

      {/* ── KPI 4: Grid Status ── */}
      <TiltCard>
        <div className="p-5 h-full rounded-3xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-between transition-all hover:border-[#3b82f6]/50 group kpi-shimmer-sweep">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Grid Status
            </p>
            <div className="mt-2">
              {isExporting ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Exporting to Grid
                </span>
              ) : telemetry.gridStatus === 'islanded' ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shadow-xs">
                  <Globe className="w-3.5 h-3.5" />
                  Islanded (Off-Grid)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shadow-xs">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Importing from Grid
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mt-2 uppercase tracking-wider">
              Interconnect Live
            </p>
          </div>
          <div className="p-3.5 bg-blue-500/15 text-[#3b82f6] rounded-2xl shrink-0 group-hover:scale-110 transition-transform shadow-xs">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
