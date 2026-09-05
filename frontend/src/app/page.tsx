'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { KPIStrip } from '@/components/dashboard/KPIStrip';
import { SoCGauge } from '@/components/dashboard/SoCGauge';
import { SankeyDiagram } from '@/components/dashboard/SankeyDiagram';
import { ActionTimeline } from '@/components/dashboard/ActionTimeline';
import { ControlPanel } from '@/components/simulator/ControlPanel';
import { ResultCards } from '@/components/simulator/ResultCards';
import { ReportTable } from '@/components/reports/ReportTable';
import { useLiveData } from '@/hooks/useLiveData';
import { useSimulator } from '@/hooks/useSimulator';
import { LayoutDashboard, Sliders, FileText, Bell } from 'lucide-react';
import { mockSimulationResult } from '@/lib/mockData';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulator' | 'reports'>('dashboard');
  const { telemetry, actionPlan, alerts, latencyMs, triggerManualAction } = useLiveData();
  const simulatorMutation = useSimulator();

  const activeSimulationResult = simulatorMutation.data || mockSimulationResult;

  return (
    <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Viewport */}
      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center justify-between p-1.5 bg-zinc-200/80 dark:bg-zinc-800/80 rounded-2xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'dashboard'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Bridge
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'simulator'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Simulator
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'reports'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Reports
          </button>
        </div>

        {/* TAB 1: COMMAND BRIDGE DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* KPI Summary Strip */}
            <KPIStrip telemetry={telemetry} latencyMs={latencyMs} />

            {/* Main Visual Row: Gauge + Sankey */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 min-h-[340px]">
                <SoCGauge
                  socPct={telemetry.socPct}
                  batteryFlowKw={telemetry.flowsKw.battery}
                />
              </div>
              <div className="lg:col-span-2 min-h-[340px]">
                <SankeyDiagram flows={telemetry.flowsKw} />
              </div>
            </div>

            {/* Action Center Timeline */}
            <ActionTimeline
              actions={actionPlan.actions}
              currentSoc={telemetry.socPct}
              onExecuteAction={triggerManualAction}
            />

            {/* Recent Alerts Feed */}
            {alerts.length > 0 && (
              <div className="p-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300">
                  <Bell className="w-4 h-4 text-emerald-500" />
                  Live Operational Events
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {alerts.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80"
                    >
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {a.message}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STRATEGY SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="lg:col-span-1">
              <ControlPanel
                onSimulate={(input) => simulatorMutation.mutate(input)}
                isPending={simulatorMutation.isPending}
              />
            </div>
            <div className="lg:col-span-2">
              <ResultCards
                result={activeSimulationResult}
                isPending={simulatorMutation.isPending}
              />
            </div>
          </div>
        )}

        {/* TAB 3: REPORTS & ANALYTICS */}
        {activeTab === 'reports' && (
          <div className="animate-in fade-in duration-300">
            <ReportTable currentTelemetry={telemetry} />
          </div>
        )}
      </main>
    </div>
  );
}
