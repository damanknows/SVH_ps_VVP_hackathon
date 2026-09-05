import { useState, useEffect, useCallback } from 'react';
import { TelemetryPoint, DispatchAction, ScenarioId, AggregateMetrics } from '../types/energy';
import {
  getScenarioCurrentPoint,
  getScenarioTelemetryTimeSeries,
  getScenarioDispatchActions,
  getScenarioAggregateMetrics,
  fetchLiveBackendData
} from '../services/apiService';

export interface UseLiveTelemetryReturn {
  scenario: ScenarioId;
  setScenario: (scenario: ScenarioId) => void;
  cycleScenario: () => void;
  isLiveBackend: boolean;
  telemetrySourceLabel: string;
  currentTelemetry: TelemetryPoint;
  telemetrySeries: TelemetryPoint[];
  dispatchActions: DispatchAction[];
  aggregateMetrics: AggregateMetrics;
  autoPilot: boolean;
  toggleAutoPilot: () => void;
  approveAction: (id: string) => void;
  autoPlayDemo: boolean;
  toggleAutoPlayDemo: () => void;
}

export function useLiveTelemetry(): UseLiveTelemetryReturn {
  const [scenario, setScenarioState] = useState<ScenarioId>('SUNNY_NOON');
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [autoPilot, setAutoPilot] = useState<boolean>(false);
  const [autoPlayDemo, setAutoPlayDemo] = useState<boolean>(false);

  // Local state initialized with deterministic scenario state
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryPoint>(
    getScenarioCurrentPoint('SUNNY_NOON')
  );
  const [telemetrySeries, setTelemetrySeries] = useState<TelemetryPoint[]>(
    getScenarioTelemetryTimeSeries('SUNNY_NOON')
  );
  const [dispatchActions, setDispatchActions] = useState<DispatchAction[]>(
    getScenarioDispatchActions('SUNNY_NOON')
  );
  const [aggregateMetrics, setAggregateMetrics] = useState<AggregateMetrics>(
    getScenarioAggregateMetrics('SUNNY_NOON')
  );

  // Update scenario state deterministically
  const setScenario = useCallback((newScenario: ScenarioId) => {
    setScenarioState(newScenario);
    setCurrentTelemetry(getScenarioCurrentPoint(newScenario));
    setTelemetrySeries(getScenarioTelemetryTimeSeries(newScenario));
    setDispatchActions(getScenarioDispatchActions(newScenario));
    setAggregateMetrics(getScenarioAggregateMetrics(newScenario));
  }, []);

  // Cycle scenario state
  const cycleScenario = useCallback(() => {
    setScenarioState(prev => {
      let next: ScenarioId = 'SUNNY_NOON';
      if (prev === 'SUNNY_NOON') next = 'CLOUD_BURST';
      else if (prev === 'CLOUD_BURST') next = 'EVENING_PEAK';
      else next = 'SUNNY_NOON';

      setCurrentTelemetry(getScenarioCurrentPoint(next));
      setTelemetrySeries(getScenarioTelemetryTimeSeries(next));
      setDispatchActions(getScenarioDispatchActions(next));
      setAggregateMetrics(getScenarioAggregateMetrics(next));
      return next;
    });
  }, []);

  const toggleAutoPlayDemo = useCallback(() => {
    setAutoPlayDemo(prev => !prev);
  }, []);

  // Action verification trigger
  const approveAction = useCallback((id: string) => {
    setDispatchActions(prev =>
      prev.map(act =>
        act.id === id ? { ...act, status: 'Applied (Operator Verified)' } : act
      )
    );
  }, []);

  const toggleAutoPilot = useCallback(() => {
    setAutoPilot(prev => {
      const nextMode = !prev;
      if (nextMode) {
        setDispatchActions(acts =>
          acts.map(a =>
            a.status === 'Pending Verification'
              ? { ...a, status: 'Applied Automatically' }
              : a
          )
        );
      }
      return nextMode;
    });
  }, []);

  // Polling mechanism at 2500ms
  useEffect(() => {
    let isMounted = true;

    const pollBackend = async () => {
      const res = await fetchLiveBackendData();
      if (!isMounted) return;

      if (res.live && res.telemetry && res.actions && res.metrics) {
        setIsLiveBackend(true);
        setCurrentTelemetry(res.telemetry);
        setDispatchActions(res.actions);
        setAggregateMetrics(res.metrics);
      } else {
        setIsLiveBackend(false);
      }
    };

    pollBackend();
    const intervalId = setInterval(pollBackend, 2500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Auto-Play Demo Mode: advances scenario every 6000ms (6s)
  useEffect(() => {
    if (!autoPlayDemo) return;

    const intervalId = setInterval(() => {
      cycleScenario();
    }, 6000);

    return () => clearInterval(intervalId);
  }, [autoPlayDemo, cycleScenario]);

  // Global Keyboard listeners: Shift + S, Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        cycleScenario();
      } else if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        toggleAutoPlayDemo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleScenario, toggleAutoPlayDemo]);

  const telemetrySourceLabel = isLiveBackend
    ? 'Telemetry Source: Live Modbus Link'
    : 'Telemetry Source: Autonomous Synthetic Engine';

  return {
    scenario,
    setScenario,
    cycleScenario,
    isLiveBackend,
    telemetrySourceLabel,
    currentTelemetry,
    telemetrySeries,
    dispatchActions,
    aggregateMetrics,
    autoPilot,
    toggleAutoPilot,
    approveAction,
    autoPlayDemo,
    toggleAutoPlayDemo
  };
}
