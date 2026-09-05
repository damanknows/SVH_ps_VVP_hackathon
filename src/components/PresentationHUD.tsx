import React, { useState } from 'react';
import { Command, Play, Pause, X, Sparkles } from 'lucide-react';

interface PresentationHUDProps {
  autoPlayDemo: boolean;
  onToggleAutoPlay: () => void;
  onOpenArch: () => void;
  onCycleScenario: () => void;
}

export const PresentationHUD: React.FC<PresentationHUDProps> = ({
  autoPlayDemo,
  onToggleAutoPlay,
  onOpenArch,
  onCycleScenario
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 shadow-2xl text-xs font-mono backdrop-blur-md text-slate-200 flex items-center space-x-3 transition-all animate-bounce-subtle">
      
      <div className="flex items-center space-x-2 text-cyan-400 font-bold border-r border-slate-800 pr-2.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>PITCH HUD</span>
      </div>

      <div className="flex items-center space-x-3 text-[11px] text-slate-300">
        
        {/* Shift + S */}
        <button
          onClick={onCycleScenario}
          className="hover:text-slate-100 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 transition-colors"
          title="Cycle through 3 scenarios"
        >
          <span className="text-amber-400 font-bold">Shift+S</span> Scenario
        </button>

        {/* Shift + A */}
        <button
          onClick={onOpenArch}
          className="hover:text-slate-100 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 transition-colors"
          title="Open Architecture Topology"
        >
          <span className="text-cyan-400 font-bold">Shift+A</span> Topology
        </button>

        {/* Shift + D (Auto-Play) */}
        <button
          onClick={onToggleAutoPlay}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
            autoPlayDemo
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800 font-bold'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-slate-100'
          }`}
          title="Hands-free auto-play presentation mode (6s cycle)"
        >
          {autoPlayDemo ? <Pause className="w-3 h-3 text-emerald-400 animate-pulse" /> : <Play className="w-3 h-3 text-emerald-400" />}
          <span className="text-emerald-400 font-bold">Shift+D</span>
          <span>{autoPlayDemo ? 'AUTO-PLAY (6s)' : 'Auto-Play'}</span>
        </button>

      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors ml-1"
        title="Dismiss Presentation HUD"
      >
        <X className="w-3.5 h-3.5" />
      </button>

    </div>
  );
};
