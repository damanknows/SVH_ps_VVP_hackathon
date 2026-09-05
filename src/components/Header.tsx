import React from 'react';
import { ScenarioId } from '../types/energy';
import { Cpu, FileText, Sun, CloudRain, Moon, Sliders } from 'lucide-react';

interface HeaderProps {
  scenario: ScenarioId;
  onScenarioChange: (s: ScenarioId) => void;
  isLiveBackend: boolean;
  telemetrySourceLabel: string;
  onOpenReport: () => void;
  onOpenArch: () => void;
  isSimDrawerOpen: boolean;
  onToggleSimDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  scenario,
  onScenarioChange,
  isLiveBackend,
  onOpenReport,
  onOpenArch,
  isSimDrawerOpen,
  onToggleSimDrawer
}) => {
  return (
    <header className="bg-[#0B0F17] border-b border-slate-800/80 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Brand Logo & Subtitle */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/70 flex items-center justify-center font-mono font-bold text-emerald-400 text-sm shadow-sm">
              SV
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-sans text-base font-bold text-slate-100 tracking-tight">
                  SuryaVayu <span className="text-slate-400 font-normal text-sm">EMS</span>
                </span>
                <span className="bg-slate-800/80 text-slate-300 border border-slate-700/60 text-xs font-sans px-2 py-0.5 rounded-full">
                  DTE Rajasthan
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Smart Campus Microgrid • Jodhpur Node-04
              </p>
            </div>
          </div>

          {/* Telemetry Status Pill (Mobile) */}
          <div className="flex items-center space-x-2 md:hidden">
            <span className={`px-2.5 py-1 rounded-full text-xs font-sans border flex items-center gap-1.5 ${
              isLiveBackend
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-slate-800/80 text-slate-300 border-slate-700/60'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLiveBackend ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{isLiveBackend ? 'Live Modbus' : 'Synthetic'}</span>
            </span>
          </div>
        </div>

        {/* Center: Live Telemetry Pill */}
        <div className="hidden md:flex items-center">
          <span className={`px-3 py-1 rounded-full text-xs font-sans border flex items-center gap-2 ${
            isLiveBackend
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : 'bg-slate-800/60 text-slate-300 border-slate-700/60'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLiveBackend ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span>{isLiveBackend ? 'Live Modbus TCP/MQTT Link' : 'Autonomous Synthetic Engine'}</span>
          </span>
        </div>

        {/* Right: Controls & Segmented Buttons */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          
          {/* Live Simulation Controls Button */}
          <button
            onClick={onToggleSimDrawer}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans transition-all flex items-center gap-1.5 border ${
              isSimDrawerOpen
                ? 'bg-amber-950/80 text-amber-300 border-amber-800 font-semibold'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/60'
            }`}
            title="Open Live Simulation Stress-Test Sliders"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulation Controls</span>
          </button>

          {/* Segmented Control Toggle for 3 Scenarios */}
          <div className="bg-slate-900/90 p-1 rounded-lg border border-slate-800 flex items-center space-x-1">
            <button
              onClick={() => onScenarioChange('SUNNY_NOON')}
              className={`px-2.5 py-1 rounded text-xs font-sans transition-all flex items-center gap-1 ${
                scenario === 'SUNNY_NOON'
                  ? 'bg-slate-800 text-amber-300 border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-400" />
              <span>Sunny Noon</span>
            </button>

            <button
              onClick={() => onScenarioChange('CLOUD_BURST')}
              className={`px-2.5 py-1 rounded text-xs font-sans transition-all flex items-center gap-1 ${
                scenario === 'CLOUD_BURST'
                  ? 'bg-slate-800 text-sky-300 border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CloudRain className="w-3 h-3 text-sky-400" />
              <span>Cloud Deficit</span>
            </button>

            <button
              onClick={() => onScenarioChange('EVENING_PEAK')}
              className={`px-2.5 py-1 rounded text-xs font-sans transition-all flex items-center gap-1 ${
                scenario === 'EVENING_PEAK'
                  ? 'bg-slate-800 text-emerald-300 border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3 h-3 text-emerald-400" />
              <span>Evening Peak</span>
            </button>
          </div>

          {/* Ghost Buttons */}
          <button
            onClick={onOpenArch}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-sans transition-all flex items-center gap-1"
          >
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline">Topology</span>
          </button>

          <button
            onClick={onOpenReport}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-sans transition-all flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Audit</span>
          </button>

        </div>

      </div>
    </header>
  );
};
