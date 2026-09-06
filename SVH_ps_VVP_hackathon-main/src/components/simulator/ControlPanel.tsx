'use client';

import React, { useState } from 'react';
import { SimulationInput } from '@/types';
import { Slider } from '@/components/ui/slider';
import { Sliders, RefreshCw, Battery, Zap, Coins, ShieldAlert, Play, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ControlPanelProps {
  onSimulate: (input: SimulationInput) => void;
  isPending: boolean;
}

export function ControlPanel({ onSimulate, isPending }: ControlPanelProps) {
  // 4 Sliders as requested with defaults
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState(500); // 0-2000, default 500
  const [exportLimitKw, setExportLimitKw] = useState(100);          // 0-500, default 100
  const [carbonPriceInrPerTon, setCarbonPriceInrPerTon] = useState(1000); // 0-5000, default 1000
  const [criticalLoadPct, setCriticalLoadPct] = useState(30);       // 0-100, default 30

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
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="p-6 bg-white/70 dark:bg-black/40 backdrop-blur-2xl border border-white/30 dark:border-white/20 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] h-full flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/20 dark:border-white/10">
          <div className="p-2.5 bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-2xl shadow-xs">
            <Sliders className="w-5 h-5 text-[#14b8a6]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
              Strategy Simulator
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Microgrid capacity & dispatch assumptions
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Slider A: Battery Capacity (kWh) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <Battery className="w-4 h-4 text-[#22c55e]" />
                Battery Capacity (kWh)
              </label>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 font-bold">
                {batteryCapacityKwh} kWh
              </span>
            </div>
            <Slider
              value={[batteryCapacityKwh]}
              onValueChange={(val: any) => {
                const num = Array.isArray(val) ? val[0] : Number(val);
                setBatteryCapacityKwh(num);
              }}
              min={0}
              max={2000}
              step={25}
              className="py-1 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>0 kWh</span>
              <span>1000 kWh</span>
              <span>2000 kWh</span>
            </div>
          </div>

          {/* Slider B: Export Limit (kW) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <Zap className="w-4 h-4 text-[#3b82f6]" />
                Export Limit (kW)
              </label>
              <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20 font-bold">
                {exportLimitKw} kW
              </span>
            </div>
            <Slider
              value={[exportLimitKw]}
              onValueChange={(val: any) => {
                const num = Array.isArray(val) ? val[0] : Number(val);
                setExportLimitKw(num);
              }}
              min={0}
              max={500}
              step={10}
              className="py-1 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>0 kW</span>
              <span>250 kW</span>
              <span>500 kW</span>
            </div>
          </div>

          {/* Slider C: Carbon Price (₹/ton) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <Coins className="w-4 h-4 text-[#f5a623]" />
                Carbon Price (₹/ton)
              </label>
              <span className="font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20 font-bold">
                ₹{carbonPriceInrPerTon.toLocaleString('en-IN')} / ton
              </span>
            </div>
            <Slider
              value={[carbonPriceInrPerTon]}
              onValueChange={(val: any) => {
                const num = Array.isArray(val) ? val[0] : Number(val);
                setCarbonPriceInrPerTon(num);
              }}
              min={0}
              max={5000}
              step={50}
              className="py-1 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>₹0</span>
              <span>₹2,500</span>
              <span>₹5,000</span>
            </div>
          </div>

          {/* Slider D: Critical Load (%) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <ShieldAlert className="w-4 h-4 text-purple-500" />
                Critical Load (%)
              </label>
              <span className="font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-purple-500/20 font-bold">
                {criticalLoadPct}%
              </span>
            </div>
            <Slider
              value={[criticalLoadPct]}
              onValueChange={(val: any) => {
                const num = Array.isArray(val) ? val[0] : Number(val);
                setCriticalLoadPct(num);
              }}
              min={0}
              max={100}
              step={1}
              className="py-1 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* n8n-style Gradient Action Button: Re-Optimize Year */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white shadow-lg shadow-teal-500/25 border border-teal-400/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 mt-4 active:scale-98"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Optimizing Horizon...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Re-Optimize Year</span>
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
