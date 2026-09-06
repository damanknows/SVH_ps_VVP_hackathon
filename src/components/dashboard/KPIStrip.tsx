'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { Telemetry } from '@/types';
import { ShieldCheck, IndianRupee, Sun, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';

interface KPIStripProps {
  telemetry: Telemetry;
  latencyMs?: number;
}

// Circular Gauge component for Autonomy %
function CircularGauge({ value, size = 48, strokeWidth = 4.5 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-zinc-200 dark:text-zinc-800"
        />
        {/* Progress Arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#22c55e"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
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

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.35, ease: 'easeOut' },
    }),
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full">
      {/* ── KPI 1: Microgrid Autonomy ── */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-[#22c55e]/40 hover:shadow-md group"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Microgrid Autonomy
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {autonomy.toFixed(1)}%
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-[#22c55e] bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              Self-Reliant
            </span>
          </div>
        </div>
        <CircularGauge value={autonomy} />
      </motion.div>

      {/* ── KPI 2: Savings This Hour ── */}
      <motion.div
        custom={1}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-emerald-500/40 hover:shadow-md group"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Savings this hour
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center">
              <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 -mr-0.5" />
              {savings.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-medium text-zinc-500">/hr</span>
          </div>
        </div>
        <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
          <IndianRupee className="w-5 h-5" />
        </div>
      </motion.div>

      {/* ── KPI 3: Active Gen ── */}
      <motion.div
        custom={2}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-[#f5a623]/40 hover:shadow-md group"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Active Gen
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#f5a623]">
              {activeGen}
            </span>
            <span className="text-xs font-bold text-zinc-500">kW</span>
          </div>
        </div>
        <div className="p-3 bg-amber-500/10 text-[#f5a623] rounded-xl shrink-0 group-hover:scale-105 transition-transform">
          <Sun className="w-5 h-5" />
        </div>
      </motion.div>

      {/* ── KPI 4: Grid Status ── */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-[#3b82f6]/40 hover:shadow-md group"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Grid Status
          </p>
          <div className="mt-1.5">
            {isExporting ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
                Exporting to Grid
              </span>
            ) : telemetry.gridStatus === 'islanded' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                <Globe className="w-3.5 h-3.5" />
                Islanded (Off-Grid)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                <ArrowDownRight className="w-3.5 h-3.5" />
                Importing from Grid
              </span>
            )}
          </div>
        </div>
        <div className="p-3 bg-blue-500/10 text-[#3b82f6] rounded-xl shrink-0 group-hover:scale-105 transition-transform">
          <Globe className="w-5 h-5" />
        </div>
      </motion.div>
    </div>
  );
}
