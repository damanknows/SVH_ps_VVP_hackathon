'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useLiveData } from '@/hooks/useLiveData';
import { Sun, Moon, Activity, Radio, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { connected, isStandalone, latencyMs, isReconnecting, reconnectAttempt, reconnectDelaySec, reconnectNow } = useLiveData();

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Connection indicator colours */
  const statusColor = !connected
    ? 'bg-amber-500'
    : isStandalone
    ? 'bg-blue-500'
    : 'bg-emerald-500';

  const statusLabel = !connected
    ? 'Reconnecting'
    : isStandalone
    ? 'Simulation'
    : 'Live Modbus';

  return (
    <header
      className="
        sticky top-0 z-50
        border-b border-[hsl(var(--border))]
        bg-white/90 dark:bg-slate-900/90
        backdrop-blur-xl
        shadow-sm
      "
    >
      {/* ── Persistent Reconnecting Banner (When Disconnected) ──────── */}
      <AnimatePresence>
        {!connected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-amber-50 text-xs font-semibold px-4 py-1.5 border-b border-amber-500/40 shadow-inner flex items-center justify-between overflow-hidden"
          >
            <div className="flex items-center gap-2 max-w-4xl truncate">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-100"></span>
              </span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-200 shrink-0" />
              <span className="truncate">
                <strong>Connecting...</strong> Attempting live telemetry stream (Attempt #{reconnectAttempt || 1}, next in {reconnectDelaySec || 1}s). Displaying cached/simulated telemetry in standalone mode.
              </span>
            </div>

            <button
              onClick={reconnectNow}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition shrink-0 ml-3 cursor-pointer shadow-xs"
              title="Force reconnect immediately"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              Reconnect Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Gov. Banner ────────────────────────────────────────── */}
      <div className="border-b border-[hsl(var(--border))]/60 bg-[#1a3c8f] dark:bg-[#0f1f4a]">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Ashoka Emblem placeholder */}
            <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-[#f5a623]" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-white leading-tight tracking-wide">
                Government of Rajasthan · Directorate of Technical Education
              </p>
              <p className="text-[10px] text-blue-200/80 hidden sm:block">
                राजस्थान सरकार · तकनीकी शिक्षा निदेशालय
              </p>
            </div>
          </div>

          {/* Right: Status pill + Theme toggle */}
          <div className="flex items-center gap-2">
            {/* Live / Sim indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`}
                />
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${statusColor}`} />
              </span>
              <span className="text-[11px] font-semibold hidden sm:inline">{statusLabel}</span>
              <span className="text-[10px] text-blue-200 font-mono flex items-center gap-0.5 border-l border-white/20 pl-1.5">
                <Activity className="w-2.5 h-2.5" />
                {latencyMs}ms
              </span>
            </div>

            {/* Quiet Luxury Kinfolk SCADA Switcher */}
            <a
              href="/editorial"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 text-[11px] font-bold transition-all shadow-xs"
              title="Switch to Kinfolk SCADA Quiet Luxury Editorial View"
            >
              <span>Kinfolk SCADA</span>
              <span className="text-[9px] bg-amber-400 text-amber-950 px-1 rounded font-mono">NEW</span>
            </a>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors cursor-pointer"
              title="Toggle dark / light mode"
            >
              {mounted && theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── App Title Bar ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Brand icon */}
          <div
            className="
              w-9 h-9 rounded-xl flex items-center justify-center shrink-0
              bg-gradient-to-br from-[#f5a623] via-[#14b8a6] to-[#3b82f6]
              shadow-lg shadow-blue-500/20
            "
          >
            <Radio className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>

          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-[hsl(var(--foreground))] leading-tight">
              Energy Management &amp; Virtual Power Plant (VPP) Control Cell
            </h1>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
              SuryaVayu · Hybrid Renewable Energy Orchestration Engine&nbsp;
              <span className="font-mono text-[10px] opacity-60">SVH-26004</span>
            </p>
          </div>
        </div>

        {/* Brand colour dots — visual identity */}
        <div className="hidden md:flex items-center gap-1.5">
          {[
            { label: 'Solar',   color: '#f5a623' },
            { label: 'Wind',    color: '#14b8a6' },
            { label: 'Grid',    color: '#3b82f6' },
            { label: 'Battery', color: '#22c55e' },
          ].map(({ label, color }) => (
            <div
              key={label}
              title={label}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[hsl(var(--border))] text-[10px] font-semibold text-[hsl(var(--muted-foreground))]"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: color }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
