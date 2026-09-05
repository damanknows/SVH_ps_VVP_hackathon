'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionItem } from '@/types';
import { ActionDetailModal } from './ActionDetailModal';
import { BatteryCharging, Zap, ArrowUpRight, ShieldCheck, ChevronRight, Clock } from 'lucide-react';

interface ActionTimelineProps {
  actions: ActionItem[];
  currentSoc: number;
  onExecuteAction: (action: ActionItem) => void;
}

export function ActionTimeline({ actions, currentSoc, onExecuteAction }: ActionTimelineProps) {
  const { t } = useTranslation();
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse';
      case 'MED':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'LOW':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
  };

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
    <div className="p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            {t('action.title')}
          </h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          {actions.length} Pending
        </span>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {actions.map((action) => (
          <div
            key={action.id}
            onClick={() => setSelectedAction(action)}
            className="min-w-[260px] max-w-[280px] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-emerald-500/50 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityStyle(action.priority)}`}>
                  {action.priority}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {getIcon(action.icon)}
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {action.title}
                </h4>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {action.reason}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>{t('action.view_detail')}</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      <ActionDetailModal
        action={selectedAction}
        currentSoc={currentSoc}
        onClose={() => setSelectedAction(null)}
        onExecute={onExecuteAction}
      />
    </div>
  );
}
