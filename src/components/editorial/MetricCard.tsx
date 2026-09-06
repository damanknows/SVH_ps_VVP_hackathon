'use client';

import React from 'react';
import { DataValue } from './DataValue';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  context?: string;
  sparklineData?: number[];
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  trend,
  trendValue,
  context,
  sparklineData = [40, 48, 45, 62, 58, 75, 72, 85, 82],
  className = '',
}: MetricCardProps) {
  // Generate minimal SVG sparkline
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;
  const width = 120;
  const height = 28;

  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className={`group flex flex-col justify-between py-5 pl-0 pr-4 transition-all duration-300 ease-expo-out hover:border-l-2 hover:border-[#C65D3A] hover:pl-4 cursor-default ${className}`}
    >
      <div>
        {/* Caption Label */}
        <p className="font-editorial-sans text-[11px] uppercase tracking-[0.14em] text-[#787878] font-medium mb-2">
          {label}
        </p>

        {/* Data Value */}
        <DataValue
          value={value}
          unit={unit}
          trend={trend}
          trendValue={trendValue}
          size="lg"
          align="left"
        />
      </div>

      {/* Sparkline & Context */}
      <div className="mt-4 flex items-end justify-between gap-3 pt-3 border-t border-[#E8E4DD]/60">
        {context && (
          <span className="font-editorial-sans text-xs text-[#787878] leading-relaxed line-clamp-1">
            {context}
          </span>
        )}

        {/* Inline Minimal Print Sparkline */}
        <svg
          width={width}
          height={height}
          className="shrink-0 overflow-visible text-[#C65D3A]"
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            className="opacity-70 group-hover:opacity-100 transition-opacity"
          />
        </svg>
      </div>
    </div>
  );
}
