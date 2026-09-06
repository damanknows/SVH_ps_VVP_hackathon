'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ChartPoint {
  time: string;
  solar: number;
  wind: number;
  netDemand: number;
  soc: number;
}

interface EditorialChartProps {
  data?: ChartPoint[];
  primaryKey?: 'solar' | 'wind' | 'netDemand' | 'soc';
  secondaryKey?: 'solar' | 'wind' | 'netDemand' | 'soc';
  height?: number;
  showBaseline?: boolean;
  accentColor?: string;
  secondaryColor?: string;
}

// Real Duck Curve & Dispatch Data
const defaultEditorialData: ChartPoint[] = [
  { time: '00:00', solar: 0,   wind: 120, netDemand: 280, soc: 65 },
  { time: '03:00', solar: 0,   wind: 155, netDemand: 240, soc: 58 },
  { time: '06:00', solar: 40,  wind: 140, netDemand: 310, soc: 50 },
  { time: '09:00', solar: 280, wind: 95,  netDemand: 160, soc: 68 },
  { time: '12:00', solar: 321, wind: 136, netDemand: 90,  soc: 82.4 }, // Prompt Match
  { time: '15:00', solar: 260, wind: 110, netDemand: 130, soc: 88 },
  { time: '18:00', solar: 45,  wind: 180, netDemand: 390, soc: 75 }, // Evening Duck Peak
  { time: '21:00', solar: 0,   wind: 160, netDemand: 340, soc: 62 },
];

export function EditorialChart({
  data = defaultEditorialData,
  primaryKey = 'solar',
  secondaryKey = 'wind',
  height = 260,
  showBaseline = true,
  accentColor = '#C65D3A', // Terracotta
  secondaryColor = '#006D77', // Teal
}: EditorialChartProps) {
  return (
    <div className="w-full flex flex-col justify-between" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="editorialAccentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={accentColor} stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="editorialTealGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.18} />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Minimal X-Axis for print clarity */}
          <XAxis
            dataKey="time"
            axisLine={showBaseline ? { stroke: '#E8E4DD', strokeWidth: 1 } : false}
            tickLine={false}
            tick={{
              fill: '#787878',
              fontSize: 10,
              fontFamily: 'Space Mono, monospace',
            }}
            dy={8}
          />
          <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />

          {/* Minimal Print Infographic Tooltip */}
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-[#FAF9F6] border border-[#E8E4DD] p-3 shadow-md rounded-none font-editorial-sans text-xs space-y-1">
                    <p className="font-editorial-mono text-[10px] text-[#787878] uppercase border-b border-[#E8E4DD] pb-1 mb-1">
                      Time: {label}
                    </p>
                    {payload.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4">
                        <span className="text-[#787878] capitalize">{entry.name}:</span>
                        <span className="font-editorial-mono font-medium text-[#111213]">
                          {entry.value} kW
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Secondary Series (Teal) */}
          {secondaryKey && (
            <Area
              type="monotone"
              dataKey={secondaryKey}
              name="Wind Power"
              stroke={secondaryColor}
              strokeWidth={1.5}
              fill="url(#editorialTealGrad)"
              activeDot={{ r: 4, fill: secondaryColor, stroke: '#FAF9F6', strokeWidth: 2 }}
              dot={false}
            />
          )}

          {/* Primary Series (Terracotta) */}
          <Area
            type="monotone"
            dataKey={primaryKey}
            name="Solar Generation"
            stroke={accentColor}
            strokeWidth={1.75}
            fill="url(#editorialAccentGrad)"
            activeDot={{ r: 4, fill: accentColor, stroke: '#FAF9F6', strokeWidth: 2 }}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
