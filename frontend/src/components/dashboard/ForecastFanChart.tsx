'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { ForecastPoint } from '@/types';
import { ChartErrorBoundary } from '../common/ChartErrorBoundary';

interface ForecastFanChartProps {
  data: ForecastPoint[];
  currentSoc: number;
}

export function ForecastFanChartContent({ data, currentSoc }: ForecastFanChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    band: Math.max(0, d.p90 - d.p10),
  }));

  return (
    <div className="w-full h-full min-h-[260px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          24-Hour Solar & Tariff Forecast (P10–P50–P90 Band)
        </h4>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-500 inline-block rounded" /> P50 Expected
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-amber-500/20 inline-block rounded" /> P10–P90 Range
          </span>
        </div>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(t: string) => {
                if (!t) return '';
                const date = new Date(t);
                return `${date.getHours()}:00`;
              }}
              stroke="#888888"
              fontSize={11}
            />
            <YAxis stroke="#888888" fontSize={11} />
            <Tooltip
              labelFormatter={(t: any) => (t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
              formatter={(value: any, name: any, item: any) => {
                if (name === 'p50') return [`${value} kW`, 'P50 Expected'];
                if (name === 'p10') return [`${value} kW`, 'P10 Lower Bound'];
                if (name === 'band' && item?.payload) {
                  return [`${item.payload.p90} kW`, 'P90 Upper Bound'];
                }
                if (name === 'tariff') return [`₹${value}/kWh`, 'Grid Tariff'];
                return [value, String(name)];
              }}
              contentStyle={{
                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                borderColor: '#3f3f46',
                borderRadius: '8px',
                color: '#f4f4f5',
                fontSize: '12px',
              }}
            />
            {/* Base transparent P10 area */}
            <Area dataKey="p10" stackId="fan" stroke="none" fill="transparent" />
            {/* P10-P90 Uncertainty Band */}
            <Area
              dataKey="band"
              stackId="fan"
              stroke="none"
              fill="var(--color-solar)"
              fillOpacity={0.25}
            />
            {/* P50 Expected Forecast Line */}
            <Line
              dataKey="p50"
              stroke="var(--color-solar)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
            {/* Tariff line */}
            <Line
              dataKey="tariff"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
            />
            {/* Current Battery SoC reference line */}
            <ReferenceLine
              y={currentSoc}
              stroke="var(--color-battery-mid)"
              strokeDasharray="4 4"
              label={{
                value: `Current SoC (${currentSoc}%)`,
                fill: 'var(--color-battery-mid)',
                fontSize: 11,
                position: 'right',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ForecastFanChart(props: ForecastFanChartProps) {
  return (
    <ChartErrorBoundary>
      <ForecastFanChartContent {...props} />
    </ChartErrorBoundary>
  );
}
