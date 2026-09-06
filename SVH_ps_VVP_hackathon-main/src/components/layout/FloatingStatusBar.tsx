'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLiveData } from '@/hooks/useLiveData';
import { Activity, CheckCircle2, ArrowUpRight, ArrowDownRight, Globe, Zap, Clock } from 'lucide-react';

export function FloatingStatusBar() {
  const { telemetry, latencyMs } = useLiveData();
  const [timeAgo, setTimeAgo] = useState('Just now');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeAgo('Just now');
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const isExporting = telemetry.gridStatus === 'export' || (telemetry.flowsKw?.grid ?? 0) < 0;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', damping: 20 }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 max-w-[95vw] pointer-events-auto"
    >
      <div className="flex items-center gap-2 sm:gap-3.5 px-4 py-2 sm:py-2.5 rounded-full bg-[#0d1424]/85 dark:bg-[#090e1a]/90 backdrop-blur-2xl border border-white/20 dark:border-white/15 shadow-[0_12px_35px_rgba(0,0,0,0.5)] text-xs font-semibold text-zinc-200">
        {/* Optimal Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-emerald-400 tracking-tight flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            System Optimal
          </span>
        </div>

        <span className="text-zinc-600 dark:text-zinc-700">|</span>

        {/* Timestamp */}
        <div className="hidden sm:flex items-center gap-1.5 text-zinc-400 font-sans text-[11px]">
          <Clock className="w-3 h-3 text-zinc-500" />
          <span>Last Updated: <strong className="text-zinc-300 font-medium">{timeAgo}</strong></span>
        </div>

        <span className="hidden sm:inline text-zinc-600 dark:text-zinc-700">|</span>

        {/* Grid State */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-zinc-400">Grid:</span>
          {isExporting ? (
            <span className="text-[#14b8a6] font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              Exporting (45 kW)
            </span>
          ) : (
            <span className="text-blue-400 font-bold flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3" />
              Importing
            </span>
          )}
        </div>

        {/* Latency badge */}
        {latencyMs !== undefined && (
          <>
            <span className="hidden md:inline text-zinc-600 dark:text-zinc-700">|</span>
            <span className="hidden md:inline font-mono text-[10px] text-zinc-400">
              ⚡ {latencyMs.toFixed(0)}ms
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}
