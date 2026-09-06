'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ActionItem } from '@/types';
import { ActionDetailModal } from './ActionDetailModal';
import { BatteryCharging, Zap, ArrowUpRight, ShieldCheck, ChevronRight, Clock, Fan, Sun, Info, AlertTriangle } from 'lucide-react';
import { mockActions } from '@/lib/mockData';

interface ActionTimelineProps {
  actions?: ActionItem[];
  currentSoc?: number;
  onExecuteAction?: (action: ActionItem) => void;
}

export function ActionTimeline({
  actions = mockActions,
  currentSoc = 82.4,
  onExecuteAction,
}: ActionTimelineProps) {
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);

  // Use provided actions or fallback to mockActions
  const items = actions && actions.length > 0 ? actions : mockActions;

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return {
          badge: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse',
          dot: 'bg-red-500',
          border: 'hover:border-red-500/50',
          iconColor: 'text-red-500',
        };
      case 'MED':
        return {
          badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          border: 'hover:border-amber-500/50',
          iconColor: 'text-amber-500',
        };
      case 'LOW':
        return {
          badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
          border: 'hover:border-emerald-500/50',
          iconColor: 'text-emerald-500',
        };
      case 'INFO':
      default:
        return {
          badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500',
          border: 'hover:border-blue-500/50',
          iconColor: 'text-blue-500',
        };
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'battery-charging':
        return <BatteryCharging className="w-5 h-5 text-emerald-500" />;
      case 'fan':
        return <Fan className="w-5 h-5 text-amber-500" />;
      case 'sun':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'zap':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'arrow-up-right':
        return <ArrowUpRight className="w-5 h-5 text-emerald-500" />;
      case 'shield-check':
        return <ShieldCheck className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-zinc-500" />;
    }
  };

  const formatDisplayTime = (timeStr?: string, timestampStr?: string) => {
    if (timeStr && (timeStr.includes(':') && timeStr.length <= 8)) {
      return timeStr; // e.g. "12:00", "12:30"
    }
    const val = timeStr || timestampStr;
    if (!val) return '12:00';
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch {
      // fallback
    }
    return val;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
      className="p-5 sm:p-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col gap-4"
    >
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
              ACTION PRIORITY TIMELINE
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              AI-driven predictive dispatch directives & microgrid actions
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
          {items.length} Directives
        </span>
      </div>

      {/* ── Action Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {items.map((action, idx) => {
          const cfg = getPriorityConfig(action.priority);
          const displayTime = formatDisplayTime(action.time, action.timestamp);

          return (
            <motion.div
              key={action.id || idx}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedAction(action)}
              className={`p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/60 ${cfg.border} hover:shadow-lg cursor-pointer transition-all duration-200 flex flex-col justify-between group relative overflow-hidden`}
            >
              {/* Card content */}
              <div>
                {/* Priority Badge & Time Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border ${cfg.badge}`}>
                    {action.priority}
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    {displayTime}
                  </span>
                </div>

                {/* Title and Icon */}
                <div className="flex items-start gap-2.5 mb-2.5">
                  <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 shrink-0 group-hover:scale-105 transition-transform">
                    {getIcon(action.icon)}
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                    {action.title}
                  </h4>
                </div>

                {/* Engineering Reason */}
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {action.reason}
                </p>
              </div>

              {/* Footer CTA */}
              <div className="mt-4 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500">
                <span>View Analysis</span>
                <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Action Detail Inspection Modal */}
      <ActionDetailModal
        action={selectedAction}
        currentSoc={currentSoc}
        onClose={() => setSelectedAction(null)}
        onExecute={onExecuteAction || (() => {})}
      />
    </motion.div>
  );
}
