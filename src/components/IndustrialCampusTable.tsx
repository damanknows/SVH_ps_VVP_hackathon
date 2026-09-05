import React from 'react';
import { mockCampuses } from '../services/apiService';
import { Building2, MapPin, Activity } from 'lucide-react';

export const IndustrialCampusTable: React.FC = () => {
  return (
    <div className="console-panel p-4 rounded-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
              DTE Rajasthan Multi-Campus Fleet Telemetry Matrix
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Directorate Monitor — Virtual Power Plant Microgrid Status across Regional Technical Institutes
          </p>
        </div>

        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
          4 CAMPUS NODES ACTIVE
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/60">
              <th className="py-2.5 px-3">Node ID</th>
              <th className="py-2.5 px-3">Campus & Location</th>
              <th className="py-2.5 px-3">Solar PV Cap</th>
              <th className="py-2.5 px-3">Wind Turbine Cap</th>
              <th className="py-2.5 px-3">BESS Storage</th>
              <th className="py-2.5 px-3">Renewable Share</th>
              <th className="py-2.5 px-3 text-right">Feeder Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {mockCampuses.map((c) => (
              <tr key={c.campusId} className="hover:bg-slate-850/50 transition-colors">
                <td className="py-2.5 px-3 font-mono text-slate-400 uppercase">{c.campusId}</td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-slate-100">{c.campusName}</div>
                  <div className="text-[11px] text-slate-400 font-sans flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" /> {c.location}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-amber-400 font-mono">{c.solarCapacityKw} kW</td>
                <td className="py-2.5 px-3 text-cyan-400 font-mono">{c.windCapacityKw} kW</td>
                <td className="py-2.5 px-3 text-emerald-400 font-mono">{c.batteryCapacityKwh} kWh</td>
                <td className="py-2.5 px-3">
                  <span className="font-bold text-slate-100 font-mono">{c.currentRenewableSharePct}%</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={`inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                    c.gridStatus === 'NORMAL'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border-amber-800'
                  }`}>
                    {c.gridStatus}
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
