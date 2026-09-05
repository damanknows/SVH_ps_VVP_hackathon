import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { TelemetryPoint } from '../types/energy';

interface IndustrialTelemetryChartProps {
  data: TelemetryPoint[];
}

export const IndustrialTelemetryChart: React.FC<IndustrialTelemetryChartProps> = ({ data }) => {
  return (
    <div className="console-panel p-4 rounded-sm mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
              Live Hybrid Telemetry Stream (24-Hour Industrial Feed)
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Synchronized Modbus & Sensor Channels: Solar PV, Wind Turbine, BESS SOC, Grid Feeder & Load Demand
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>
            <span>Solar</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span>
            <span>Wind</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-rose-400 inline-block"></span>
            <span>Grid Import</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-purple-400 inline-block"></span>
            <span>Demand</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" tickLine={false} unit=" kW" />

            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.25rem',
                color: '#f8fafc',
                fontFamily: 'JetBrains Mono',
                fontSize: '11px'
              }}
              formatter={(value: any, name: any) => [`${value} kW`, name]}
            />

            <Line
              type="monotone"
              dataKey="solarKw"
              name="Solar PV"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="windKw"
              name="Wind Turbine"
              stroke="#06b6d4"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="gridImportKw"
              name="Grid Import"
              stroke="#f43f5e"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="campusDemandKw"
              name="Campus Demand"
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>SAMPLING RATE: 1.0 SECONDS</span>
        <span>PROTOCOL: MODBUS-TCP / MQTT</span>
        <span className="text-emerald-400">PACKET LOSS: 0.00%</span>
      </div>
    </div>
  );
};
