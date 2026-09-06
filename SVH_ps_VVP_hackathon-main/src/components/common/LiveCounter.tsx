'use client';

import React, { useEffect, useState } from 'react';
import { useSpring, useTransform, motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface LiveCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  showTrend?: boolean;
  className?: string;
  durationMs?: number;
}

export function LiveCounter({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  showTrend = false,
  className = '',
}: LiveCounterProps) {
  // 1.5s ease-out roll up spring physics
  const spring = useSpring(0, {
    stiffness: 45,
    damping: 14,
    restDelta: 0.001,
  });

  const display = useTransform(spring, (current) => {
    if (decimals > 0) {
      return current.toFixed(decimals);
    }
    return Math.round(current).toLocaleString('en-IN');
  });

  const [formatted, setFormatted] = useState(
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-IN')
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return display.on('change', (latest) => {
      setFormatted(latest);
    });
  }, [display]);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>
        {prefix}
        {formatted}
        {suffix}
      </span>
      {showTrend && (
        <motion.span
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="inline-flex items-center justify-center p-0.5 rounded-full bg-emerald-500/20 text-emerald-500 text-xs shadow-xs"
          title="Trending Up / Live Telemetry Active"
        >
          <TrendingUp className="w-3 h-3" />
        </motion.span>
      )}
    </span>
  );
}
