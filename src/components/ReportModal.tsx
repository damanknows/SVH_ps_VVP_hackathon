import React from 'react';
import { X, Printer, ShieldCheck, Download, Leaf, IndianRupee } from 'lucide-react';
import { TelemetryPoint } from '../types/energy';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: TelemetryPoint;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, currentData }) => {
  if (!isOpen) return null;

  const totalGen = currentData.solarKw + currentData.windKw;
  const carbonSavedKg = Math.round(totalGen * 0.82);
  const costSavedInr = Math.round(totalGen * 7.5);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="console-panel bg-[#0d1322] border border-slate-700 rounded-sm w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 text-slate-100 shadow-2xl relative font-mono">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Govt Header */}
        <div className="flex items-center space-x-4 border-b border-slate-800 pb-5 mb-5">
          <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-base">
            DTE
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
              Government of Rajasthan • Directorate of Technical Education
            </span>
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-tight mt-0.5">
              Hybrid Clean Energy & Carbon Audit Certificate
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Target Node: MBM University & DTE Campus Jodhpur | Certificate Ref: SVH26004-AUDIT-2026
            </p>
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="p-3 bg-slate-900 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 uppercase">Carbon Avoided Today</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{carbonSavedKg} kg CO₂</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 uppercase">Daily Tariff Savings</p>
            <p className="text-xl font-bold text-amber-400 mt-1">₹{costSavedInr.toLocaleString('en-IN')}</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 uppercase">Microgrid Efficiency</p>
            <p className="text-xl font-bold text-cyan-400 mt-1">96.4% Clean</p>
          </div>
        </div>

        {/* Table */}
        <div className="space-y-2 mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Telemetry Asset Audit Breakdown</h3>
          <div className="bg-slate-900 rounded overflow-hidden border border-slate-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-2.5">Asset Parameter</th>
                  <th className="p-2.5">Telemetry Level</th>
                  <th className="p-2.5">Orchestrated Control Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                <tr>
                  <td className="p-2.5 font-semibold text-amber-400">Rooftop Solar PV Array</td>
                  <td className="p-2.5">{currentData.solarKw} kW Active Output</td>
                  <td className="p-2.5">Directly serving Campus Labs & Pre-charging BESS</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-cyan-400">Thar Wind Turbine Array</td>
                  <td className="p-2.5">{currentData.windKw} kW Active Output</td>
                  <td className="p-2.5">Baseload generation supporting hostel night loads</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-emerald-400">BESS Battery Storage</td>
                  <td className="p-2.5">{currentData.batterySoc}% SOC ({currentData.batteryFlowKw} kW)</td>
                  <td className="p-2.5">Data-driven peak shaving (No fixed rules)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-rose-400">JdVVNL Grid Import</td>
                  <td className="p-2.5">{currentData.gridImportKw} kW Import</td>
                  <td className="p-2.5">Peak Grid Tariff Draw reduced by 82.4%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs">
          <span className="text-[11px] text-slate-400">
            Certified by <strong className="text-emerald-400 font-normal">SuryaVayu VPP Engine</strong> | DTE Jaipur
          </span>
          
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" /> Print Audit
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[11px] flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Export Official PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
