'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { EngineStatusBanner } from '@/components/dashboard/EngineStatusBanner';
import { KPIStrip } from '@/components/dashboard/KPIStrip';
import { SankeyDiagram } from '@/components/dashboard/SankeyDiagram';
import { ActionTimeline } from '@/components/dashboard/ActionTimeline';
import { ControlPanel } from '@/components/simulator/ControlPanel';
import { ResultCards } from '@/components/simulator/ResultCards';
import { ReportTable } from '@/components/reports/ReportTable';
import { DemoControlPanel } from '@/components/common/DemoControlPanel';
import { AuroraBackground } from '@/components/common/AuroraBackground';
import { useLiveData } from '@/hooks/useLiveData';
import { useSimulator } from '@/hooks/useSimulator';
import { mockSimulationResult, mockEngineStatus, mockActions } from '@/lib/mockData';
import { LayoutDashboard, SlidersHorizontal, BarChart3, Bell } from 'lucide-react';

type TabKey = 'dashboard' | 'simulator' | 'reports';

const MOBILE_TABS = [
  { key: 'dashboard' as const,  label: 'Bridge',    icon: LayoutDashboard },
  { key: 'simulator' as const,  label: 'Simulator', icon: SlidersHorizontal },
  { key: 'reports' as const,    label: 'Reports',   icon: BarChart3 },
];

// ── Apple-Style Staggered Load Variants ──────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 260,
    },
  },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const { telemetry, actionPlan, alerts, latencyMs, triggerManualAction } = useLiveData();
  const simulatorMutation = useSimulator();

  const activeResult = simulatorMutation.data ?? mockSimulationResult;

  return (
    <div className="relative flex flex-1 min-h-[calc(100dvh-8rem)]">
      {/* ── Animated Background Mesh & Particles ── */}
      <AuroraBackground />

      {/* ── Desktop Floating Frosted Glass Sidebar ── */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ── Main Content Area ── */}
      <div className="relative z-1 flex-1 flex flex-col min-w-0">

        {/* Mobile tab bar */}
        <nav className="flex md:hidden items-center gap-1 p-2 bg-white/40 dark:bg-black/30 backdrop-blur-xl border-b border-white/15 dark:border-white/10">
          {MOBILE_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
                ${activeTab === key
                  ? 'bg-white/80 dark:bg-white/15 text-[#3b82f6] shadow-sm backdrop-blur-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {/* Page body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {/* ── TAB 1: COMMAND BRIDGE ── */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard-tab"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* ── 1. Top Section: VPP Engine Status, Grid Interconnect & 3D Model ── */}
                <motion.div variants={itemVariants}>
                  <EngineStatusBanner
                    optimizationStatus={mockEngineStatus.optimizationStatus}
                    wsProtocol={mockEngineStatus.wsProtocol}
                    microgridId={mockEngineStatus.microgridId}
                    gridStatusText="Exporting to Grid"
                    socPct={telemetry.socPct}
                    activeGenKw={telemetry.activeGenKw}
                  />
                </motion.div>

                {/* ── 2. KPI Strip (4 Cards with 3D Tilt & Count-Up) ── */}
                <motion.div variants={itemVariants}>
                  <KPIStrip telemetry={telemetry} latencyMs={latencyMs} />
                </motion.div>

                {/* ── 3. Middle Section: Live Power Flow Distribution (Sankey Diagram & Breakdown) ── */}
                <motion.div variants={itemVariants}>
                  <SankeyDiagram flows={telemetry.flowsKw} />
                </motion.div>

                {/* ── 4. Bottom Section: Action Priority Timeline ── */}
                <motion.div variants={itemVariants}>
                  <ActionTimeline
                    actions={actionPlan?.actions?.length ? actionPlan.actions : mockActions}
                    currentSoc={telemetry.socPct}
                    onExecuteAction={triggerManualAction}
                  />
                </motion.div>

                {/* Operational Events Drawer */}
                {alerts.length > 0 && (
                  <motion.div
                    variants={itemVariants}
                    className="p-4 rounded-3xl bg-white/40 dark:bg-white/[0.04] backdrop-blur-2xl border border-white/20 dark:border-white/10 text-xs space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      <Bell className="w-4 h-4 text-[#22c55e]" />
                      Live Operational Events Log
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto font-sans">
                      {alerts.slice(0, 4).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-black/30 border border-white/20 dark:border-white/10"
                        >
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{a.message}</span>
                          <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
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
