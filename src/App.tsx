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
import { MapPin, Thermometer, Wind, CloudSun, Activity, FileText } from 'lucide-react';

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
    temp: 32.4,
    humidity: 41,
    windSpeedKnots: 4,
    cloudCoverPct: 14,
    dniWm2: 289
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
    <div className="min-h-screen flex flex-col bg-[#0F172A] text-slate-100 font-sans selection:bg-slate-700 selection:text-white relative">
      
      {/* Refined Enterprise EMS Header */}
      <Header
        scenario={scenario}
        onScenarioChange={setScenario}
        isLiveBackend={isLiveBackend}
        telemetrySourceLabel={telemetrySourceLabel}
        onOpenReport={() => setIsAuditDrawerOpen(true)}
        onOpenArch={() => setIsArchOpen(true)}
      />

      {/* Main Dashboard Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        
        {/* Compact Weather & Site Context Strip (Objective 3) */}
        <div className="bg-[#131B2E]/60 border border-slate-700/40 rounded-lg px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 font-sans">
          <div className="flex items-center space-x-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300 font-medium">Jodhpur Campus Node-04</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Jaipur / Jodhpur (26.24°N, 73.02°E)</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-4">
              <span className="flex items-center gap-1 text-slate-300">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>{weather.temp}°C</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Wind className="w-3.5 h-3.5 text-sky-400" />
                <span>Wind: {weather.windSpeedKnots} kts</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>DNI: {weather.dniWm2} W/m²</span>
              </span>
            </div>

            <button
              onClick={() => setIsAuditDrawerOpen(true)}
              className="px-2.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs flex items-center gap-1 transition-all"
            >
              <FileText className="w-3 h-3 text-emerald-400" />
              <span>Audit Report</span>
            </button>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <IndustrialMetricStrip current={currentTelemetry} />

        {/* Cumulative Energy Balance Stacked Area Chart */}
        <IndustrialTelemetryChart data={telemetrySeries} />

        {/* Dispatch Console Table */}
        <IndustrialDispatchConsole
          actions={dispatchActions}
          onApproveAction={approveAction}
          autoPilot={autoPilot}
          onToggleAutoPilot={toggleAutoPilot}
        />

        {/* DTE Multi-Campus Fleet Overview */}
        <IndustrialCampusTable />

      </main>

      {/* Modals & Drawers */}
      <ExecutiveAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        telemetrySeries={telemetrySeries}
        currentTelemetry={currentTelemetry}
      />

      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />

      <PresentationHUD
        autoPlayDemo={autoPlayDemo}
        onToggleAutoPlay={toggleAutoPlayDemo}
        onOpenArch={() => setIsArchOpen(true)}
        onCycleScenario={cycleScenario}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0B0F17] py-3 px-6 text-center text-xs text-slate-500 font-sans">
        SuryaVayu Enterprise Energy Management System • SVH26004 • Directorate of Technical Education (DTE), Rajasthan
      </footer>

    </div>
  );
}

export default App;
