'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { EngineStatusBanner } from '@/components/dashboard/EngineStatusBanner';
import { KPIStrip } from '@/components/dashboard/KPIStrip';
import { SankeyDiagram } from '@/components/dashboard/SankeyDiagram';
import { ActionTimeline } from '@/components/dashboard/ActionTimeline';
import { ControlPanel } from '@/components/simulator/ControlPanel';
import { ResultCards } from '@/components/simulator/ResultCards';
import { ReportTable } from '@/components/reports/ReportTable';
import { DemoControlPanel } from '@/components/common/DemoControlPanel';
import { useLiveData } from '@/hooks/useLiveData';
import { useSimulator } from '@/hooks/useSimulator';
import { mockSimulationResult, mockEngineStatus, mockActions } from '@/lib/mockData';
import { LayoutDashboard, SlidersHorizontal, BarChart3, Bell } from 'lucide-react';

type TabKey = 'dashboard' | 'simulator' | 'reports';

const MOBILE_TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard',  label: 'Bridge',    icon: LayoutDashboard },
  { key: 'simulator',  label: 'Simulator', icon: SlidersHorizontal },
  { key: 'reports',    label: 'Reports',   icon: BarChart3 },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const { telemetry, actionPlan, alerts, latencyMs, triggerManualAction } = useLiveData();
  const simulatorMutation = useSimulator();

  const activeResult = simulatorMutation.data ?? mockSimulationResult;

  return (
    <div className="flex flex-1 min-h-[calc(100dvh-8rem)]">
      {/* ── Desktop Sidebar ── */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile tab bar */}
        <nav className="flex md:hidden items-center gap-1 p-2 bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
          {MOBILE_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer
                ${activeTab === key
                  ? 'bg-white dark:bg-slate-800 text-[#3b82f6] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {/* Page body */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {/* ── TAB 1: COMMAND BRIDGE ── */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* ── 1. Top Section: VPP Engine Status & Grid Interconnect State ── */}
                <EngineStatusBanner
                  optimizationStatus={mockEngineStatus.optimizationStatus}
                  wsProtocol={mockEngineStatus.wsProtocol}
                  microgridId={mockEngineStatus.microgridId}
                  gridStatusText="Exporting to Grid"
                />

                {/* ── 2. KPI Strip (4 Cards) ── */}
                <KPIStrip telemetry={telemetry} latencyMs={latencyMs} />

                {/* ── 3. Middle Section: Live Power Flow Distribution (Sankey Diagram & Breakdown) ── */}
                <SankeyDiagram flows={telemetry.flowsKw} />

                {/* ── 4. Bottom Section: Action Priority Timeline ── */}
                <ActionTimeline
                  actions={actionPlan?.actions?.length ? actionPlan.actions : mockActions}
                  currentSoc={telemetry.socPct}
                  onExecuteAction={triggerManualAction}
                />

                {/* Operational Events Drawer */}
                {alerts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-xs space-y-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                      <Bell className="w-4 h-4 text-[#22c55e]" />
                      Live Operational Events
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {alerts.slice(0, 4).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60"
                        >
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{a.message}</span>
                          <span className="font-mono text-[10px] text-zinc-400">
                            {new Date(a.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── TAB 2: STRATEGY SIMULATOR ── */}
            {activeTab === 'simulator' && (
              <motion.div
                key="simulator-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                <div className="lg:col-span-1">
                  <ControlPanel
                    onSimulate={(input) => simulatorMutation.mutate(input)}
                    isPending={simulatorMutation.isPending}
                  />
                </div>
                <div className="lg:col-span-2">
                  <ResultCards result={activeResult} isPending={simulatorMutation.isPending} />
                </div>
              </motion.div>
            )}

            {/* ── TAB 3: REPORTS & ANALYTICS ── */}
            {activeTab === 'reports' && (
              <motion.div
                key="reports-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <ReportTable currentTelemetry={telemetry} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Demo Panel (Ctrl+Shift+D) */}
      <DemoControlPanel />
    </div>
  );
}
