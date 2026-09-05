'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimulationResult } from '@/types';
import { IndianRupee, Leaf, Globe, Repeat, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartErrorBoundary } from '../common/ChartErrorBoundary';

interface ResultCardsProps {
  result: SimulationResult | null;
  isPending: boolean;
}

export function ResultCards({ result, isPending }: ResultCardsProps) {
  const { t } = useTranslation();

  if (isPending) {
    return (
      <div className="p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm h-full flex flex-col justify-center items-center gap-4 min-h-[360px]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          Running VPP Dynamic Multi-Objective Optimizer...
        </p>
      </div>
    );
  }

  if (!result) return null;

  const comparisonData = [
    {
      metric: 'Annual Savings (₹k)',
      Baseline: Math.round(result.baseline.annualSavingsInr / 1000),
      Proposed: Math.round(result.annualSavingsInr / 1000),
    },
    {
      metric: 'CO2 Avoided (Tons)',
      Baseline: 45,
      Proposed: result.co2eAvoidedTons,
    },
    {
      metric: 'Grid Autonomy (%)',
      Baseline: 40,
      Proposed: Math.round(result.gridIndependencePct),
    },
  ];

  const savingsGain = result.annualSavingsInr - result.baseline.annualSavingsInr;

  return (
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Annual Savings */}
        <div className="p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>{t('sim.annual_savings')}</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center">
            <IndianRupee className="w-5 h-5" />
            {(result.annualSavingsInr / 100000).toFixed(2)} Lakhs
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            +₹{(savingsGain / 1000).toFixed(0)}k gain vs baseline
          </p>
        </div>

        {/* Card 2: CO2 Avoided */}
        <div className="p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>{t('sim.co2_avoided')}</span>
            <div className="p-2 bg-teal-500/10 text-teal-500 rounded-lg">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
            {result.co2eAvoidedTons} Tons
          </p>
          <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-1">
            Carbon Offset Achieved
          </p>
        </div>

        {/* Card 3: Grid Independence */}
        <div className="p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>{t('sim.grid_independence')}</span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
            {result.gridIndependencePct.toFixed(1)}%
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
            Self-Powered Target
          </p>
        </div>

        {/* Card 4: BESS Cycles */}
        <div className="p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>{t('sim.bess_cycles')}</span>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
            {result.bessCyclesPerYear} / yr
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-1">
            Optimized Battery Degradation
          </p>
        </div>
      </div>

      {/* Baseline vs Proposed Bar Chart */}
      <div className="p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-4">
          Baseline Strategy vs Proposed Multi-Objective Model
        </h4>
        <div className="w-full h-[240px]">
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="metric" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    borderColor: '#3f3f46',
                    borderRadius: '8px',
                    color: '#f4f4f5',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Proposed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </div>
      </div>
    </div>
  );
}
