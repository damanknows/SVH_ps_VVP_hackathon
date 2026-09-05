import React from 'react';
import { X, Cpu, Server, Database, LayoutDashboard, ShieldCheck, Zap, Activity, CheckCircle } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="console-panel bg-[#0d1322] border border-cyan-800 rounded-sm w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 text-slate-100 shadow-2xl relative font-mono">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            <Cpu className="w-4 h-4" /> System Topology & Architectural Blueprint
          </span>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-tight mt-1">
            SuryaVayu Software Orchestration Architecture
          </h2>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Vendor-Neutral Virtual Power Plant (VPP) Orchestration Layer for Directorate of Technical Education (DTE), Rajasthan
          </p>
        </div>

        {/* Key Pitch Badges (Prominently Featured) */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-y border-slate-800 py-3">
          <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-800 text-[11px] px-3 py-1 rounded font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Zero Additional Hardware Required
          </span>
          <span className="bg-cyan-950/90 text-cyan-300 border border-cyan-800 text-[11px] px-3 py-1 rounded font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
            Vendor-Agnostic / Modbus & REST Native
          </span>
          <span className="bg-amber-950/90 text-amber-300 border border-amber-800 text-[11px] px-3 py-1 rounded font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
            IEEE 2030.5 / SunSpec Protocol Compatible
          </span>
        </div>

        {/* 4-Layer Topology Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          
          {/* Layer 1 */}
          <div className="p-3.5 bg-slate-900 border border-amber-800/80 rounded flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-amber-400 mb-2 border-b border-amber-900/50 pb-1.5">
                <Activity className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Layer 1: Ingestion</h4>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5 font-sans">
                <li>• Rooftop PV Modbus RTU</li>
                <li>• Thar Wind Inverters</li>
                <li>• BESS BMS RS485 Channel</li>
                <li>• DISCOM Smart Meters</li>
              </ul>
            </div>
            <span className="text-[10px] text-amber-400 bg-amber-950/80 border border-amber-800/60 p-1 rounded mt-4 text-center block font-mono">
              Sensors & Meter Telemetry
            </span>
          </div>

          {/* Layer 2 */}
          <div className="p-3.5 bg-slate-900 border border-cyan-800/80 rounded flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-cyan-400 mb-2 border-b border-cyan-900/50 pb-1.5">
                <Server className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Layer 2: Edge Sync</h4>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5 font-sans">
                <li>• Local FastAPI Edge Ingest</li>
                <li>• Open-Meteo Weather Syncer</li>
                <li>• 2500ms Fast Telemetry Poll</li>
                <li>• Zero-Crash Fallback Buffer</li>
              </ul>
            </div>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 p-1 rounded mt-4 text-center block font-mono">
              Weather & Ingestion Pipeline
            </span>
          </div>

          {/* Layer 3 */}
          <div className="p-3.5 bg-slate-900 border border-emerald-800/80 rounded flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-emerald-400 mb-2 border-b border-emerald-900/50 pb-1.5">
                <Database className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Layer 3: Dispatch Core</h4>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5 font-sans">
                <li>• Real-time Linear Dispatcher</li>
                <li>• ToD Tariff Arbitrage Rules</li>
                <li>• Critical Load Safeguards</li>
                <li>• BESS Battery Charge Windows</li>
              </ul>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 p-1 rounded mt-4 text-center block font-mono">
              Optimization Engine
            </span>
          </div>

          {/* Layer 4 */}
          <div className="p-3.5 bg-slate-900 border border-purple-800/80 rounded flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-purple-400 mb-2 border-b border-purple-900/50 pb-1.5">
                <LayoutDashboard className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Layer 4: Console UI</h4>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5 font-sans">
                <li>• Industrial Slate Console</li>
                <li>• DTE Compliance Generator</li>
                <li>• Auto-Pilot Closed Loop</li>
                <li>• Discom Net-Metering Feed</li>
              </ul>
            </div>
            <span className="text-[10px] text-purple-400 bg-purple-950/80 border border-purple-800/60 p-1 rounded mt-4 text-center block font-mono">
              Facilities Operator Console
            </span>
          </div>

        </div>

        {/* Auditor & Jury Takeaway Summary */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5 font-sans">
          <h4 className="font-bold text-slate-100 font-mono text-[11px] uppercase tracking-wider">
            Auditor & Hackathon Jury Technical Note:
          </h4>
          <p className="text-[11px]">
            SuryaVayu acts purely as an <strong>orchestration software layer</strong> that sits over existing campus hardware (rooftop solar, small wind turbines, inverters, and battery banks). It eliminates grid reliance during peak tariff windows through predictive scheduling and ToD arbitrage without requiring capital expenditure on new hardware.
          </p>
        </div>

      </div>
    </div>
  );
};
