import React from 'react';
import { TelemetryPoint } from '../types/energy';
import { Zap, BatteryCharging, ArrowDownRight, ArrowUpRight, ShieldCheck, DollarSign } from 'lucide-react';

interface IndustrialMetricStripProps {
  current: TelemetryPoint;
}

export const IndustrialMetricStrip: React.FC<IndustrialMetricStripProps> = ({ current }) => {
  const totalGenKw = current.solarKw + current.windKw;
  const greenSharePct = current.campusDemandKw > 0
    ? Math.min(100, Math.round((totalGenKw / current.campusDemandKw) * 100))
    : 100;

  const isCharging = current.batteryFlowKw > 0;
  const isDischarging = current.batteryFlowKw < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      
      {/* 1. Renewable Generation Telemetry */}
      <div className="console-panel p-4 rounded-sm relative">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-mono uppercase tracking-wider text-[11px]">Renewable Output</span>
          <span className="font-mono text-emerald-400 font-semibold">{greenSharePct}% SHARE</span>
        </div>
        
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-mono font-bold text-slate-100">{totalGenKw}</span>
          <span className="text-xs font-mono text-slate-400">kW Active</span>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Solar PV: <strong className="text-amber-400 font-normal">{current.solarKw} kW</strong></span>
          <span>Wind: <strong className="text-cyan-400 font-normal">{current.windKw} kW</strong></span>
        </div>
      </div>

      {/* 2. BESS Energy Storage Bank */}
      <div className="console-panel p-4 rounded-sm relative">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-mono uppercase tracking-wider text-[11px]">BESS Storage SOC</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
            isCharging
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
              : isDischarging
              ? 'bg-amber-950 text-amber-400 border-amber-800'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {isCharging ? `CHG +${current.batteryFlowKw}kW` : isDischarging ? `DISCHG ${current.batteryFlowKw}kW` : 'STANDBY'}
          </span>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-mono font-bold text-slate-100">{current.batterySoc}%</span>
          <span className="text-xs font-mono text-slate-400">250 kWh Capacity</span>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Chemistry: <strong className="text-slate-300 font-normal">LiFePO4</strong></span>
          <span>Target SOC: <strong className="text-slate-300 font-normal">90%</strong></span>
        </div>
      </div>

      {/* 3. Campus Demand vs Grid Import */}
      <div className="console-panel p-4 rounded-sm relative">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-mono uppercase tracking-wider text-[11px]">Campus Load / Grid</span>
          <span className="font-mono text-slate-300">DEMAND: {current.campusDemandKw} kW</span>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className={`text-2xl font-mono font-bold ${current.gridImportKw > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
            {current.gridImportKw}
          </span>
          <span className="text-xs font-mono text-slate-400">kW Grid Import</span>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Grid Export: <strong className="text-emerald-400 font-normal">{current.gridExportKw} kW</strong></span>
          <span>Feeder: <strong className="text-slate-300 font-normal">JdVVNL 11kV</strong></span>
        </div>
      </div>

      {/* 4. Financial & Carbon Offset Metrics */}
      <div className="console-panel p-4 rounded-sm relative">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-mono uppercase tracking-wider text-[11px]">Daily Financial Offset</span>
          <span className="font-mono text-emerald-400">EST. TARIFF</span>
        </div>

        <div className="flex items-baseline space-x-1">
          <span className="text-sm font-mono text-amber-400">₹</span>
          <span className="text-2xl font-mono font-bold text-slate-100">
            {Math.round((current.solarKw + current.windKw) * 7.5).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>CO₂ Avoided: <strong className="text-emerald-400 font-normal">{Math.round((current.solarKw + current.windKw) * 0.82)} kg</strong></span>
          <span>Rate: <strong className="text-slate-300 font-normal">₹7.5/kWh</strong></span>
        </div>
      </div>

    </div>
  );
};
