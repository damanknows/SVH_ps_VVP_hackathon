import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { IndustrialMetricStrip } from './components/IndustrialMetricStrip';
import { IndustrialTelemetryChart } from './components/IndustrialTelemetryChart';
import { IndustrialDispatchConsole } from './components/IndustrialDispatchConsole';
import { IndustrialCampusTable } from './components/IndustrialCampusTable';
import { ExecutiveAuditDrawer } from './components/ExecutiveAuditDrawer';
import { ArchitectureModal } from './components/ArchitectureModal';
import { PresentationHUD } from './components/PresentationHUD';
import { useLiveTelemetry } from './hooks/useLiveTelemetry';
import { fetchRajasthanWeatherTelemetry } from './services/apiService';
import { Thermometer, Wind, CloudSun, Activity, FileText } from 'lucide-react';

export function App() {
  const {
    scenario,
    setScenario,
    cycleScenario,
    isLiveBackend,
    telemetrySourceLabel,
    currentTelemetry,
    telemetrySeries,
    dispatchActions,
    autoPilot,
    toggleAutoPilot,
    approveAction,
    autoPlayDemo,
    toggleAutoPlayDemo
  } = useLiveTelemetry();

  const [weather, setWeather] = useState({
    temp: 35.4,
    humidity: 41,
    windSpeedKnots: 9,
    cloudCoverPct: 14,
    dniWm2: 840
  });

  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);
  const [isArchOpen, setIsArchOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchRajasthanWeatherTelemetry().then((w: any) => setWeather(w));
  }, []);

  // Global Keyboard listener for Shift + A (Topology Modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsArchOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 font-sans selection:bg-slate-700 selection:text-white relative">
      
      {/* Industrial Header with Resilient Telemetry Indicator & Scenario Switcher */}
      <Header
        scenario={scenario}
        onScenarioChange={setScenario}
        isLiveBackend={isLiveBackend}
        telemetrySourceLabel={telemetrySourceLabel}
        onOpenReport={() => setIsAuditDrawerOpen(true)}
        onOpenArch={() => setIsArchOpen(true)}
      />

      {/* Main Industrial Console Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        
        {/* Weather & Live Station Bar */}
        <div className="console-panel p-3 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
            <span className="text-slate-300 font-bold">STATION: JODHPUR-DTE-NODE-04</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">LAT: 26.2389°N, LON: 73.0243°E</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-5 text-slate-400">
              <div className="flex items-center space-x-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>TEMP: <strong className="text-slate-200 font-normal">{weather.temp}°C</strong></span>
              </div>
              <div className="flex items-center space-x-1">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>WIND: <strong className="text-slate-200 font-normal">{weather.windSpeedKnots} KTS</strong></span>
              </div>
              <div className="flex items-center space-x-1">
                <CloudSun className="w-3.5 h-3.5 text-slate-400" />
                <span>CLOUD: <strong className="text-slate-200 font-normal">{weather.cloudCoverPct}%</strong></span>
              </div>
              <div className="hidden sm:flex items-center space-x-1 text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
                <span>DNI: {weather.dniWm2} W/m²</span>
              </div>
            </div>

            {/* Audit Trigger */}
            <button
              onClick={() => setIsAuditDrawerOpen(true)}
              className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[11px] font-mono font-semibold flex items-center gap-1 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Executive Audit Report</span>
            </button>
          </div>
        </div>

        {/* Top Telemetry KPI Cards */}
        <IndustrialMetricStrip current={currentTelemetry} />

        {/* Time-Series Telemetry Stream Chart */}
        <IndustrialTelemetryChart data={telemetrySeries} />

        {/* Dispatch Actions Console Table with Auto-Pilot & Verification */}
        <IndustrialDispatchConsole
          actions={dispatchActions}
          onApproveAction={approveAction}
          autoPilot={autoPilot}
          onToggleAutoPilot={toggleAutoPilot}
        />

        {/* DTE Multi-Campus Fleet Overview */}
        <IndustrialCampusTable />

      </main>

      {/* Slide-over Audit Drawer */}
      <ExecutiveAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        telemetrySeries={telemetrySeries}
        currentTelemetry={currentTelemetry}
      />

      {/* Architecture Inspector Modal */}
      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />

      {/* Presentation HUD Floating Helper */}
      <PresentationHUD
        autoPlayDemo={autoPlayDemo}
        onToggleAutoPlay={toggleAutoPlayDemo}
        onOpenArch={() => setIsArchOpen(true)}
        onCycleScenario={cycleScenario}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3 px-6 text-center font-mono text-[11px] text-slate-500">
        SURYA-VAYU INDUSTRIAL ENERGY CONSOLE • SVH26004 • DIRECTORATE OF TECHNICAL EDUCATION (DTE), RAJASTHAN
      </footer>

    </div>
  );
}

export default App;
