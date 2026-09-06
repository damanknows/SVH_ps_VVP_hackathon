'use client';

import React from 'react';

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

interface SoCGaugeProps {
  socPct: number;
  batteryFlowKw?: number;
}

export function SoCGauge({ socPct, batteryFlowKw = 0 }: SoCGaugeProps) {
  const clampedSoc = Math.min(100, Math.max(0, socPct));
  const sweep = 270;
  const startAngle = -135;
  const endAngle = startAngle + (sweep * clampedSoc) / 100;

  const zoneColor =
    clampedSoc < 20
      ? 'var(--color-battery-low)'
      : clampedSoc > 80
      ? 'var(--color-battery-high)'
      : 'var(--color-battery-mid)';

  const isCharging = batteryFlowKw < 0;
  const isDischarging = batteryFlowKw > 0;
  const flowText = isCharging
    ? `Charging (${Math.abs(batteryFlowKw)} kW)`
    : isDischarging
    ? `Discharging (${batteryFlowKw} kW)`
    : 'Standby';

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm h-full relative">
      <div className="w-full max-w-[240px] aspect-square relative">
        <svg viewBox="0 0 200 200" className="w-full h-full transform transition-all duration-500">
          {/* Background Track Arc */}
          <path
            d={arcPath(100, 100, 78, startAngle, startAngle + sweep)}
            stroke="var(--color-track)"
            strokeWidth={14}
            fill="none"
            strokeLinecap="round"
          />
          {/* Active Value Arc */}
          <path
            d={arcPath(100, 100, 78, startAngle, Math.max(startAngle + 0.1, endAngle))}
            stroke={zoneColor}
            strokeWidth={14}
            fill="none"
            strokeLinecap="round"
            className={`${clampedSoc < 15 ? 'animate-pulse' : ''}`}
            style={{ transition: 'stroke-dasharray 600ms ease-out, stroke 400ms' }}
          />
          {/* Ticks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const tickAngle = startAngle + (sweep * tick) / 100;
            const outer = polarToCartesian(100, 100, 68, tickAngle);
            const inner = polarToCartesian(100, 100, 62, tickAngle);
            return (
              <line
                key={tick}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="currentColor"
                strokeWidth={2}
                className="text-zinc-400 dark:text-zinc-600"
              />
            );
          })}
          {/* Center Text */}
          <text
            x="100"
            y="95"
            textAnchor="middle"
            fontSize="34"
            fontWeight={800}
            fill="currentColor"
            className="text-zinc-900 dark:text-zinc-50 tracking-tight"
          >
            {Math.round(clampedSoc)}%
          </text>
          <text
            x="100"
            y="120"
            textAnchor="middle"
            fontSize="12"
            fontWeight={600}
            fill={zoneColor}
            className="uppercase tracking-wider"
          >
            State of Charge
          </text>
        </svg>

        {/* Floating Flow Badge */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-xs whitespace-nowrap">
          <span
            className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
              isCharging
                ? 'bg-emerald-500 animate-ping'
                : isDischarging
                ? 'bg-amber-500'
                : 'bg-zinc-400'
            }`}
          />
          {flowText}
        </div>
      </div>
    </div>
  );
}
