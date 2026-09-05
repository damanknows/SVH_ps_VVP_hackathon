import React from 'react';
import { TelemetryPoint } from '../types/energy';
import { Sun, Wind, BatteryCharging, Zap, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';

interface MicrogridSynopticProps {
  telemetry: TelemetryPoint;
}

export const MicrogridSynoptic: React.FC<MicrogridSynopticProps> = ({ telemetry }) => {
  const totalGen = telemetry.solarKw + telemetry.windKw;
  const isCharging = telemetry.batteryFlowKw > 0;
  const isDischarging = telemetry.batteryFlowKw < 0;
  const isExporting = telemetry.gridExportKw > 0;
  const isImporting = telemetry.gridImportKw > 0;

  return (
    <div className="bg-[#131B2E]/70 border border-slate-700/50 rounded-xl p-5 mb-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h3 className="text-sm font-sans font-bold text-slate-100 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            Active Microgrid Energy Flow Synoptic
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Real-time directional power transfer between Renewable Generators, Campus Bus, BESS & Utility Grid
          </p>
        </div>

        <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60">
          NODE-04 SYNOPTIC ACTIVE
        </span>
      </div>

      {/* Synoptic Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center font-sans text-xs">
        
        {/* Node 1: Generators */}
        <div className="p-4 bg-slate-900/90 border border-amber-500/40 rounded-lg text-center relative">
          <div className="flex items-center justify-center space-x-2 text-amber-400 mb-1">
            <Sun className="w-4 h-4" />
            <Wind className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xs font-medium text-slate-300">Clean Generators</p>
          <p className="text-lg font-mono font-bold text-white mt-1">{totalGen} kW</p>
          <div className="text-[11px] text-slate-400 mt-1 flex justify-center space-x-2 font-mono">
            <span className="text-amber-400">PV: {telemetry.solarKw}kW</span>
            <span className="text-sky-400">Wind: {telemetry.windKw}kW</span>
          </div>
        </div>

        {/* Connector 1 -> 2 */}
        <div className="hidden md:flex flex-col items-center justify-center text-amber-400 font-mono text-[11px]">
          <span className="text-slate-400">Supply</span>
          <div className="flex items-center space-x-1 my-1">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
            <ArrowRight className="w-5 h-5 text-amber-400" />
          </div>
          <span>+{totalGen} kW</span>
        </div>

        {/* Node 2: Campus Bus */}
        <div className="p-4 bg-slate-900/90 border border-purple-500/40 rounded-lg text-center relative">
          <div className="flex items-center justify-center space-x-1 text-purple-400 mb-1">
            <Zap className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-slate-300">Campus AC Bus</p>
          <p className="text-lg font-mono font-bold text-white mt-1">{telemetry.campusDemandKw} kW</p>
          <p className="text-[11px] text-purple-400 mt-1">Active Campus Load</p>
        </div>

        {/* Node 3 & 4 (Battery & Grid) */}
        <div className="space-y-3">
          {/* BESS Storage */}
          <div className={`p-3 bg-slate-900/90 border rounded-lg flex items-center justify-between ${
            isCharging ? 'border-emerald-500/50' : isDischarging ? 'border-amber-500/50' : 'border-slate-800'
          }`}>
            <div className="flex items-center space-x-2">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="font-medium text-slate-200">BESS Battery</p>
                <p className="text-[11px] text-slate-400 font-mono">SoC: {telemetry.batterySoc}%</p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className={`text-xs font-bold ${isCharging ? 'text-emerald-400' : isDischarging ? 'text-amber-400' : 'text-slate-400'}`}>
                {isCharging ? `← +${telemetry.batteryFlowKw}kW` : isDischarging ? `→ ${telemetry.batteryFlowKw}kW` : '0 kW'}
              </span>
            </div>
          </div>

          {/* Utility Grid */}
          <div className={`p-3 bg-slate-900/90 border rounded-lg flex items-center justify-between ${
            isExporting ? 'border-emerald-500/50' : isImporting ? 'border-rose-500/50' : 'border-slate-800'
          }`}>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-slate-400" />
              <div>
                <p className="font-medium text-slate-200">DISCOM Grid</p>
                <p className="text-[11px] text-slate-400 font-mono">Feeder 11kV</p>
              </div>
            </div>
            <div className="text-right font-mono">
              {isExporting ? (
                <span className="text-xs font-bold text-emerald-400">
                  ← Exp: {telemetry.gridExportKw}kW
                </span>
              ) : isImporting ? (
                <span className="text-xs font-bold text-rose-400">
                  → Imp: {telemetry.gridImportKw}kW
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-400">0 kW Sync</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
