import React from 'react';
import { mockCampuses } from '../services/apiService';
import { Building2, MapPin } from 'lucide-react';

export const IndustrialCampusTable: React.FC = () => {
  return (
    <div className="bg-[#131B2E]/70 border border-slate-700/50 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-sans font-bold text-slate-100">
              DTE Rajasthan Multi-Campus Fleet Telemetry Matrix
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Central Directorate Monitor — Virtual Power Plant Microgrid Status across Regional Technical Institutes
          </p>
        </div>

        <span className="text-xs font-sans font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60 self-start sm:self-auto">
          6 Campus Nodes Active
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-sans text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs font-medium uppercase bg-slate-900/50">
              <th className="py-2.5 px-3">Node ID</th>
              <th className="py-2.5 px-3">Campus & Location</th>
              <th className="py-2.5 px-3">Solar PV Cap</th>
              <th className="py-2.5 px-3">Wind Turbine Cap</th>
              <th className="py-2.5 px-3">BESS Storage</th>
              <th className="py-2.5 px-3">Renewable Share</th>
              <th className="py-2.5 px-3 text-right">Feeder Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {mockCampuses.map((c) => (
              <tr key={c.campusId} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-3 font-mono text-slate-400 uppercase">{c.campusId}</td>
                <td className="py-3 px-3">
                  <div className="font-semibold text-slate-100">{c.campusName}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> {c.location}
                  </div>
                </td>
                <td className="py-3 px-3 text-amber-400 font-mono font-semibold">{c.solarCapacityKw} kW</td>
                <td className="py-3 px-3 text-sky-400 font-mono font-semibold">{c.windCapacityKw} kW</td>
                <td className="py-3 px-3 text-emerald-400 font-mono font-semibold">{c.batteryCapacityKwh} kWh</td>
                <td className="py-3 px-3">
                  <span className="font-bold text-slate-100 font-mono">{c.currentRenewableSharePct}%</span>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className={`inline-block text-[11px] font-sans px-2.5 py-0.5 rounded-full border ${
                    c.gridStatus === 'NORMAL'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80 font-medium'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800/80 font-medium'
                  }`}>
                    {c.gridStatus.charAt(0) + c.gridStatus.slice(1).toLowerCase().replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
