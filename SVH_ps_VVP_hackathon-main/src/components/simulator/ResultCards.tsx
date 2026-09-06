'use client';

import React from 'react';
import { SimulationResult } from '@/types';
import { IndianRupee, Leaf, Globe, Repeat, TrendingUp, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { ChartErrorBoundary } from '../common/ChartErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface ResultCardsProps {
  result: SimulationResult | null;
  isPending: boolean;
}

export function ResultCards({ result, isPending }: ResultCardsProps) {
  // ── Loading Skeleton State ──
  if (isPending) {
    return (
      <div className="space-y-6">
        {/* 4 Skeleton KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-32 rounded-lg" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          ))}
        </div>

        {/* Skeleton Bar Chart Card */}
        <div className="p-6 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-64 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
          </div>
          <Skeleton className="h-[240px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!result) return null;

  // Comparison Bar Chart data for Annual Savings: Baseline vs Proposed
  const baselineSavingsLakhs = +(result.baseline.annualSavingsInr / 100000).toFixed(2);
  const proposedSavingsLakhs = +(result.annualSavingsInr / 100000).toFixed(2);

  const savingsComparisonData = [
    {
      category: 'Annual Savings',
      Baseline: baselineSavingsLakhs,
      Proposed: proposedSavingsLakhs,
      diff: +(proposedSavingsLakhs - baselineSavingsLakhs).toFixed(2),
    },
  ];

  const savingsGain = result.annualSavingsInr - result.baseline.annualSavingsInr;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* ── 4 KPI Result Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Annual Savings (₹) */}
        <div className="p-5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs transition-all hover:border-emerald-500/50 hover:shadow-md group">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px]">Annual Savings</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center">
            <IndianRupee className="w-5 h-5 -mr-0.5" />
            {(result.annualSavingsInr / 100000).toFixed(2)} L
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            +₹{(savingsGain / 1000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}k vs baseline
          </p>
        </div>

        {/* Card 2: CO2 Avoided (tons) */}
        <div className="p-5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs transition-all hover:border-teal-500/50 hover:shadow-md group">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px]">CO2 Avoided</span>
            <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl group-hover:scale-105 transition-transform">
              <Leaf className="w-4 h-4 text-[#14b8a6]" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
            {result.co2eAvoidedTons} <span className="text-base font-bold text-zinc-500">Tons</span>
          </p>
          <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-1.5">
            Carbon Offset Achieved
          </p>
        </div>

        {/* Card 3: Grid Independence (%) */}
        <div className="p-5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs transition-all hover:border-blue-500/50 hover:shadow-md group">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px]">Grid Independence</span>
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-105 transition-transform">
              <Globe className="w-4 h-4 text-[#3b82f6]" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
            {result.gridIndependencePct.toFixed(1)}%
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1.5">
            Self-Powered Target
          </p>
        </div>

        {/* Card 4: BESS Cycles/Year */}
        <div className="p-5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs transition-all hover:border-purple-500/50 hover:shadow-md group">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px]">BESS Cycles/Year</span>
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl group-hover:scale-105 transition-transform">
              <Repeat className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
            {result.bessCyclesPerYear} <span className="text-base font-bold text-zinc-500">/ yr</span>
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-1.5">
            Optimized Battery Health
          </p>
        </div>
      </div>

      {/* ── Baseline vs Proposed Bar Chart for Annual Savings ── */}
      <div className="p-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-extrabold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                Annual Savings Comparison (₹ Lakhs)
              </h4>
              <p className="text-[11px] text-zinc-500">
                Baseline Dispatch Strategy vs Proposed AI Multi-Objective Model
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Gain: +₹{(savingsGain / 100000).toFixed(2)} Lakhs / yr
          </span>
        </div>

        <div className="w-full h-[250px] pt-2">
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsComparisonData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }} barGap={24}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="category" stroke="#888888" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickFormatter={(val) => `₹${val}L`}
                  domain={[0, Math.max(20, Math.ceil(proposedSavingsLakhs * 1.3))]}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [`₹${value} Lakhs`, name === 'Proposed' ? 'Proposed AI Model' : 'Baseline Model']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Baseline" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={90} />
                <Bar dataKey="Proposed" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={90} />
              </BarChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </div>
      </div>
    </motion.div>
  );
}
