import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { IndustrialMetricStrip } from './components/IndustrialMetricStrip';
import { IndustrialTelemetryChart } from './components/IndustrialTelemetryChart';
import { IndustrialDispatchConsole } from './components/IndustrialDispatchConsole';
import { IndustrialCampusTable } from './components/IndustrialCampusTable';
import { MicrogridSynoptic } from './components/MicrogridSynoptic';
import { LiveSimulationDrawer } from './components/LiveSimulationDrawer';
import { DispatchToast } from './components/DispatchToast';
import { ExecutiveAuditDrawer } from './components/ExecutiveAuditDrawer';
import { ArchitectureModal } from './components/ArchitectureModal';
import { useLiveTelemetry } from './hooks/useLiveTelemetry';
import { fetchRajasthanWeatherTelemetry } from './services/apiService';
import { TelemetryPoint } from './types/energy';
import { MapPin, Thermometer, Wind, Activity, FileText } from 'lucide-react';

export function App() {
  const {
    scenario,
    setScenario,
    isLiveBackend,
    telemetrySourceLabel,
    currentTelemetry: baseTelemetry,
    telemetrySeries,
    dispatchActions,
    autoPilot,
    toggleAutoPilot,
    approveAction
  } = useLiveTelemetry();

  // Slider States for Live Simulation Control Panel
  const [isSimDrawerOpen, setIsSimDrawerOpen] = useState<boolean>(false);
  const [solarKwSlider, setSolarKwSlider] = useState<number>(142);
  const [windKwSlider, setWindKwSlider] = useState<number>(25);
  const [campusDemandSlider, setCampusDemandSlider] = useState<number>(110);
  const [isSliderActive, setIsSliderActive] = useState<boolean>(false);

  // Hover Scrubber state for chart timeline hover
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryPoint | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [weather, setWeather] = useState({
    temp: 32.4,
    humidity: 41,
    windSpeedKnots: 4,
    cloudCoverPct: 14,
    dniWm2: 289
  });

  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);
  const [isArchOpen, setIsArchOpen] = useState<boolean>(false);

  // Sync sliders when base scenario changes
  useEffect(() => {
    setSolarKwSlider(baseTelemetry.solarKw);
    setWindKwSlider(baseTelemetry.windKw);
    setCampusDemandSlider(baseTelemetry.campusDemandKw);
    setIsSliderActive(false);
  }, [baseTelemetry]);

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

  // Dynamically calculate active telemetry point (Hovered > Slider Modified > Base Telemetry)
  const activeTelemetry: TelemetryPoint = hoveredPoint
    ? hoveredPoint
    : isSliderActive
    ? (() => {
        const net = solarKwSlider + windKwSlider - campusDemandSlider;
        let bFlow = net > 0 ? Math.min(net, 45) : -Math.min(Math.abs(net), 60);
        let gImport = net < 0 ? Math.max(0, Math.abs(net) - Math.abs(bFlow)) : 0;
        let gExport = net > 0 ? Math.max(0, net - bFlow) : 0;

        return {
          timestamp: 'Live Sim',
          solarKw: solarKwSlider,
          windKw: windKwSlider,
          campusDemandKw: campusDemandSlider,
          batterySoc: baseTelemetry.batterySoc,
          batteryFlowKw: bFlow,
          gridImportKw: gImport,
          gridExportKw: gExport
        };
      })()
    : baseTelemetry;

  // Handle action dispatch with crisp toast micro-feedback
  const handleApproveActionWithToast = (id: string) => {
    approveAction(id);
    const randomLatency = Math.floor(Math.random() * 15) + 12;
    const randomOrderId = Math.floor(Math.random() * 900) + 100;
    setToastMessage(`Dispatch Order #SV-${randomOrderId} synced to Substation Inverter via Modbus TCP (Latency: ${randomLatency}ms)`);
    
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0F172A] text-slate-100 font-sans selection:bg-slate-700 selection:text-white relative">
      
      {/* Action Toast Feedback */}
      <DispatchToast
        toastMessage={toastMessage}
        onClose={() => setToastMessage(null)}
      />

      {/* Header Bar */}
      <Header
        scenario={scenario}
        onScenarioChange={setScenario}
        isLiveBackend={isLiveBackend}
        telemetrySourceLabel={telemetrySourceLabel}
        onOpenReport={() => setIsAuditDrawerOpen(true)}
        onOpenArch={() => setIsArchOpen(true)}
        isSimDrawerOpen={isSimDrawerOpen}
        onToggleSimDrawer={() => setIsSimDrawerOpen(!isSimDrawerOpen)}
      />

      {/* Main Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        
        {/* Compact Weather & Site Context Strip */}
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

        {/* Collapsible Live Simulation Stress-Test Sliders */}
        <LiveSimulationDrawer
          isOpen={isSimDrawerOpen}
          onClose={() => setIsSimDrawerOpen(false)}
          solarKwSlider={solarKwSlider}
          setSolarKwSlider={(val) => { setSolarKwSlider(val); setIsSliderActive(true); }}
          windKwSlider={windKwSlider}
          setWindKwSlider={(val) => { setWindKwSlider(val); setIsSliderActive(true); }}
          campusDemandSlider={campusDemandSlider}
          setCampusDemandSlider={(val) => { setCampusDemandSlider(val); setIsSliderActive(true); }}
          onResetSliders={() => {
            setSolarKwSlider(baseTelemetry.solarKw);
            setWindKwSlider(baseTelemetry.windKw);
            setCampusDemandSlider(baseTelemetry.campusDemandKw);
            setIsSliderActive(false);
          }}
        />

        {/* Dynamic Metric Cards (Reflects Active Telemetry & Hover Scrubber) */}
        <IndustrialMetricStrip current={activeTelemetry} />

        {/* Microgrid Directional Energy Flow Synoptic Visualizer */}
        <MicrogridSynoptic telemetry={activeTelemetry} />

        {/* Telemetry Stream Stacked Area Chart with Hover Scrubber */}
        <IndustrialTelemetryChart
          data={telemetrySeries}
          onHoverTelemetry={setHoveredPoint}
        />

        {/* Dispatch Console Section */}
        <IndustrialDispatchConsole
          actions={dispatchActions}
          onApproveAction={handleApproveActionWithToast}
          autoPilot={autoPilot}
          onToggleAutoPilot={toggleAutoPilot}
        />

        {/* Multi-Campus Fleet Table */}
        <IndustrialCampusTable />

      </main>

      {/* Modals & Drawers */}
      <ExecutiveAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        telemetrySeries={telemetrySeries}
        currentTelemetry={activeTelemetry}
      />

      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0B0F17] py-3 px-6 text-center text-xs text-slate-500 font-sans">
        SuryaVayu Enterprise Energy Management System • SVH26004 • Directorate of Technical Education (DTE), Rajasthan
      </footer>

    </div>
  );
}

export default App;
