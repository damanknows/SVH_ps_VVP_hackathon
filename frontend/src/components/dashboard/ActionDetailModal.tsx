'use client';

import React from 'react';
import { ActionItem } from '@/types';
import { ForecastFanChart } from './ForecastFanChart';
import { X, BatteryCharging, Zap, ArrowUpRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { mockForecastPoints } from '@/lib/mockData';

interface ActionDetailModalProps {
  action: ActionItem | null;
  currentSoc: number;
  onClose: () => void;
  onExecute: (action: ActionItem) => void;
}

export function ActionDetailModal({ action, currentSoc, onClose, onExecute }: ActionDetailModalProps) {
  if (!action) return null;

  const priorityStyles = {
    HIGH: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse',
    MED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    LOW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    INFO: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  }[action.priority];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'battery-charging':
        return <BatteryCharging className="w-5 h-5" />;
      case 'zap':
        return <Zap className="w-5 h-5" />;
      case 'arrow-up-right':
        return <ArrowUpRight className="w-5 h-5" />;
      case 'shield-check':
        return <ShieldCheck className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 relative overflow-hidden flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100">
              {getIcon(action.icon)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${priorityStyles}`}>
                  {action.priority} PRIORITY
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">
                {action.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reason Box */}
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <strong className="text-zinc-900 dark:text-zinc-100 block mb-1">Algorithmic Recommendation Rationale:</strong>
          {action.reason}
        </div>

        {/* Fan Chart */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
          <ForecastFanChart data={action.forecast || mockForecastPoints} currentSoc={currentSoc} />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              onExecute(action);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve & Deploy Action
          </button>
        </div>
      </div>
    </div>
  );
}
