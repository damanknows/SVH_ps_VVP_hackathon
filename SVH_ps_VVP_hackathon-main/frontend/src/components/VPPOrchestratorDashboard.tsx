"use client";

import React, { useState, useEffect, useRef, useId, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  BarChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import {
  Sun,
  Wind,
  Zap,
  BatteryCharging,
  AlertTriangle,
  Download,
  Terminal as TerminalIcon,
  Activity,
  RefreshCw,
  ShieldCheck,
  Radio,
  Gauge,
  FileText,
  LayoutDashboard,
  DollarSign,
  CloudSun,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// ============================================================================
// 1. DATA STRUCTURES & MULTI-NODE TELEMETRY MODELS
// ============================================================================

export type VPPNodeId = "ALL" | "RAJ-01" | "RAJ-02" | "RAJ-03" | "RAJ-04";

export interface VPPNodeMeta {
  id: VPPNodeId;
  name: string;
  location: string;
  solarCapacityKw: number;
  windCapacityKw: number;
  bessCapacityKwh: number;
  peakDemandKw: number;
  gridVoltageKv: number;
  status: "ONLINE" | "DEGRADED" | "STANDBY";
}

export const VPP_NODES: VPPNodeMeta[] = [
  { id: "ALL", name: "Aggregated Grid Pool (All 4 Nodes)", location: "Rajasthan Inter-Campus Bus", solarCapacityKw: 5400, windCapacityKw: 3200, bessCapacityKwh: 12000, peakDemandKw: 7200, gridVoltageKv: 11.0, status: "ONLINE" },
  { id: "RAJ-01", name: "Jaipur Engineering Hub", location: "Jaipur Node 01", solarCapacityKw: 1800, windCapacityKw: 1000, bessCapacityKwh: 3000, peakDemandKw: 2400, gridVoltageKv: 11.04, status: "ONLINE" },
  { id: "RAJ-02", name: "Kota Technical Campus", location: "Kota Node 02", solarCapacityKw: 1200, windCapacityKw: 800, bessCapacityKwh: 3000, peakDemandKw: 1800, gridVoltageKv: 10.98, status: "ONLINE" },
  { id: "RAJ-03", name: "Jodhpur Technology Complex", location: "Jodhpur Node 03", solarCapacityKw: 1400, windCapacityKw: 900, bessCapacityKwh: 3000, peakDemandKw: 1700, gridVoltageKv: 11.02, status: "ONLINE" },
  { id: "RAJ-04", name: "Bikaner Clean Energy Station", location: "Bikaner Node 04", solarCapacityKw: 1000, windCapacityKw: 500, bessCapacityKwh: 3000, peakDemandKw: 1300, gridVoltageKv: 11.01, status: "ONLINE" },
];

export interface MasterTelemetryPoint {
  time: string;
  hour: number;
  solarKw: number;
  windKw: number;
  totalRenewable: number;
  gridDemandKw: number;
  bessPowerKw: number;      // (+) Discharge, (-) Charge
  bessSoc: number;          // 0 - 100%
  gridFrequencyHz: number;  // 49.80 - 50.20 Hz
  gridVoltageKv: number;    // kV L-L
  airDensity: number;       // kg/m³
  solarGhi: number;         // W/m²
  windSpeed: number;        // m/s
  avoidedCo2KgHr: number;   // kg/hr
  tariffCostInr: number;    // ₹/kWh
  hourlySavingsInr: number; // ₹ savings
  netDeficitKw: number;     // Grid import/export
  isPeakTariff: boolean;
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  level: "INFO" | "WARNING" | "CRITICAL" | "MATH" | "SYS" | "AUDIT";
  message: string;
}

export type ActiveTab = "overview" | "power-quality" | "bess-analytics" | "meteorology" | "economics" | "carbon-audit" | "terminal";

// 24-Hour Master Simulation Profile (Realistic SCADA telemetry)
const BASELINE_24H_DATA: MasterTelemetryPoint[] = [
  { time: "00:00", hour: 0, solarKw: 0, windKw: 620, totalRenewable: 620, gridDemandKw: 1100, bessPowerKw: -120, bessSoc: 92, gridFrequencyHz: 50.01, gridVoltageKv: 11.02, airDensity: 1.201, solarGhi: 0, windSpeed: 7.2, avoidedCo2KgHr: 502, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 480, isPeakTariff: false },
  { time: "01:00", hour: 1, solarKw: 0, windKw: 680, totalRenewable: 680, gridDemandKw: 1040, bessPowerKw: -100, bessSoc: 94, gridFrequencyHz: 50.02, gridVoltageKv: 11.03, airDensity: 1.203, solarGhi: 0, windSpeed: 7.5, avoidedCo2KgHr: 550, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 360, isPeakTariff: false },
  { time: "02:00", hour: 2, solarKw: 0, windKw: 710, totalRenewable: 710, gridDemandKw: 990, bessPowerKw: -80, bessSoc: 96, gridFrequencyHz: 50.02, gridVoltageKv: 11.04, airDensity: 1.205, solarGhi: 0, windSpeed: 7.8, avoidedCo2KgHr: 575, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 280, isPeakTariff: false },
  { time: "03:00", hour: 3, solarKw: 0, windKw: 740, totalRenewable: 740, gridDemandKw: 950, bessPowerKw: -50, bessSoc: 97, gridFrequencyHz: 50.03, gridVoltageKv: 11.04, airDensity: 1.206, solarGhi: 0, windSpeed: 8.0, avoidedCo2KgHr: 599, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 210, isPeakTariff: false },
  { time: "04:00", hour: 4, solarKw: 0, windKw: 690, totalRenewable: 690, gridDemandKw: 980, bessPowerKw: 0, bessSoc: 97, gridFrequencyHz: 50.01, gridVoltageKv: 11.02, airDensity: 1.204, solarGhi: 0, windSpeed: 7.6, avoidedCo2KgHr: 558, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 290, isPeakTariff: false },
  { time: "05:00", hour: 5, solarKw: 15, windKw: 640, totalRenewable: 655, gridDemandKw: 1080, bessPowerKw: 0, bessSoc: 97, gridFrequencyHz: 49.99, gridVoltageKv: 11.01, airDensity: 1.201, solarGhi: 20, windSpeed: 7.3, avoidedCo2KgHr: 530, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 425, isPeakTariff: false },
  { time: "06:00", hour: 6, solarKw: 140, windKw: 590, totalRenewable: 730, gridDemandKw: 1320, bessPowerKw: 50, bessSoc: 96, gridFrequencyHz: 49.98, gridVoltageKv: 10.99, airDensity: 1.198, solarGhi: 120, windSpeed: 6.9, avoidedCo2KgHr: 631, tariffCostInr: 5.20, hourlySavingsInr: 260, netDeficitKw: 590, isPeakTariff: false },
  { time: "07:00", hour: 7, solarKw: 420, windKw: 530, totalRenewable: 950, gridDemandKw: 1650, bessPowerKw: 120, bessSoc: 93, gridFrequencyHz: 49.97, gridVoltageKv: 10.98, airDensity: 1.194, solarGhi: 340, windSpeed: 6.4, avoidedCo2KgHr: 866, tariffCostInr: 5.20, hourlySavingsInr: 624, netDeficitKw: 700, isPeakTariff: false },
  { time: "08:00", hour: 8, solarKw: 780, windKw: 560, totalRenewable: 1340, gridDemandKw: 1920, bessPowerKw: 180, bessSoc: 89, gridFrequencyHz: 49.98, gridVoltageKv: 10.99, airDensity: 1.191, solarGhi: 560, windSpeed: 6.7, avoidedCo2KgHr: 1231, tariffCostInr: 5.20, hourlySavingsInr: 936, netDeficitKw: 580, isPeakTariff: false },
  { time: "09:00", hour: 9, solarKw: 1120, windKw: 610, totalRenewable: 1730, gridDemandKw: 2150, bessPowerKw: 150, bessSoc: 85, gridFrequencyHz: 50.00, gridVoltageKv: 11.00, airDensity: 1.188, solarGhi: 740, windSpeed: 7.1, avoidedCo2KgHr: 1522, tariffCostInr: 5.20, hourlySavingsInr: 780, netDeficitKw: 420, isPeakTariff: false },
  { time: "10:00", hour: 10, solarKw: 1390, windKw: 690, totalRenewable: 2080, gridDemandKw: 2280, bessPowerKw: -100, bessSoc: 83, gridFrequencyHz: 50.02, gridVoltageKv: 11.03, airDensity: 1.185, solarGhi: 880, windSpeed: 7.8, avoidedCo2KgHr: 1603, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 200, isPeakTariff: false },
  { time: "11:00", hour: 11, solarKw: 1580, windKw: 740, totalRenewable: 2320, gridDemandKw: 2340, bessPowerKw: -280, bessSoc: 86, gridFrequencyHz: 50.03, gridVoltageKv: 11.05, airDensity: 1.182, solarGhi: 960, windSpeed: 8.2, avoidedCo2KgHr: 1652, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 20, isPeakTariff: false },
  { time: "12:00", hour: 12, solarKw: 1690, windKw: 780, totalRenewable: 2470, gridDemandKw: 2310, bessPowerKw: -420, bessSoc: 92, gridFrequencyHz: 50.04, gridVoltageKv: 11.06, airDensity: 1.179, solarGhi: 1010, windSpeed: 8.4, avoidedCo2KgHr: 1660, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: -160, isPeakTariff: false },
  { time: "13:00", hour: 13, solarKw: 1650, windKw: 810, totalRenewable: 2460, gridDemandKw: 2250, bessPowerKw: -450, bessSoc: 97, gridFrequencyHz: 50.03, gridVoltageKv: 11.05, airDensity: 1.177, solarGhi: 990, windSpeed: 8.5, avoidedCo2KgHr: 1628, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: -210, isPeakTariff: false },
  { time: "14:00", hour: 14, solarKw: 1520, windKw: 830, totalRenewable: 2350, gridDemandKw: 2210, bessPowerKw: -300, bessSoc: 99, gridFrequencyHz: 50.02, gridVoltageKv: 11.03, airDensity: 1.176, solarGhi: 920, windSpeed: 8.6, avoidedCo2KgHr: 1660, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: -140, isPeakTariff: false },
  { time: "15:00", hour: 15, solarKw: 1280, windKw: 850, totalRenewable: 2130, gridDemandKw: 2180, bessPowerKw: 0, bessSoc: 99, gridFrequencyHz: 50.01, gridVoltageKv: 11.02, airDensity: 1.178, solarGhi: 780, windSpeed: 8.7, avoidedCo2KgHr: 1725, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 50, isPeakTariff: false },
  { time: "16:00", hour: 16, solarKw: 920, windKw: 860, totalRenewable: 1780, gridDemandKw: 2120, bessPowerKw: 120, bessSoc: 97, gridFrequencyHz: 50.00, gridVoltageKv: 11.01, airDensity: 1.181, solarGhi: 580, windSpeed: 8.8, avoidedCo2KgHr: 1539, tariffCostInr: 5.20, hourlySavingsInr: 624, netDeficitKw: 340, isPeakTariff: false },
  { time: "17:00", hour: 17, solarKw: 480, windKw: 870, totalRenewable: 1350, gridDemandKw: 2090, bessPowerKw: 240, bessSoc: 93, gridFrequencyHz: 49.99, gridVoltageKv: 10.99, airDensity: 1.183, solarGhi: 310, windSpeed: 8.9, avoidedCo2KgHr: 1287, tariffCostInr: 5.20, hourlySavingsInr: 1248, netDeficitKw: 740, isPeakTariff: false },
  { time: "18:00", hour: 18, solarKw: 90, windKw: 840, totalRenewable: 930, gridDemandKw: 2260, bessPowerKw: 450, bessSoc: 86, gridFrequencyHz: 49.98, gridVoltageKv: 10.97, airDensity: 1.184, solarGhi: 80, windSpeed: 8.6, avoidedCo2KgHr: 1117, tariffCostInr: 9.80, hourlySavingsInr: 4410, netDeficitKw: 1330, isPeakTariff: true },
  { time: "19:00", hour: 19, solarKw: 0, windKw: 810, totalRenewable: 810, gridDemandKw: 2380, bessPowerKw: 480, bessSoc: 77, gridFrequencyHz: 49.97, gridVoltageKv: 10.96, airDensity: 1.186, solarGhi: 0, windSpeed: 8.3, avoidedCo2KgHr: 1044, tariffCostInr: 9.80, hourlySavingsInr: 4704, netDeficitKw: 1570, isPeakTariff: true },
  { time: "20:00", hour: 20, solarKw: 0, windKw: 760, totalRenewable: 760, gridDemandKw: 2420, bessPowerKw: 490, bessSoc: 68, gridFrequencyHz: 49.96, gridVoltageKv: 10.95, airDensity: 1.189, solarGhi: 0, windSpeed: 7.9, avoidedCo2KgHr: 1012, tariffCostInr: 9.80, hourlySavingsInr: 4802, netDeficitKw: 1660, isPeakTariff: true },
  { time: "21:00", hour: 21, solarKw: 0, windKw: 720, totalRenewable: 720, gridDemandKw: 2290, bessPowerKw: 460, bessSoc: 60, gridFrequencyHz: 49.98, gridVoltageKv: 10.98, airDensity: 1.192, solarGhi: 0, windSpeed: 7.6, avoidedCo2KgHr: 955, tariffCostInr: 9.80, hourlySavingsInr: 4508, netDeficitKw: 1570, isPeakTariff: true },
  { time: "22:00", hour: 22, solarKw: 0, windKw: 680, totalRenewable: 680, gridDemandKw: 1840, bessPowerKw: 180, bessSoc: 57, gridFrequencyHz: 50.00, gridVoltageKv: 11.00, airDensity: 1.195, solarGhi: 0, windSpeed: 7.2, avoidedCo2KgHr: 696, tariffCostInr: 5.20, hourlySavingsInr: 936, netDeficitKw: 1160, isPeakTariff: false },
  { time: "23:00", hour: 23, solarKw: 0, windKw: 640, totalRenewable: 640, gridDemandKw: 1420, bessPowerKw: 0, bessSoc: 57, gridFrequencyHz: 50.01, gridVoltageKv: 11.02, airDensity: 1.198, solarGhi: 0, windSpeed: 7.0, avoidedCo2KgHr: 518, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 780, isPeakTariff: false },
  { time: "24:00", hour: 24, solarKw: 0, windKw: 610, totalRenewable: 610, gridDemandKw: 1180, bessPowerKw: -100, bessSoc: 59, gridFrequencyHz: 50.02, gridVoltageKv: 11.03, airDensity: 1.200, solarGhi: 0, windSpeed: 6.8, avoidedCo2KgHr: 413, tariffCostInr: 5.20, hourlySavingsInr: 0, netDeficitKw: 570, isPeakTariff: false },
];

const INITIAL_LOGS: TerminalLog[] = [
  { id: "log-1", timestamp: "18:04:02", level: "SYS", message: "SCADA telemetry bus initialized. CIPM-2007 air density model calibrated." },
  { id: "log-2", timestamp: "18:04:08", level: "INFO", message: "Grid frequency phase-locked at 50.02 Hz (Δf = +0.02 Hz nominal, THDv = 1.82%)." },
  { id: "log-3", timestamp: "18:04:12", level: "WARNING", message: "Packet drop detected on Sensor_3 (Array-B Pyranometer)." },
  { id: "log-4", timestamp: "18:04:12", level: "MATH", message: "Finite difference interpolation patch applied successfully. Δy = +2.4kW." },
  { id: "log-5", timestamp: "18:04:15", level: "INFO", message: "TOD Tariff Window active [18:00 - 22:00]. Peak rate: ₹9.80/kWh." },
  { id: "log-6", timestamp: "18:04:18", level: "SYS", message: "BESS Inverter Rack 01-04 ramped to 450 kW discharge rate for peak shaving." },
  { id: "log-7", timestamp: "18:04:22", level: "AUDIT", message: "CEA Carbon intensity factor verified: 0.81 tCO2/MWh. Real-time offset: 1,121.8 kg/hr." },
];

const HARMONICS_DATA = [
  { order: "H1 (50Hz)", voltageThd: 100.0, currentThd: 100.0, limit: 100.0 },
  { order: "H3 (150Hz)", voltageThd: 0.42, currentThd: 0.84, limit: 3.0 },
  { order: "H5 (250Hz)", voltageThd: 0.88, currentThd: 1.42, limit: 3.0 },
  { order: "H7 (350Hz)", voltageThd: 0.54, currentThd: 0.96, limit: 3.0 },
  { order: "H9 (450Hz)", voltageThd: 0.18, currentThd: 0.32, limit: 1.5 },
  { order: "H11 (550Hz)", voltageThd: 0.31, currentThd: 0.65, limit: 2.0 },
  { order: "H13 (650Hz)", voltageThd: 0.22, currentThd: 0.44, limit: 2.0 },
];

export default function VPPOrchestratorDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [selectedNode, setSelectedNode] = useState<VPPNodeId>("ALL");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [statusMode, setStatusMode] = useState<"NOMINAL" | "ARBITRAGE">("NOMINAL");

  const [isInterpolated, setIsInterpolated] = useState<boolean>(true);
  const [logs, setLogs] = useState<TerminalLog[]>(INITIAL_LOGS);
  const [logFilter, setLogFilter] = useState<"ALL" | "WARNING" | "MATH" | "AUDIT">("ALL");
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [lastTickUpdated, setLastTickUpdated] = useState<boolean>(false);

  const [telemetry, setTelemetry] = useState({
    solarKw: 92.4,
    solarIrradiance: 84.6,
    windKw: 842.1,
    windSpeed: 8.6,
    airDensity: 1.1842,
    gridDemandKw: 2264.8,
    gridFrequency: 50.02,
    gridVoltageKv: 11.04,
    powerFactor: 0.984,
    thdVoltage: 1.82,
    bessSoc: 86.4,
    bessPowerKw: 450.0,
    bessCellTemp: 24.8,
    bessSoh: 99.4,
    cumulativeAvoidedTodayTons: 14.28,
    currentTimeString: "18:04:12",
  });

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();

  const nodeMultiplier = useMemo(() => {
    switch (selectedNode) {
      case "ALL": return 1.0;
      case "RAJ-01": return 0.33;
      case "RAJ-02": return 0.22;
      case "RAJ-03": return 0.26;
      case "RAJ-04": return 0.19;
      default: return 1.0;
    }
  }, [selectedNode]);

  const forecastData = useMemo(() => {
    return BASELINE_24H_DATA.map((pt) => {
      const solar = +(pt.solarKw * nodeMultiplier).toFixed(1);
      const wind = +(pt.windKw * nodeMultiplier).toFixed(1);
      const demand = +(pt.gridDemandKw * nodeMultiplier).toFixed(1);
      const bess = +(pt.bessPowerKw * nodeMultiplier).toFixed(1);
      const total = +(solar + wind).toFixed(1);
      const deficit = +(demand - total).toFixed(1);
      const co2 = +(pt.avoidedCo2KgHr * nodeMultiplier).toFixed(1);
      const savings = +(pt.hourlySavingsInr * nodeMultiplier).toFixed(0);
      return {
        ...pt,
        solarKw: solar,
        windKw: wind,
        totalRenewable: total,
        gridDemandKw: demand,
        bessPowerKw: bess,
        netDeficitKw: deficit,
        avoidedCo2KgHr: co2,
        hourlySavingsInr: savings,
      };
    });
  }, [nodeMultiplier]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Real-Time Live Telemetry Loop
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];

      const jitterSolar = (Math.random() - 0.5) * 1.5 * nodeMultiplier;
      const jitterWind = (Math.random() - 0.5) * 3.8 * nodeMultiplier;
      const jitterDemand = (Math.random() - 0.5) * 7.5 * nodeMultiplier;
      const jitterAirDensity = (Math.random() - 0.5) * 0.0004;
      const jitterFreq = (Math.random() - 0.5) * 0.008;

      setTelemetry((prev) => ({
        ...prev,
        solarKw: Math.max(0, +(prev.solarKw + jitterSolar).toFixed(1)),
        windKw: Math.max(100 * nodeMultiplier, +(prev.windKw + jitterWind).toFixed(1)),
        airDensity: +(prev.airDensity + jitterAirDensity).toFixed(4),
        gridDemandKw: +(prev.gridDemandKw + jitterDemand).toFixed(1),
        gridFrequency: +(50.0 + jitterFreq).toFixed(3),
        currentTimeString: timeStr,
      }));

      setLastTickUpdated(true);
      setTimeout(() => setLastTickUpdated(false), 800);

      if (Math.random() > 0.65) {
        const edgeEvents: Array<{ level: TerminalLog["level"]; message: string }> = [
          { level: "INFO", message: `Telemetry sync cycle completed for [${selectedNode}]: 24 electrical channels polled @ 12ms latency.` },
          { level: "MATH", message: "CIPM-2007 Moist air density recalculated: ρ = 1.1842 kg/m³ (Residual < 0.0002)." },
          { level: "SYS", message: "Phase angle locked at 0.004 rad. Voltage THD within limits (1.82% vs 5.00% max)." },
          { level: "AUDIT", message: `CEA Grid baseline factor verified: 0.81 tCO2/MWh. Rate: +${(+(telemetry.solarKw + telemetry.windKw + telemetry.bessPowerKw) * 0.001 * 0.81 * 1000).toFixed(1)} kg/hr.` },
          { level: "INFO", message: "BESS Inverter Rack 01-04 active power injection nominal @ 450.0 kW." },
        ];
        const randomEvent = edgeEvents[Math.floor(Math.random() * edgeEvents.length)];
        
        setLogs((prev) => [
          ...prev.slice(-40),
          {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: timeStr,
            level: randomEvent.level,
            message: randomEvent.message,
          },
        ]);
      }
    }, 2400);

    return () => clearInterval(interval);
  }, [isLiveStreaming, selectedNode, nodeMultiplier, telemetry.solarKw, telemetry.windKw, telemetry.bessPowerKw]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim().toLowerCase();
    const timestamp = new Date().toTimeString().split(" ")[0];
    let replyLevel: TerminalLog["level"] = "INFO";
    let replyMsg = `Command executed: "${terminalInput}"`;

    if (cmd === "help") {
      replyMsg = "SCADA CLI Directives: [status, export-cea, patch, calibrate, harmonics, clear, nodes]";
    } else if (cmd === "status") {
      replyMsg = `SCADA NODE: ${selectedNode} | FREQ: ${telemetry.gridFrequency}Hz | VOLT: ${telemetry.gridVoltageKv}kV | SOC: ${telemetry.bessSoc}% | PF: ${telemetry.powerFactor}`;
    } else if (cmd === "export-cea" || cmd === "export") {
      handleExportCarbonAudit();
      replyLevel = "AUDIT";
      replyMsg = "CEA Carbon Audit SHA-256 exported successfully (0.81 tCO2/MWh baseline).";
    } else if (cmd.includes("patch") || cmd.includes("drop")) {
      triggerPacketDropTest();
      replyLevel = "WARNING";
      replyMsg = `Interpolation patch state toggled. Current state: ${!isInterpolated ? "ACTIVE" : "RAW FEED"}`;
    } else if (cmd.includes("clear")) {
      setLogs([]);
      setTerminalInput("");
      return;
    } else if (cmd.includes("calibrate")) {
      replyLevel = "MATH";
      replyMsg = "CIPM-2007 Pyranometer & Barometric calibration routine finished with R² = 0.9996.";
    }

    setLogs((prev) => [
      ...prev,
      { id: `cmd-${Date.now()}`, timestamp, level: "SYS", message: `> ${terminalInput}` },
      { id: `rep-${Date.now() + 1}`, timestamp, level: replyLevel, message: replyMsg },
    ]);
    setTerminalInput("");
  };

  const handleExportCarbonAudit = () => {
    const auditData = {
      audit_protocol: "CEA-GRID-EMISSIONS-DB-2026",
      project_id: "SVH26004",
      selected_node: selectedNode,
      authority: "Central Electricity Authority (CEA) / Rajasthan DTE",
      certified_grid_carbon_intensity: "0.81 tCO2/MWh",
      timestamp_utc: new Date().toISOString(),
      active_telemetry: {
        solar_kw: telemetry.solarKw,
        wind_kw: telemetry.windKw,
        total_renewable_kw: +(telemetry.solarKw + telemetry.windKw).toFixed(2),
        campus_demand_kw: telemetry.gridDemandKw,
        bess_discharge_kw: telemetry.bessPowerKw,
        bess_soc_pct: telemetry.bessSoc,
        moist_air_density_kg_m3: telemetry.airDensity,
        grid_frequency_hz: telemetry.gridFrequency,
        grid_voltage_kv: telemetry.gridVoltageKv,
        power_factor: telemetry.powerFactor,
      },
      emission_offset_rate_kg_per_hr: +(
        (telemetry.solarKw + telemetry.windKw + telemetry.bessPowerKw) *
        0.001 *
        0.81 *
        1000
      ).toFixed(2),
      cumulative_offset_today_tco2: telemetry.cumulativeAvoidedTodayTons,
      cryptographic_hash_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      compliance_standards: ["ISO-14064-3", "CEA Baseline Database v20.0", "IEEE-519 Power Quality"],
    };

    const blob = new Blob([JSON.stringify(auditData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CEA_Carbon_Audit_SVH26004_${selectedNode}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(`CEA Carbon Audit exported for [${selectedNode}] (0.81 tCO2/MWh)`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const triggerPacketDropTest = () => {
    setIsInterpolated((prev) => !prev);
    const timestamp = new Date().toTimeString().split(" ")[0];
    if (!isInterpolated) {
      setLogs((prev) => [
        ...prev,
        {
          id: `log-drop-${Date.now()}`,
          timestamp,
          level: "WARNING",
          message: "FAULT INJECTION: Sensor_3 optical dropped packets. Applying finite difference interpolation patch.",
        },
      ]);
    } else {
      setLogs((prev) => [
        ...prev,
        {
          id: `log-rec-${Date.now()}`,
          timestamp,
          level: "INFO",
          message: "RESTORED: Sensor_3 raw optical telemetry restored. Interpolation fallback disengaged.",
        },
      ]);
    }
  };

  const filteredLogs = useMemo(() => {
    if (logFilter === "ALL") return logs;
    return logs.filter((l) => l.level === logFilter);
  }, [logs, logFilter]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col antialiased selection:bg-cyan-500/20 selection:text-cyan-900">
      
      {/* Top Animated Energy Stream Bar */}
      <div className="animate-energy-stream h-1.5 w-full shrink-0" />

      {/* Floating Toast Alert */}
      {exportNotice && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-white border-2 border-emerald-500 text-emerald-900 px-5 py-3.5 shadow-2xl font-mono text-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
          <span className="font-bold">{exportNotice}</span>
        </div>
      )}

      {/* Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white border-2 border-slate-300 p-7 font-mono text-sm text-slate-800 shadow-2xl rounded-none">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5 text-cyan-900 font-bold uppercase tracking-wider text-base">
                <ShieldCheck className="h-6 w-6 text-cyan-700" />
                <span>CEA Grid Emissions Audit Certificate // ISO-14064-3</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-3 py-1 border border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold cursor-pointer transition-colors"
              >
                CLOSE [ESC]
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">CERTIFIED GRID EMISSION FACTOR:</span> <span className="text-amber-700 font-black text-base">0.81 tCO2/MWh</span></div>
                <div className="flex justify-between"><span className="text-slate-600">TARGET VPP ENTITY:</span> <span className="text-slate-900 font-bold">{selectedNode} ({VPP_NODES.find(n => n.id === selectedNode)?.name})</span></div>
                <div className="flex justify-between"><span className="text-slate-600">ACTIVE RENEWABLE DISPATCH:</span> <span className="text-cyan-800 font-black">{(telemetry.solarKw + telemetry.windKw).toFixed(1)} kW</span></div>
                <div className="flex justify-between"><span className="text-slate-600">REALTIME AVOIDED CARBON FLUX:</span> <span className="text-emerald-700 font-black">+{( (telemetry.solarKw + telemetry.windKw + telemetry.bessPowerKw) * 0.001 * 0.81 * 1000 ).toFixed(1)} kg CO2/hr</span></div>
                <div className="flex justify-between"><span className="text-slate-600">CUMULATIVE 24H AVOIDANCE:</span> <span className="text-emerald-700 font-black">{telemetry.cumulativeAvoidedTodayTons} tCO2</span></div>
              </div>

              <div className="p-3.5 bg-slate-100 border border-slate-200 space-y-1.5 text-xs text-slate-700">
                <div className="text-cyan-900 uppercase font-black text-xs">Cryptographic Verification Ledger:</div>
                <div className="text-slate-600 break-all font-mono">SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</div>
                <div>Status: <span className="text-emerald-700 font-bold">COMPLIANT (Central Electricity Authority Baseline v20.0)</span></div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleExportCarbonAudit}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-sm tracking-wider uppercase cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>Download Certified Audit JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. TOP GLOBAL COMMAND NAVBAR (LARGER FONTS + LIVE PULSES)           */}
      {/* =================================================================== */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 px-5 sm:px-8 py-3.5 shadow-xs">
        <div className="mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-11 w-11 bg-cyan-700 text-white shadow-md relative group">
              <Zap className="h-6 w-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                  SVH26004 VPP ORCHESTRATOR
                </h1>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-50 border border-cyan-400 text-xs font-mono font-bold tracking-widest text-cyan-900 uppercase shadow-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-600 animate-ping" />
                  LIVE SCADA
                </span>
              </div>
              <p className="text-xs sm:text-sm font-mono text-slate-500 font-medium">
                RAJASTHAN DTE VPP BUS // 11.0 kV 3-PHASE GRID // LATENCY: 12ms // CIPM-2007
              </p>
            </div>
          </div>

          {/* Large Electrical Bus HUD Readout */}
          <div className="hidden xl:flex items-center gap-6 bg-slate-50 border border-slate-200 px-5 py-2 font-mono text-sm shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 uppercase text-xs font-bold">Freq:</span>
              <span className="font-black text-emerald-700 text-base tabular-nums">{telemetry.gridFrequency} Hz</span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500 uppercase text-xs font-bold">Voltage:</span>
              <span className="font-black text-slate-900 text-base tabular-nums">{telemetry.gridVoltageKv} kV</span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500 uppercase text-xs font-bold">PF:</span>
              <span className="font-black text-cyan-900 text-base tabular-nums">{telemetry.powerFactor} lag</span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500 uppercase text-xs font-bold">THDv:</span>
              <span className="font-black text-slate-900 text-base tabular-nums">{telemetry.thdVoltage}%</span>
            </div>
          </div>

          {/* Animated Glowing Status Pill */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatusMode((m) => (m === "NOMINAL" ? "ARBITRAGE" : "NOMINAL"))}
              className={`group flex items-center gap-3 px-4 py-2 border-2 font-mono text-xs sm:text-sm uppercase tracking-wider cursor-pointer select-none transition-all duration-300 ${
                statusMode === "NOMINAL"
                  ? "bg-emerald-50 border-emerald-400 text-emerald-900 hover:bg-emerald-100 animate-glow-emerald"
                  : "bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100 animate-glow-amber"
              }`}
            >
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusMode === "NOMINAL" ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${statusMode === "NOMINAL" ? "bg-emerald-600" : "bg-amber-600"}`} />
              </span>
              <span className="font-black">
                {statusMode === "NOMINAL" ? "SYSTEM NOMINAL" : "PEAK ARBITRAGE ACTIVE"}
              </span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAuditModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:border-cyan-600 text-slate-800 hover:text-cyan-900 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs hover:shadow-md"
            >
              <FileText className="h-4 w-4 text-cyan-600" />
              <span>Audit Cert</span>
            </button>

            <button
              type="button"
              onClick={handleExportCarbonAudit}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-mono text-xs sm:text-sm font-black uppercase tracking-wider shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Export CEA Audit</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLiveStreaming((s) => !s)}
              className={`p-2 border font-mono text-sm transition-all cursor-pointer shadow-xs ${
                isLiveStreaming ? "border-emerald-400 text-emerald-800 bg-emerald-50" : "border-slate-300 text-slate-500 bg-slate-100"
              }`}
              title={isLiveStreaming ? "Pause Live Stream" : "Resume Live Stream"}
            >
              <RefreshCw className={`h-4 w-4 ${isLiveStreaming ? "animate-spin-slow" : ""}`} />
            </button>
          </div>

        </div>
      </nav>

      {/* Main Layout Body */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1880px] mx-auto">
        
        {/* =================================================================== */}
        {/* 2. TACTICAL LEFT SIDEBAR (LARGE FONTS + SMOOTH HOVERS)              */}
        {/* =================================================================== */}
        <aside className={`${sidebarCollapsed ? "w-20" : "w-72"} bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 transition-all duration-300 shadow-xs`}>
          
          <div className="space-y-6">
            
            {/* Campus Node Selector */}
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-500">
                  {!sidebarCollapsed ? "Campus Microgrid Node" : "Node"}
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  className="text-slate-400 hover:text-slate-800 p-1 cursor-pointer transition-colors"
                  title="Collapse / Expand Sidebar"
                >
                  <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${sidebarCollapsed ? "" : "rotate-180"}`} />
                </button>
              </div>

              {!sidebarCollapsed ? (
                <div className="space-y-1.5">
                  {VPP_NODES.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedNode(node.id)}
                      className={`w-full text-left px-3.5 py-2.5 border text-xs sm:text-sm font-mono transition-all duration-200 flex items-center justify-between cursor-pointer ${
                        selectedNode === node.id
                          ? "bg-cyan-50 border-cyan-500 text-cyan-950 font-black shadow-xs translate-x-1"
                          : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200"
                      }`}
                    >
                      <span className="truncate">{node.id} - {node.name.split(" ")[0]}</span>
                      <span className="text-xs text-slate-500 font-semibold">{((node.solarCapacityKw + node.windCapacityKw) / 1000).toFixed(1)}MW</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center font-mono text-sm font-black text-cyan-900 bg-cyan-50 p-2 border border-cyan-300">
                  {selectedNode}
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-500 px-1">
                {!sidebarCollapsed && "SCADA Views"}
              </span>

              {[
                { id: "overview", label: "Master Dispatch Matrix", icon: LayoutDashboard },
                { id: "power-quality", label: "Grid & Power Quality (IEEE 519)", icon: Gauge },
                { id: "bess-analytics", label: "BESS Multi-Cell Analytics", icon: BatteryCharging },
                { id: "meteorology", label: "CIPM-2007 Meteorology", icon: CloudSun },
                { id: "economics", label: "TOD Tariff Arbitrage", icon: DollarSign },
                { id: "carbon-audit", label: "CEA Carbon & ESG Ledger", icon: ShieldCheck },
                { id: "terminal", label: "Edge Interpolation CLI", icon: TerminalIcon },
              ].map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id as ActiveTab)}
                    className={`w-full text-left px-3.5 py-3 text-sm font-mono flex items-center gap-3 transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white font-bold shadow-md translate-x-1"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <IconComponent className={`h-5 w-5 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Sidebar Quick Footer Stats */}
          {!sidebarCollapsed && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5 font-mono text-xs sm:text-sm text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Total Generation:</span>
                <span className="font-black text-cyan-900 text-base">{ (telemetry.solarKw + telemetry.windKw).toFixed(1) } kW</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Grid Demand:</span>
                <span className="font-black text-rose-700 text-base">{ telemetry.gridDemandKw } kW</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Avoided CO2:</span>
                <span className="font-black text-emerald-700 text-base">{ telemetry.cumulativeAvoidedTodayTons } tCO2</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-500 mt-3 shadow-inner">
                <div className="font-bold text-slate-800">SCADA DISPATCHER: RAJ-01</div>
                <div>SECURE TLS 1.3 // CIPM-2007</div>
              </div>
            </div>
          )}

        </aside>

        {/* =================================================================== */}
        {/* 3. MAIN DASHBOARD CONTENT (BIG FONTS + 6 CHARTS + ANIMATIONS)       */}
        {/* =================================================================== */}
        <main className="flex-1 p-5 sm:p-8 space-y-6 overflow-y-auto">
          
          {/* =============================================================== */}
          {/* A. 4 MAIN TELEMETRY CARDS (MASSIVE 4XL-5XL NUMBERS + PULSES)     */}
          {/* =============================================================== */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Card 1: Solar Output (kW) */}
            <div className="bg-white border-2 border-slate-200 p-6 shadow-xs hover:border-amber-500 hover:shadow-md transition-all duration-300 relative group overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-700 group-hover:scale-110 transition-transform">
                    <Sun className="h-6 w-6 animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                      Solar Output
                    </h3>
                    <span className="text-xs font-mono text-slate-500 font-semibold">ARRAY_01-04 (5.4 MWp)</span>
                  </div>
                </div>

                {isInterpolated && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-400 text-xs font-mono font-black text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-700 animate-bounce" />
                    <span>PATCHED</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className={`text-4xl sm:text-5xl font-mono font-black text-slate-900 tracking-tight tabular-nums transition-colors ${lastTickUpdated ? "text-amber-600" : ""}`}>
                  {telemetry.solarKw.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="font-mono text-base text-amber-700 font-black">kW</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs sm:text-sm font-mono text-slate-700">
                <div>
                  <span className="text-slate-500 font-semibold">GHI Irradiance: </span>
                  <span className="text-slate-900 font-bold">{telemetry.solarIrradiance} W/m²</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-semibold">Inverter Eff: </span>
                  <span className="text-emerald-700 font-black">98.8%</span>
                </div>
              </div>
            </div>

            {/* Card 2: Wind Output (kW) + Moist Air Density */}
            <div className="bg-white border-2 border-slate-200 p-6 shadow-xs hover:border-cyan-500 hover:shadow-md transition-all duration-300 relative group overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-50 border border-cyan-300 text-cyan-700 group-hover:scale-110 transition-transform">
                    <Wind className="h-6 w-6 animate-spin-turbine" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                      Wind Output
                    </h3>
                    <span className="text-xs font-mono text-slate-500 font-semibold">TURBINES_N1-N4 (3.2 MW)</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono text-cyan-900 font-black bg-cyan-50 px-2 py-0.5 border border-cyan-300">
                  <Activity className="h-4 w-4 animate-pulse text-cyan-700" />
                  <span>{telemetry.windSpeed} m/s</span>
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className={`text-4xl sm:text-5xl font-mono font-black text-slate-900 tracking-tight tabular-nums transition-colors ${lastTickUpdated ? "text-cyan-700" : ""}`}>
                  {telemetry.windKw.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="font-mono text-base text-cyan-700 font-black">kW</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-mono">
                <span className="text-slate-500 font-semibold">Moist Air Density:</span>
                <span className="text-cyan-950 font-black bg-cyan-100 border border-cyan-400 px-2.5 py-0.5">
                  {telemetry.airDensity} kg/m³
                </span>
              </div>
            </div>

            {/* Card 3: Grid Demand (kW) */}
            <div className="bg-white border-2 border-slate-200 p-6 shadow-xs hover:border-rose-500 hover:shadow-md transition-all duration-300 relative group overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 group-hover:scale-110 transition-transform">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                      Grid Demand
                    </h3>
                    <span className="text-xs font-mono text-slate-500 font-semibold">CAMPUS BUS FEEDER</span>
                  </div>
                </div>

                <div className="px-2.5 py-1 bg-rose-100 border border-rose-400 text-xs font-mono font-black text-rose-900">
                  {statusMode === "ARBITRAGE" ? "TOD PEAK (₹9.80)" : "BASE TARIFF"}
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className={`text-4xl sm:text-5xl font-mono font-black text-slate-900 tracking-tight tabular-nums transition-colors ${lastTickUpdated ? "text-rose-700" : ""}`}>
                  {telemetry.gridDemandKw.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="font-mono text-base text-rose-700 font-black">kW</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs sm:text-sm font-mono text-slate-700">
                <div>
                  <span className="text-slate-500 font-semibold">Base Load: </span>
                  <span className="text-slate-900 font-bold">{(1420 * nodeMultiplier).toFixed(0)} kW</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-semibold">Peak Delta: </span>
                  <span className="text-rose-700 font-black">+{(telemetry.gridDemandKw - 1420 * nodeMultiplier).toFixed(0)} kW</span>
                </div>
              </div>
            </div>

            {/* Card 4: BESS State of Charge (%) + Visual Battery Gauge */}
            <div className="bg-white border-2 border-slate-200 p-6 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all duration-300 relative group overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-700 group-hover:scale-110 transition-transform">
                    <BatteryCharging className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                      BESS State of Charge
                    </h3>
                    <span className="text-xs font-mono text-slate-500 font-semibold">12.0 MWh / LFP POOL</span>
                  </div>
                </div>

                <div className="text-xs sm:text-sm font-mono font-black text-emerald-900 bg-emerald-50 border border-emerald-400 px-2 py-0.5">
                  +{(telemetry.bessPowerKw * nodeMultiplier).toFixed(0)} kW
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tracking-tight tabular-nums">
                    {telemetry.bessSoc.toFixed(1)}
                  </span>
                  <span className="font-mono text-base text-emerald-700 font-black">%</span>
                </div>
                <span className="text-xs sm:text-sm font-mono text-slate-500 font-bold">
                  DISCHARGING
                </span>
              </div>

              {/* 12-Segment Visual Battery Fill Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 w-full bg-slate-100 p-1.5 border border-slate-200">
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const segmentThreshold = (idx + 1) * (100 / 12);
                    const isFilled = telemetry.bessSoc >= segmentThreshold;
                    return (
                      <div
                        key={idx}
                        className={`h-3 flex-1 transition-all duration-500 ${
                          isFilled
                            ? "bg-emerald-600 shadow-sm"
                            : "bg-slate-200"
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between items-center mt-2 text-xs font-mono text-slate-600 font-semibold">
                  <span>0% MIN</span>
                  <span className="text-emerald-800 font-black">{((12.0 * nodeMultiplier) * (telemetry.bessSoc / 100)).toFixed(2)} MWh AVAIL</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

          </section>

          {/* =============================================================== */}
          {/* B. CHART 1: MASTER 24-HOUR DISPATCH MATRIX (LARGE FONTS + AXIS) */}
          {/* =============================================================== */}
          <section className="bg-white border-2 border-slate-200 p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-5 border-b border-slate-200 gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="h-5 w-5 text-cyan-700" />
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
                    24-Hour Master Dispatch & Renewable Generation Matrix [{selectedNode}]
                  </h2>
                </div>
                <p className="text-xs sm:text-sm font-mono text-slate-500 mt-1 font-medium">
                  1-HOUR SCADA DISPATCH RESOLUTION • TOTAL RENEWABLE GENERATION VS CAMPUS DEMAND
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 font-mono text-xs sm:text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 bg-cyan-600" />
                  <span className="text-cyan-950 font-bold">Total Renewable (Area)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-4 bg-rose-600" />
                  <span className="text-rose-950 font-bold">Campus Demand (Step)</span>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-400 px-3 py-1 shadow-xs">
                  <span className="h-3 w-3 bg-amber-500" />
                  <span className="text-amber-950 font-black">TOD PEAK TARIFF [18:00 - 22:00] (₹9.80/kWh)</span>
                </div>
              </div>
            </div>

            {/* Master ComposedChart Canvas */}
            <div className="w-full h-[400px] font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastData} margin={{ top: 15, right: 25, left: 5, bottom: 10 }}>
                  <defs>
                    <linearGradient id={`renewableGrad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.45} />
                      <stop offset="60%" stopColor="#0891b2" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={true} horizontal={true} />

                  <XAxis dataKey="time" stroke="#475569" tick={{ fill: "#0f172a", fontSize: 12, fontFamily: "monospace", fontWeight: 600 }} />
                  <YAxis stroke="#475569" tick={{ fill: "#0f172a", fontSize: 12, fontFamily: "monospace", fontWeight: 600 }} tickFormatter={(val) => `${val} kW`} />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as MasterTelemetryPoint;
                        const net = data.totalRenewable - data.gridDemandKw;
                        return (
                          <div className="bg-white border-2 border-slate-300 p-4 shadow-2xl font-mono text-sm text-slate-800 min-w-[280px]">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-sm font-black">
                              <span>TIMEFRAME: {label}</span>
                              {data.isPeakTariff && (
                                <span className="bg-amber-200 text-amber-950 px-2 py-0.5 text-xs font-black">
                                  TOD PEAK
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between"><span className="text-amber-700 font-semibold">Solar Gen:</span> <span className="font-bold">{data.solarKw} kW</span></div>
                              <div className="flex justify-between"><span className="text-cyan-700 font-semibold">Wind Gen:</span> <span className="font-bold">{data.windKw} kW</span></div>
                              <div className="flex justify-between pt-1 border-t border-slate-100"><span className="text-cyan-950 font-black">Total Renewable:</span> <span className="font-black text-cyan-950">{data.totalRenewable} kW</span></div>
                              <div className="flex justify-between"><span className="text-rose-700 font-semibold">Campus Demand:</span> <span className="font-bold">{data.gridDemandKw} kW</span></div>
                              <div className="flex justify-between"><span className="text-emerald-700 font-semibold">BESS Power:</span> <span className="font-bold">{data.bessPowerKw > 0 ? `+${data.bessPowerKw}` : data.bessPowerKw} kW</span></div>
                              <div className="flex justify-between pt-1 border-t border-slate-100 font-black"><span className="text-slate-600">Net Balance:</span> <span className={net >= 0 ? "text-emerald-700" : "text-rose-700"}>{net >= 0 ? `+${net}` : net} kW</span></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* 18:00 - 22:00 TOD Peak Tariff Window Overlay */}
                  <ReferenceArea x1="18:00" x2="22:00" fill="#fef3c7" fillOpacity={0.65} stroke="#f59e0b" strokeDasharray="4 4" />

                  {/* T-NOW Reference Line Marker */}
                  <ReferenceLine x="18:00" stroke="#0891b2" strokeDasharray="3 3" label={{ value: "T-NOW [18:04]", position: "top", fill: "#0891b2", fontSize: 12, fontFamily: "monospace", fontWeight: 700 }} />

                  {/* Total Renewable Generation Area */}
                  <Area type="monotone" dataKey="totalRenewable" stroke="#0891b2" strokeWidth={3} fillOpacity={1} fill={`url(#renewableGrad-${gradientId})`} name="Total Renewable" isAnimationActive={true} animationDuration={1200} />

                  {/* Campus Grid Demand Step Line */}
                  <Line type="stepAfter" dataKey="gridDemandKw" stroke="#e11d48" strokeWidth={3} dot={false} name="Campus Demand" isAnimationActive={true} animationDuration={1200} activeDot={{ r: 6, stroke: "#e11d48", fill: "#ffffff", strokeWidth: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* =============================================================== */}
          {/* C. DUAL CHART GRID (FREQUENCY/VOLTAGE & BESS DYNAMICS)          */}
          {/* =============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CHART 2: Grid Frequency & Bus Voltage Dynamics */}
            <section className="bg-white border-2 border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Gauge className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    Grid Frequency & Bus Voltage Dynamics (24H)
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 px-2.5 py-1">
                  IEEE 519 NOMINAL
                </span>
              </div>

              <div className="w-full h-[280px] font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#475569" tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 600 }} />
                    <YAxis yAxisId="freq" domain={[49.9, 50.1]} stroke="#059669" tick={{ fill: "#059669", fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${v.toFixed(2)}Hz`} />
                    <YAxis yAxisId="volt" orientation="right" domain={[10.9, 11.1]} stroke="#6366f1" tick={{ fill: "#6366f1", fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${v.toFixed(2)}kV`} />
                    
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload as MasterTelemetryPoint;
                          return (
                            <div className="bg-white border-2 border-slate-300 p-3 shadow-xl font-mono text-xs font-bold">
                              <div className="border-b pb-1 mb-1">{label}</div>
                              <div className="text-emerald-700">Frequency: {d.gridFrequencyHz} Hz</div>
                              <div className="text-indigo-700">Voltage: {d.gridVoltageKv} kV</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    <ReferenceLine yAxisId="freq" y={50.0} stroke="#94a3b8" strokeDasharray="2 2" />
                    <Line yAxisId="freq" type="monotone" dataKey="gridFrequencyHz" stroke="#059669" strokeWidth={2.5} dot={false} name="Grid Frequency (Hz)" isAnimationActive={true} />
                    <Line yAxisId="volt" type="monotone" dataKey="gridVoltageKv" stroke="#6366f1" strokeWidth={2.5} dot={false} strokeDasharray="3 3" name="Bus Voltage (kV)" isAnimationActive={true} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-3 text-xs sm:text-sm font-mono text-center">
                <div><span className="text-slate-500 font-semibold">Nominal:</span> <span className="font-black text-slate-900">50.00 Hz</span></div>
                <div><span className="text-slate-500 font-semibold">RoCoF:</span> <span className="font-black text-emerald-700">0.004 Hz/s</span></div>
                <div><span className="text-slate-500 font-semibold">THD:</span> <span className="font-black text-cyan-900">1.82%</span></div>
              </div>
            </section>

            {/* CHART 3: BESS Energy Dynamics & Charge Flow */}
            <section className="bg-white border-2 border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <BatteryCharging className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    BESS Energy Dynamics & Charge Flow (24H)
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2.5 py-1">
                  12.0 MWh LFP POOL
                </span>
              </div>

              <div className="w-full h-[280px] font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#475569" tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 600 }} />
                    <YAxis yAxisId="soc" domain={[0, 100]} stroke="#059669" tick={{ fill: "#059669", fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="pwr" orientation="right" domain={[-600, 600]} stroke="#0891b2" tick={{ fill: "#0891b2", fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${v}kW`} />
                    
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload as MasterTelemetryPoint;
                          return (
                            <div className="bg-white border-2 border-slate-300 p-3 shadow-xl font-mono text-xs font-bold">
                              <div className="border-b pb-1 mb-1">{label}</div>
                              <div className="text-emerald-700">SoC: {d.bessSoc}%</div>
                              <div className="text-cyan-700">Power: {d.bessPowerKw > 0 ? `+${d.bessPowerKw} kW` : `${d.bessPowerKw} kW`}</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    <Bar yAxisId="pwr" dataKey="bessPowerKw" fill="#0891b2" fillOpacity={0.65} name="BESS Power (kW)" isAnimationActive={true} />
                    <Line yAxisId="soc" type="monotone" dataKey="bessSoc" stroke="#059669" strokeWidth={3} dot={false} name="State of Charge (%)" isAnimationActive={true} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-3 text-xs sm:text-sm font-mono text-center">
                <div><span className="text-slate-500 font-semibold">SoC Now:</span> <span className="font-black text-emerald-700">{telemetry.bessSoc}%</span></div>
                <div><span className="text-slate-500 font-semibold">Health:</span> <span className="font-black text-slate-900">99.4% SOH</span></div>
                <div><span className="text-slate-500 font-semibold">Temp:</span> <span className="font-black text-slate-900">24.8°C</span></div>
              </div>
            </section>

          </div>

          {/* =============================================================== */}
          {/* D. DUAL CHART GRID (METEOROLOGY & CARBON/ECONOMICS)             */}
          {/* =============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CHART 4: CIPM-2007 Meteorology */}
            <section className="bg-white border-2 border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <CloudSun className="h-5 w-5 text-amber-700" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    CIPM-2007 Meteorology & Resource Correlation
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold text-amber-950 bg-amber-50 border border-amber-300 px-2.5 py-1">
                  ρ = 1.1842 kg/m³
                </span>
              </div>

              <div className="w-full h-[280px] font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#475569" tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 600 }} />
                    <YAxis yAxisId="ghi" domain={[0, 1100]} stroke="#d97706" tick={{ fill: "#d97706", fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${v}W`} />
                    <YAxis yAxisId="wind" orientation="right" domain={[0, 12]} stroke="#0891b2" tick={{ fill: "#0891b2", fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${v}m/s`} />
                    
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload as MasterTelemetryPoint;
                          return (
                            <div className="bg-white border-2 border-slate-300 p-3 shadow-xl font-mono text-xs font-bold">
                              <div className="border-b pb-1 mb-1">{label}</div>
                              <div className="text-amber-700">Solar GHI: {d.solarGhi} W/m²</div>
                              <div className="text-cyan-700">Wind Velocity: {d.windSpeed} m/s</div>
                              <div className="text-slate-700">Moist Air Density: {d.airDensity} kg/m³</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    <Area yAxisId="ghi" type="monotone" dataKey="solarGhi" fill="#fef3c7" stroke="#d97706" strokeWidth={2.5} name="Solar GHI (W/m²)" isAnimationActive={true} />
                    <Line yAxisId="wind" type="monotone" dataKey="windSpeed" stroke="#0891b2" strokeWidth={2.5} dot={false} name="Wind Speed (m/s)" isAnimationActive={true} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-4 gap-2 text-xs sm:text-sm font-mono text-center font-semibold">
                <div><span className="text-slate-500">P:</span> <span className="font-bold text-slate-900">1013.2 hPa</span></div>
                <div><span className="text-slate-500">Pv:</span> <span className="font-bold text-slate-900">2.14 kPa</span></div>
                <div><span className="text-slate-500">RH:</span> <span className="font-bold text-slate-900">58.2%</span></div>
                <div><span className="text-slate-500">Temp:</span> <span className="font-bold text-slate-900">28.4°C</span></div>
              </div>
            </section>

            {/* CHART 5: Economic Yield & Avoided Carbon Flux */}
            <section className="bg-white border-2 border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <DollarSign className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    CEA Carbon Avoidance & Peak Arbitrage Yield
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-950 bg-emerald-50 border border-emerald-300 px-2.5 py-1">
                  0.81 tCO2/MWh
                </span>
              </div>

              <div className="w-full h-[280px] font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#475569" tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 600 }} />
                    <YAxis yAxisId="co2" domain={[0, 2000]} stroke="#059669" tick={{ fill: "#059669", fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${v}kg`} />
                    <YAxis yAxisId="inr" orientation="right" domain={[0, 6000]} stroke="#d97706" tick={{ fill: "#d97706", fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `₹${v}`} />
                    
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload as MasterTelemetryPoint;
                          return (
                            <div className="bg-white border-2 border-slate-300 p-3 shadow-xl font-mono text-xs font-bold">
                              <div className="border-b pb-1 mb-1">{label}</div>
                              <div className="text-emerald-700">Avoided Carbon: {d.avoidedCo2KgHr} kg/hr</div>
                              <div className="text-amber-700">Arbitrage Yield: ₹{d.hourlySavingsInr}/hr</div>
                              <div className="text-slate-600">Tariff Rate: ₹{d.tariffCostInr}/kWh</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    <Bar yAxisId="inr" dataKey="hourlySavingsInr" fill="#f59e0b" fillOpacity={0.65} name="Hourly Savings (₹)" isAnimationActive={true} />
                    <Line yAxisId="co2" type="monotone" dataKey="avoidedCo2KgHr" stroke="#059669" strokeWidth={3} dot={false} name="Avoided CO2 (kg/hr)" isAnimationActive={true} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-3 text-xs sm:text-sm font-mono text-center">
                <div><span className="text-slate-500 font-semibold">TOD Rate:</span> <span className="font-black text-amber-700">₹9.80 / kWh</span></div>
                <div><span className="text-slate-500 font-semibold">Base Rate:</span> <span className="font-black text-slate-900">₹5.20 / kWh</span></div>
                <div><span className="text-slate-500 font-semibold">24H CO2:</span> <span className="font-black text-emerald-700">14.28 tCO2</span></div>
              </div>
            </section>

          </div>

          {/* =============================================================== */}
          {/* E. HARMONIC SPECTRUM & HIGH-CONTRAST SCADA TERMINAL             */}
          {/* =============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CHART 6: IEEE 519 Harmonics */}
            <section className="lg:col-span-1 bg-white border-2 border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Activity className="h-5 w-5 text-cyan-700" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    IEEE 519 Harmonic Spectrum
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold text-cyan-900 bg-cyan-50 border border-cyan-300 px-2.5 py-1">
                  THDv = 1.82%
                </span>
              </div>

              <div className="w-full h-[220px] font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={HARMONICS_DATA.slice(1)} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="order" stroke="#475569" tick={{ fill: "#0f172a", fontSize: 10, fontWeight: 700 }} />
                    <YAxis domain={[0, 4]} stroke="#475569" tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white border-2 border-slate-300 p-2.5 shadow-md font-mono text-xs font-bold">
                              <div>{label}</div>
                              <div className="text-cyan-700">Voltage THD: {d.voltageThd}%</div>
                              <div className="text-rose-700">Current THD: {d.currentThd}%</div>
                              <div className="text-slate-500">IEEE Limit: {d.limit}%</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="voltageThd" fill="#0891b2" name="Voltage THD (%)" isAnimationActive={true} />
                    <Bar dataKey="currentThd" fill="#f43f5e" name="Current THD (%)" isAnimationActive={true} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-mono text-slate-700">
                <span>Phase Angle: <b className="text-slate-900">0.004 rad</b></span>
                <span>Power Factor: <b className="text-emerald-700 font-bold">0.984 lag</b></span>
              </div>
            </section>

            {/* Interactive SCADA Edge Terminal (Large Fonts + Active Prompts) */}
            <section className="lg:col-span-2 bg-slate-900 border-2 border-slate-700 p-5 shadow-lg flex flex-col h-[330px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700 shrink-0">
                <div className="flex items-center gap-2.5">
                  <TerminalIcon className="h-5 w-5 text-emerald-400" />
                  <span className="font-mono text-sm text-slate-100 font-black uppercase tracking-wider">
                    EDGE INTERPOLATION TERMINAL & CLI
                  </span>
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping ml-1" />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {(["ALL", "WARNING", "MATH", "AUDIT"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLogFilter(lvl)}
                      className={`px-2.5 py-1 border transition-colors cursor-pointer ${
                        logFilter === lvl
                          ? "bg-slate-700 border-cyan-400 text-cyan-300 font-bold"
                          : "border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setLogs([])}
                    className="hover:text-slate-200 uppercase px-2.5 py-1 border border-slate-700 text-slate-400 font-bold ml-2 cursor-pointer"
                  >
                    CLEAR
                  </button>
                </div>
              </div>

              {/* Live Log Stream */}
              <div className="flex-1 overflow-y-auto font-mono text-xs sm:text-sm leading-relaxed space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-700 text-slate-200">
                {filteredLogs.map((log) => {
                  let badgeColor = "text-emerald-400";
                  if (log.level === "WARNING") badgeColor = "text-amber-400 font-black";
                  if (log.level === "CRITICAL") badgeColor = "text-rose-400 font-black";
                  if (log.level === "MATH") badgeColor = "text-cyan-300 font-bold";
                  if (log.level === "AUDIT") badgeColor = "text-amber-300 font-bold";
                  if (log.level === "SYS") badgeColor = "text-slate-400";

                  return (
                    <div key={log.id} className="flex items-start gap-2.5 hover:bg-slate-800/60 px-2 py-1 transition-colors">
                      <span className="text-slate-500 shrink-0 font-semibold">[{log.timestamp}]</span>
                      <span className={`shrink-0 ${badgeColor}`}>{log.level}:</span>
                      <span className="text-slate-200 break-all">{log.message}</span>
                    </div>
                  );
                })}
                <div ref={terminalEndRef} />
              </div>

              {/* Command Line Input */}
              <form onSubmit={handleTerminalSubmit} className="pt-3 mt-2 border-t border-slate-800 flex items-center gap-2.5 text-sm font-mono text-slate-400 shrink-0">
                <span className="text-cyan-400 font-bold shrink-0">vpp-scada@{selectedNode.toLowerCase()}:~$</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="type 'help', 'status', 'export-cea', 'patch', 'calibrate'..."
                  className="flex-1 bg-transparent text-slate-100 focus:outline-none font-mono font-medium placeholder:text-slate-600 text-sm"
                />
                <span className="text-slate-500 text-xs shrink-0 font-bold">IST: {telemetry.currentTimeString}</span>
              </form>
            </section>

          </div>

        </main>
      </div>
    </div>
  );
}
