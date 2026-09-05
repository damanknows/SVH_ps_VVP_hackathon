import React from 'react';
import { Sliders, Sun, Wind, Zap, X, RotateCcw } from 'lucide-react';

interface LiveSimulationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  solarKwSlider: number;
  setSolarKwSlider: (val: number) => void;
  windKwSlider: number;
  setWindKwSlider: (val: number) => void;
  campusDemandSlider: number;
  setCampusDemandSlider: (val: number) => void;
  onResetSliders: () => void;
}

export const LiveSimulationDrawer: React.FC<LiveSimulationDrawerProps> = ({
  isOpen,
  onClose,
  solarKwSlider,
  setSolarKwSlider,
  windKwSlider,
  setWindKwSlider,
  campusDemandSlider,
  setCampusDemandSlider,
  onResetSliders
}) => {
  if (!isOpen) return null;

  return (
    <div className="bg-[#131B2E]/95 border border-slate-700/60 rounded-xl p-5 mb-5 shadow-2xl animate-fade-in font-sans text-xs text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Live Stress-Test Simulation Controller
          </h3>
          <span className="bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[11px] px-2 py-0.5 rounded font-mono">
            Interactive Manual Override Active
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onResetSliders}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Auto</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Slider 1: Solar Irradiance */}
        <div className="space-y-2 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Sun className="w-4 h-4 text-amber-400" /> Solar Irradiance
            </span>
            <span className="font-mono font-bold text-amber-400 text-sm">{solarKwSlider} kW</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            step="1"
            value={solarKwSlider}
            onChange={(e) => setSolarKwSlider(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>0 kW (Night/Overcast)</span>
            <span>200 kW (Peak Sun)</span>
          </div>
        </div>

        {/* Slider 2: Wind Velocity */}
        <div className="space-y-2 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Wind className="w-4 h-4 text-sky-400" /> Wind Velocity Output
            </span>
            <span className="font-mono font-bold text-sky-400 text-sm">{windKwSlider} kW</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            step="1"
            value={windKwSlider}
            onChange={(e) => setWindKwSlider(Number(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>0 kW (Calm)</span>
            <span>60 kW (Thar Gusts)</span>
          </div>
        </div>

        {/* Slider 3: Campus Load Stress */}
        <div className="space-y-2 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="w-4 h-4 text-purple-400" /> Campus Load Stress
            </span>
            <span className="font-mono font-bold text-purple-400 text-sm">{campusDemandSlider} kW</span>
          </div>
          <input
            type="range"
            min="40"
            max="180"
            step="1"
            value={campusDemandSlider}
            onChange={(e) => setCampusDemandSlider(Number(e.target.value))}
            className="w-full accent-purple-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>40 kW (Min Hostel)</span>
            <span>180 kW (Full Labs Peak)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
