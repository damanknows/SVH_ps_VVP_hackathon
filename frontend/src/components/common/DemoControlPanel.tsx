'use client';

import React, { useEffect, useState } from 'react';
import { useLiveData } from '@/hooks/useLiveData';
import { Sliders, Sun, Cloud, Moon, ZapOff, X } from 'lucide-react';

export function DemoControlPanel() {
  const [open, setOpen] = useState(false);
  const { setScenario, activeScenario } = useLiveData();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  const scenarios = [
    { key: 'sunny_day', label: 'Sunny Peak Gen', icon: Sun, color: 'text-amber-500' },
    { key: 'cloud_cover', label: 'Cloud Cover Drop', icon: Cloud, color: 'text-zinc-400' },
    { key: 'evening_peak', label: 'Evening Peak Price', icon: Moon, color: 'text-indigo-400' },
    { key: 'grid_outage', label: 'Utility Grid Outage', icon: ZapOff, color: 'text-red-500' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-4 shadow-2xl space-y-3 min-w-[260px] animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Secret Demo Panel
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-zinc-500">
        Trigger live microgrid telemetry scenarios:
      </p>

      <div className="space-y-1.5">
        {scenarios.map((s) => {
          const Icon = s.icon;
          const isActive = activeScenario === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setScenario(s.key)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : s.color}`} />
                {s.label}
              </span>
              {isActive && <span className="text-[10px] uppercase font-bold tracking-wider">ACTIVE</span>}
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 text-center font-mono">
        Shortcut: Ctrl+Shift+D / Cmd+Shift+D
      </div>
    </div>
  );
}
