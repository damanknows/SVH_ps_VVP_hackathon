'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SimulationInput } from '@/types';
import { Sliders, RefreshCw, Battery, Zap, Coins, ShieldAlert } from 'lucide-react';

interface ControlPanelProps {
  onSimulate: (input: SimulationInput) => void;
  isPending: boolean;
}

export function ControlPanel({ onSimulate, isPending }: ControlPanelProps) {
  const { t } = useTranslation();

  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState(500);
  const [exportLimitKw, setExportLimitKw] = useState(300);
  const [carbonPriceInrPerTon, setCarbonPriceInrPerTon] = useState(850);
  const [criticalLoadPct, setCriticalLoadPct] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulate({
      batteryCapacityKwh,
      exportLimitKw,
      carbonPriceInrPerTon,
      criticalLoadPct,
    });
  };

  return (
    <div className="p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
              {t('sim.title')}
            </h3>
            <p className="text-xs text-zinc-500">
              Adjust microgrid capacity & market assumptions
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Slider 1: Battery Capacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <Battery className="w-4 h-4 text-emerald-500" />
                {t('sim.battery_cap')}
              </label>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {batteryCapacityKwh} kWh
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="1500"
              step="50"
              value={batteryCapacityKwh}
              onChange={(e) => setBatteryCapacityKwh(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Slider 2: Export Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <Zap className="w-4 h-4 text-blue-500" />
                {t('sim.export_limit')}
              </label>
              <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                {exportLimitKw} kW
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="1000"
              step="25"
              value={exportLimitKw}
              onChange={(e) => setExportLimitKw(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Slider 3: Carbon Price */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <Coins className="w-4 h-4 text-amber-500" />
                {t('sim.carbon_price')}
              </label>
              <span className="font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                ₹{carbonPriceInrPerTon} / Ton
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="3000"
              step="50"
              value={carbonPriceInrPerTon}
              onChange={(e) => setCarbonPriceInrPerTon(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Slider 4: Critical Load Reserve */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <ShieldAlert className="w-4 h-4 text-purple-500" />
                {t('sim.critical_load')}
              </label>
              <span className="font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                {criticalLoadPct}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={criticalLoadPct}
              onChange={(e) => setCriticalLoadPct(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
            {isPending ? 'Simulating Engine...' : t('sim.optimize')}
          </button>
        </form>
      </div>
    </div>
  );
}
