import React from 'react';
import { ScenarioId } from '../types/energy';
import { Cpu, FileText, Terminal, Activity, Sun, CloudRain, Moon, Command } from 'lucide-react';

interface HeaderProps {
  scenario: ScenarioId;
  onScenarioChange: (s: ScenarioId) => void;
  isLiveBackend: boolean;
  telemetrySourceLabel: string;
  onOpenReport: () => void;
  onOpenArch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  scenario,
  onScenarioChange,
  isLiveBackend,
  telemetrySourceLabel,
  onOpenReport,
  onOpenArch
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 lg:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Branding & Govt Emblem Header */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
              SV
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-bold text-slate-100 tracking-tight">
                  SURYA-VAYU <span className="text-slate-400 font-normal">| VPP-ENGINE</span>
                </span>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono px-2 py-0.5 rounded">
                  DTE-RAJASTHAN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Directorate of Technical Education • Campus Node #04 (Jodhpur)
              </p>
            </div>
          </div>

          {/* Telemetry Source Pill */}
          <div className="flex items-center space-x-2 font-mono text-[10px]">
            <span className={`px-2 py-0.5 rounded border flex items-center gap-1.5 transition-colors ${
              isLiveBackend
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-zinc-900 text-amber-400 border-zinc-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLiveBackend ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
              <span>{telemetrySourceLabel}</span>
            </span>
          </div>
        </div>

        {/* Center: Scenario Switcher + Shift+S Pitch Hint */}
        <div className="flex items-center bg-slate-950 px-2 py-1 rounded border border-slate-800 text-xs font-mono w-full md:w-auto justify-between md:justify-center gap-2">
          
          <span className="text-[10px] text-slate-500 uppercase tracking-wider hidden xl:inline">
            Pitch Demo:
          </span>

          <div className="flex items-center space-x-1 overflow-x-auto">
            <button
              onClick={() => onScenarioChange('SUNNY_NOON')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                scenario === 'SUNNY_NOON'
                  ? 'bg-slate-800 text-amber-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Scenario 01: Normal Sunny Noon (Surplus)"
            >
              <Sun className="w-3 h-3 text-amber-400" />
              <span>01: Sunny Surplus</span>
            </button>

            <button
              onClick={() => onScenarioChange('CLOUD_BURST')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                scenario === 'CLOUD_BURST'
                  ? 'bg-amber-950/90 text-amber-200 border border-amber-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Scenario 02: Monsoon Cloud Burst (Deficit)"
            >
              <CloudRain className="w-3 h-3 text-cyan-400" />
              <span>02: Cloud Deficit</span>
            </button>

            <button
              onClick={() => onScenarioChange('EVENING_PEAK')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                scenario === 'EVENING_PEAK'
                  ? 'bg-cyan-950/90 text-cyan-200 border border-cyan-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Scenario 03: Evening Peak ToD Tariff Shaving"
            >
              <Moon className="w-3 h-3 text-emerald-400" />
              <span>03: Peak Shaving</span>
            </button>
          </div>

          {/* Keyboard shortcut hint badge */}
          <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[10px]">
            <Command className="w-2.5 h-2.5" /> Shift+S
          </span>
        </div>

        {/* Right: Technical Action Modals */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end text-xs font-mono">
          <button
            onClick={onOpenArch}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Architecture</span>
          </button>

          <button
            onClick={onOpenReport}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audit Log</span>
          </button>
        </div>

      </div>
    </header>
  );
};
