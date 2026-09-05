'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Telemetry } from '@/types';
import { Zap, ShieldCheck, IndianRupee, Sun, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';

interface KPIStripProps {
  telemetry: Telemetry;
  latencyMs: number;
}

export function KPIStrip({ telemetry, latencyMs }: KPIStripProps) {
  const { t } = useTranslation();

  const totalRenewable = Math.max(0, telemetry.flowsKw.solar || 0) + Math.max(0, telemetry.flowsKw.wind || 0);

  const gridStatusConfig = {
    export: {
      label: t('grid.export'),
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      icon: ArrowUpRight,
    },
    import: {
      label: t('grid.import'),
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: ArrowDownRight,
    },
    islanded: {
      label: t('grid.islanded'),
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      icon: Globe,
    },
  }[telemetry.gridStatus] || {
    label: telemetry.gridStatus,
    badgeBg: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30',
    icon: Globe,
  };

  const GridIcon = gridStatusConfig.icon;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* KPI 1: Grid Status */}
      <div className="p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('kpi.grid_status')}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${gridStatusConfig.badgeBg}`}>
              <GridIcon className="w-3.5 h-3.5" />
              {gridStatusConfig.label}
            </span>
          </div>
        </div>
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-300">
          <Globe className="w-5 h-5" />
        </div>
      </div>

      {/* KPI 2: Autonomy % */}
      <div className="p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('kpi.autonomy')}
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {telemetry.autonomyPct.toFixed(1)}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Self-Reliant</span>
          </div>
        </div>
        <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      {/* KPI 3: Savings Per Hour */}
      <div className="p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t('kpi.savings')}
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center">
              <IndianRupee className="w-4 h-4 inline" />
              {telemetry.savingsPerHour.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-zinc-500">/ hr</span>
          </div>
        </div>
        <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
          <Zap className="w-5 h-5" />
        </div>
      </div>

      {/* KPI 4: Active Renewable Power */}
      <div className="p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex items-center justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Active Generation
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-extrabold tracking-tight text-amber-500">
              {totalRenewable}
            </span>
            <span className="text-xs font-semibold text-zinc-500">kW</span>
          </div>
        </div>
        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
          <Sun className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
