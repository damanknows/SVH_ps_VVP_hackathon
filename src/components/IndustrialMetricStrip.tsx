import React from 'react';
import { TelemetryPoint } from '../types/energy';
import { Zap, BatteryCharging, ArrowDownRight, ArrowUpRight, Leaf, DollarSign } from 'lucide-react';

interface IndustrialMetricStripProps {
  current: TelemetryPoint;
}

export const IndustrialMetricStrip: React.FC<IndustrialMetricStripProps> = ({ current }) => {
  const totalGenKw = current.solarKw + current.windKw;
  const isCharging = current.batteryFlowKw > 0;
  const isDischarging = current.batteryFlowKw < 0;

  // Calculate 10 discrete tick marks for battery bar (Objective 4)
  const ticksCount = 10;
  const activeTicks = Math.round((current.batterySoc / 100) * ticksCount);

  // Calculated daily savings & CO2 avoided
  const dailySavingsInr = Math.round(totalGenKw * 7.5);
  const co2AvoidedKg = Math.round(totalGenKw * 0.82);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      
      {/* Card 1: Renewable Generation */}
      <div className="bg-[#131B2E]/70 border border-slate-700/50 border-t-2 border-t-amber-500/80 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-sans font-medium text-slate-300">Renewable Generation</span>
          <span className="text-xs font-mono font-semibold text-emerald-400">
            {current.campusDemandKw > 0 ? Math.min(100, Math.round((totalGenKw / current.campusDemandKw) * 100)) : 100}% Share
          </span>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-mono font-bold text-white">{totalGenKw}</span>
          <span className="text-sm font-sans text-slate-400">kW</span>
        </div>

        {/* Micro bar for Solar & Wind split */}
        <div className="mt-3 pt-3 border-t border-slate-700/40 flex items-center justify-between text-xs font-sans">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-slate-400">Solar:</span>
            <span className="font-mono font-semibold text-amber-400">{current.solarKw} kW</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span className="text-slate-400">Wind:</span>
            <span className="font-mono font-semibold text-sky-400">{current.windKw} kW</span>
          </div>
        </div>
      </div>

      {/* Card 2: BESS Energy Storage with 10 Segmented Ticks */}
      <div className="bg-[#131B2E]/70 border border-slate-700/50 border-t-2 border-t-emerald-500/80 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-sans font-medium text-slate-300">BESS Battery Storage</span>
          <span className={`text-xs font-sans px-2 py-0.5 rounded-full border ${
            isCharging
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : isDischarging
              ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {isCharging ? `Charging +${current.batteryFlowKw}kW` : isDischarging ? `Discharging ${current.batteryFlowKw}kW` : 'Standby'}
          </span>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-mono font-bold text-white">{current.batterySoc}%</span>
          <span className="text-sm font-sans text-slate-400">250 kWh LiFePO4</span>
        </div>

        {/* 10 Discrete Segmented Tick Marks Bar */}
        <div className="mt-3 pt-3 border-t border-slate-700/40">
          <div className="flex items-center space-x-1 justify-between">
            {Array.from({ length: ticksCount }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2 flex-1 rounded-sm transition-all duration-300 ${
                  idx < activeTicks
                    ? current.batterySoc < 30
                      ? 'bg-rose-500'
                      : current.batterySoc > 80
                      ? 'bg-emerald-400'
                      : 'bg-sky-400'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Card 3: Campus Demand vs Grid */}
      <div className="bg-[#131B2E]/70 border border-slate-700/50 border-t-2 border-t-sky-500/80 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-sans font-medium text-slate-300">Campus Demand & Grid</span>
          {current.gridExportKw > 0 ? (
            <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
              Net Export: {current.gridExportKw} kW
            </span>
          ) : (
            <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60">
              Grid Import: {current.gridImportKw} kW
            </span>
          )}
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-mono font-bold text-white">{current.campusDemandKw}</span>
          <span className="text-sm font-sans text-slate-400">kW Campus Load</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700/40 flex items-center justify-between text-xs font-sans text-slate-400">
          <span>11kV Substation Feeder</span>
          <span>DISCOM: JdVVNL</span>
        </div>
      </div>

      {/* Card 4: Financial & Carbon Offset */}
      <div className="bg-[#131B2E]/70 border border-slate-700/50 border-t-2 border-t-emerald-400/80 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-sans font-medium text-slate-300">Sustainability & Offset</span>
          <span className="text-xs font-mono text-emerald-400 font-semibold">Clean Energy</span>
        </div>

        <div className="flex items-baseline space-x-1">
          <span className="text-base font-mono text-amber-400 font-bold">₹</span>
          <span className="text-3xl font-mono font-bold text-white">
            {dailySavingsInr.toLocaleString('en-IN')}
          </span>
          <span className="text-xs font-sans text-slate-400 ml-1">saved today</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700/40 flex items-center justify-between text-xs font-sans">
          <div className="flex items-center space-x-1 text-emerald-400 font-medium">
            <Leaf className="w-3.5 h-3.5" />
            <span>{co2AvoidedKg} kg CO₂ avoided</span>
          </div>
        </div>
      </div>

    </div>
  );
};
