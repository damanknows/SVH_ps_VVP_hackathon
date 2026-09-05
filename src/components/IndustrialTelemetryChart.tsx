import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line
} from 'recharts';
import { TelemetryPoint } from '../types/energy';

interface IndustrialTelemetryChartProps {
  data: TelemetryPoint[];
  onHoverTelemetry?: (point: TelemetryPoint | null) => void;
}

export const IndustrialTelemetryChart: React.FC<IndustrialTelemetryChartProps> = ({ data, onHoverTelemetry }) => {
  return (
    <div className="bg-[#131B2E]/70 border border-slate-700/50 rounded-xl p-5 mb-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h2 className="text-sm font-sans font-bold text-slate-100">
              Cumulative Hybrid Energy Balance & Telemetry Stream
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Hover over timeline points to inspect telemetry values across the 24-hour stream
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-sans text-slate-300">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2 rounded bg-amber-400 inline-block"></span>
            <span>Solar PV</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2 rounded bg-sky-400 inline-block"></span>
            <span>Wind</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2 rounded bg-rose-500 inline-block"></span>
            <span>Grid Import</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-slate-100 inline-block"></span>
            <span>Demand (Dashed)</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onMouseMove={(state) => {
              if (state && state.activePayload && state.activePayload.length > 0) {
                const point = state.activePayload[0].payload as TelemetryPoint;
                if (onHoverTelemetry) onHoverTelemetry(point);
              }
            }}
            onMouseLeave={() => {
              if (onHoverTelemetry) onHoverTelemetry(null);
            }}
          >
            <defs>
              <linearGradient id="gradientSolar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradientWind" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradientGrid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} fontFamily="Inter" tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              fontFamily="JetBrains Mono"
              tickLine={false}
              unit=" kW"
              tickFormatter={(value) => `${Math.round(value)}`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.5rem',
                color: '#f8fafc',
                fontFamily: 'Inter',
                fontSize: '12px'
              }}
              formatter={(value: any, name: any) => [`${Math.round(value)} kW`, name]}
            />

            <Area
              type="monotone"
              dataKey="solarKw"
              name="Solar PV"
              stackId="1"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#gradientSolar)"
            />
            <Area
              type="monotone"
              dataKey="windKw"
              name="Wind Turbine"
              stackId="1"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#gradientWind)"
            />
            <Area
              type="monotone"
              dataKey="gridImportKw"
              name="Grid Import"
              stackId="1"
              stroke="#f43f5e"
              strokeWidth={2}
              fill="url(#gradientGrid)"
            />

            <Line
              type="monotone"
              dataKey="campusDemandKw"
              name="Campus Demand"
              stroke="#f8fafc"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-sans text-slate-400">
        <span>Sampling Interval: 2500ms</span>
        <span>Modbus TCP / MQTT Bus Status: Active</span>
        <span className="text-emerald-400 font-mono">Hover Scrubber: Active</span>
      </div>
    </div>
  );
};
