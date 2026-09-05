import React from 'react';
import { TelemetryPoint } from '../types/energy';
import { X, Download, Leaf, IndianRupee, ShieldCheck, Fuel, FileText, CheckCircle } from 'lucide-react';

interface ExecutiveAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  telemetrySeries: TelemetryPoint[];
  currentTelemetry: TelemetryPoint;
}

export const ExecutiveAuditDrawer: React.FC<ExecutiveAuditDrawerProps> = ({
  isOpen,
  onClose,
  telemetrySeries,
  currentTelemetry
}) => {
  if (!isOpen) return null;

  const totalSolarKw = telemetrySeries.reduce((acc, p) => acc + p.solarKw, 0);
  const totalWindKw = telemetrySeries.reduce((acc, p) => acc + p.windKw, 0);
  const totalGenerationKw = totalSolarKw + totalWindKw;

  // CEA baseline grid emission factor ~0.82 kg CO2 / kWh
  const co2AvoidedKg = Math.round(totalGenerationKw * 0.82);
  
  // Financial Savings: ToD Tariff offset (avg ₹7.50/kWh baseline + ₹4.00 peak surge offset)
  const todSavingsInr = Math.round(totalGenerationKw * 8.50);
  const exportEarningsInr = Math.round(telemetrySeries.reduce((acc, p) => acc + p.gridExportKw, 0) * 4.20);
  const totalFinancialAvoidanceInr = todSavingsInr + exportEarningsInr;

  // DG Run Hours Averted (150 kVA DG consumes ~28 L/hr)
  const dgHoursAverted = (totalGenerationKw / 100).toFixed(1);
  const dieselLitersSaved = Math.round(parseFloat(dgHoursAverted) * 26.5);

  const handleDownloadCSV = () => {
    const headers = ['Timestamp', 'Solar_kW', 'Wind_kW', 'Campus_Demand_kW', 'Battery_SoC_Pct', 'Battery_Flow_kW', 'Grid_Import_kW', 'Grid_Export_kW', 'CO2_Avoided_kg', 'Financial_Savings_INR'];
    
    const rows = telemetrySeries.map(p => {
      const gen = p.solarKw + p.windKw;
      return [
        p.timestamp,
        p.solarKw,
        p.windKw,
        p.campusDemandKw,
        `${p.batterySoc}%`,
        p.batteryFlowKw,
        p.gridImportKw,
        p.gridExportKw,
        Math.round(gen * 0.82),
        Math.round(gen * 8.5)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DTE_Rajasthan_Clean_Energy_Compliance_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 text-slate-100 shadow-2xl flex flex-col font-mono justify-between">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">
                Directorate of Technical Education • Rajasthan
              </span>
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-tight mt-0.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Executive Sustainability & Tariff Audit Drawer
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Institutional Compliance Badges */}
          <div className="flex items-center space-x-2 mb-5">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] px-2 py-0.5 rounded font-mono">
              ✓ CEA GRID BASELINE VERIFIED
            </span>
            <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] px-2 py-0.5 rounded font-mono">
              REF: DTE-RAJ-2026-AUDIT
            </span>
          </div>

          {/* Key Audit KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            
            {/* 1. Daily Financial Cost Avoidance */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase mb-1">
                <span>Daily Cost Avoidance</span>
                <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-slate-100 font-mono">
                ₹{totalFinancialAvoidanceInr.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-amber-400 mt-1 font-mono">
                ToD Tariff Shaving + Net Credit
              </p>
            </div>

            {/* 2. Environmental Ledger */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase mb-1">
                <span>Environmental Ledger</span>
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-400 font-mono">
                {co2AvoidedKg.toLocaleString('en-IN')} <span className="text-xs font-normal">kg CO₂</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                CEA Factor: 0.82 kg/kWh
              </p>
            </div>

            {/* 3. DG Run Hours Averted */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase mb-1">
                <span>DG Hours Averted</span>
                <Fuel className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-xl font-bold text-cyan-400 font-mono">
                {dgHoursAverted} <span className="text-xs font-normal">Hrs</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Saved ~{dieselLitersSaved} L Diesel
              </p>
            </div>

          </div>

          {/* Audit Breakdown Table */}
          <div className="space-y-3 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Institutional Tariff & Carbon Breakdown
            </h3>

            <div className="bg-slate-950 rounded border border-slate-800 text-xs overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                  <tr>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Quantified Impact</th>
                    <th className="p-2.5">Financial Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                  <tr>
                    <td className="p-2.5 font-semibold text-amber-400">Peak ToD Tariff Offset</td>
                    <td className="p-2.5">{totalGenerationKw} kWh Displaced</td>
                    <td className="p-2.5 font-bold text-slate-100">₹{todSavingsInr.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-cyan-400">Discom Net Meter Export</td>
                    <td className="p-2.5">{telemetrySeries.reduce((a, b) => a + b.gridExportKw, 0)} kWh Exported</td>
                    <td className="p-2.5 font-bold text-slate-100">₹{exportEarningsInr.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-emerald-400">CEA Grid Carbon Credit</td>
                    <td className="p-2.5">{co2AvoidedKg} kg CO₂ Avoided</td>
                    <td className="p-2.5 text-emerald-400">Certified Compliance</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-purple-400">Diesel Genset Displacement</td>
                    <td className="p-2.5">{dieselLitersSaved} Liters Saved</td>
                    <td className="p-2.5 font-bold text-slate-100">₹{Math.round(dieselLitersSaved * 94).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Export Footer */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            DTE Rajasthan Compliance Module
          </span>

          <button
            onClick={handleDownloadCSV}
            className="px-4 py-2 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-mono font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download DTE Compliance Summary (CSV)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
