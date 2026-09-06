'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface DataValueProps {
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function DataValue({
  value,
  unit,
  trend,
  trendValue,
  size = 'md',
  align = 'right',
  className = '',
}: DataValueProps) {
  const sizeClasses = {
    sm: 'text-sm font-normal',
    md: 'text-lg sm:text-xl font-normal',
    lg: 'text-2xl sm:text-3xl font-medium tracking-tight',
    xl: 'text-4xl sm:text-5xl font-medium tracking-tight',
  }[size];

  const alignClasses = {
    left: 'justify-start text-left',
    right: 'justify-end text-right',
    center: 'justify-center text-center',
  }[align];

  return (
    <div className={`flex items-baseline gap-1.5 font-editorial-mono tabular-nums text-[#111213] ${alignClasses} ${className}`}>
      <span className={sizeClasses}>{value}</span>
      {unit && (
        <span className="text-xs sm:text-sm font-editorial-sans text-[#787878] lowercase tracking-normal">
          {unit}
        </span>
      )}
      {trend && (
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-editorial-mono ${
            trend === 'up'
              ? 'text-[#C65D3A]'
              : trend === 'down'
              ? 'text-[#006D77]'
              : 'text-[#787878]'
          }`}
        >
          {trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
          {trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
          {trend === 'neutral' && <Minus className="w-3.5 h-3.5" />}
          {trendValue && <span>{trendValue}</span>}
        </span>
      )}
    </div>
  );
}
