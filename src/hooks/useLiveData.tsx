'use client';

import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef, type ReactNode } from 'react';
import { WSMessageSchema, TelemetrySchema, ActionPlanSchema } from '@/lib/validations';
import { Telemetry, ActionPlan, ActionItem, Campus } from '@/types';
import { mockTelemetry, mockActions, demoScenarios, CAMPUSES, getTelemetryForCampus } from '@/lib/mockData';
import backendConfig from '@/config/backend.json';

export interface AlertItem {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export interface LiveState {
  telemetry: Telemetry;
  actionPlan: ActionPlan;
  alerts: AlertItem[];
  connected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  reconnectDelaySec: number;
  isStandalone: boolean;
  latencyMs: number;
  activeScenario: string;
  activeCampusId: string;
  activeCampus: Campus;
}

type LiveAction =
  | { type: 'SET_TELEMETRY'; payload: Telemetry }
  | { type: 'SET_ACTION_PLAN'; payload: ActionPlan }
  | { type: 'ADD_ALERT'; payload: AlertItem }
  | { type: 'SET_CONNECTED'; payload: { connected: boolean; isStandalone: boolean } }
  | { type: 'SET_RECONNECTING'; payload: { isReconnecting: boolean; attempt: number; delaySec: number } }
  | { type: 'SET_LATENCY'; payload: number }
  | { type: 'SET_SCENARIO'; payload: string }
  | { type: 'SET_CAMPUS'; payload: string };

function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case 'SET_TELEMETRY':
      return { ...state, telemetry: action.payload };

    case 'SET_ACTION_PLAN':
      return { ...state, actionPlan: action.payload };

    case 'ADD_ALERT':
      return { ...state, alerts: [action.payload, ...state.alerts].slice(0, 15) };

    case 'SET_CONNECTED':
      return {
        ...state,
        connected: action.payload.connected,
        isStandalone: action.payload.isStandalone,
        isReconnecting: !action.payload.connected,
      };

    case 'SET_RECONNECTING':
      return {
        ...state,
        isReconnecting: action.payload.isReconnecting,
        reconnectAttempt: action.payload.attempt,
        reconnectDelaySec: action.payload.delaySec,
      };

    case 'SET_LATENCY':
      return { ...state, latencyMs: action.payload };

    case 'SET_SCENARIO': {
      const scenarioData = demoScenarios[action.payload];
      if (!scenarioData) return state;
      return {
        ...state,
        activeScenario: action.payload,
        telemetry: { ...scenarioData, timestamp: new Date().toISOString() },
        alerts: [
          {
            id: Math.random().toString(36).substring(2, 9),
            level: 'info' as const,
            message: `Switched demo scenario to '${action.payload}'`,
            timestamp: new Date().toISOString(),
          },
          ...state.alerts,
        ].slice(0, 15),
      };
    }

    case 'SET_CAMPUS': {
      const campus = CAMPUSES.find((c) => c.id === action.payload) ?? CAMPUSES[0];
      const newTelemetry = getTelemetryForCampus(campus.id);
      return {
        ...state,
        activeCampusId: campus.id,
        activeCampus: campus,
        telemetry: newTelemetry,
        activeScenario: 'default',
        alerts: [
          {
            id: Math.random().toString(36).substring(2, 9),
            level: 'info' as const,
            message: `Campus switched to ${campus.name} (${campus.campusCode})`,
            timestamp: new Date().toISOString(),
          },
          ...state.alerts,
        ].slice(0, 15),
      };
    }

    default:
      return state;
  }
}

export interface LiveDataContextType extends LiveState {
  setScenario: (scenarioKey: string) => void;
  setCampus: (campusId: string) => void;
  triggerManualAction: (action: ActionItem) => void;
  reconnectNow: () => void;
}

const LiveDataContext = createContext<LiveDataContextType | null>(null);

const initialActionPlan: ActionPlan = {
  generatedAt: new Date().toISOString(),
  actions: mockActions,
};

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(liveReducer, {
    telemetry: mockTelemetry,
    actionPlan: initialActionPlan,
    alerts: [
      {
        id: 'init-1',
        level: 'info',
        message: 'VPP Command Bridge telemetry pipeline active.',
        timestamp: new Date().toISOString(),
      },
    ],
    connected: false,
    isReconnecting: true,
    reconnectAttempt: 1,
    reconnectDelaySec: 1,
    isStandalone: true,
    latencyMs: 14,
    activeScenario: 'default',
    activeCampusId: CAMPUSES[0].id,
    activeCampus: CAMPUSES[0],
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryMsRef = useRef<number>(1000);
  const attemptCountRef = useRef<number>(0);
  const isUnmountedRef = useRef<boolean>(false);
  const connectRef = useRef<() => void>(() => {});
  const telemetryRef = useRef<Telemetry>(state.telemetry);
  telemetryRef.current = state.telemetry;

  // Fallback simulator to keep UI alive with realistic data if backend WS is offline
  const startFallbackSimulator = useCallback(() => {
    if (fallbackIntervalRef.current) return;

    fallbackIntervalRef.current = setInterval(() => {
      const t0 = performance.now();
      const cur = telemetryRef.current;
      
      const socDelta = (Math.random() - 0.48) * 0.4;
      const currentSoc = cur.socPct;
      const newSoc = Math.min(100, Math.max(10, +(currentSoc + socDelta).toFixed(1)));

      const solarVal = Math.round(Math.max(0, cur.flowsKw.solar + (Math.random() - 0.5) * 12));
      const windVal = Math.round(Math.max(0, cur.flowsKw.wind + (Math.random() - 0.5) * 6));
      const loadVal = Math.round(Math.max(120, cur.flowsKw.load + (Math.random() - 0.5) * 8));
      const exportVal = Math.max(0, (solarVal + windVal) - loadVal);

      const updatedTelemetry: Telemetry = {
        ...cur,
        timestamp: new Date().toISOString(),
        socPct: newSoc,
        flowsKw: {
          ...cur.flowsKw,
          solar: solarVal,
          wind: windVal,
          load: loadVal,
          critical_load: Math.round(loadVal * 0.38),
          export: exportVal,
        },
        savingsPerHour: Math.round(cur.savingsPerHour + (Math.random() - 0.5) * 30),
        activeGenKw: solarVal + windVal,
        totalGenKw: cur.totalGenKw || 457,
      };

      dispatch({ type: 'SET_TELEMETRY', payload: updatedTelemetry });
      const elapsed = +(performance.now() - t0).toFixed(1);
      dispatch({ type: 'SET_LATENCY', payload: Math.max(6, Math.min(35, elapsed)) });
    }, 3000);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    let wsUrl: string;
    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      const proto = isHttps ? 'wss:' : 'ws:';

      if (process.env.NEXT_PUBLIC_WS_URL) {
        wsUrl = process.env.NEXT_PUBLIC_WS_URL;
        if (isHttps && wsUrl.startsWith('ws://')) {
          wsUrl = wsUrl.replace(/^ws:\/\//, 'wss://');
        }
      } else {
        // Automatically route through current origin's gateway over wss: (or ws: on local dev)
        wsUrl = `${proto}//${window.location.host}/ws/live`;
      }
    } else {
      wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/live';
    }

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) return;
        console.info('[VPP WebSocket] Connected successfully to:', wsUrl);
        
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }

        retryMsRef.current = 1000;
        attemptCountRef.current = 0;

        dispatch({ type: 'SET_CONNECTED', payload: { connected: true, isStandalone: false } });
        dispatch({
          type: 'SET_RECONNECTING',
          payload: { isReconnecting: false, attempt: 0, delaySec: 0 },
        });
        dispatch({
          type: 'ADD_ALERT',
          payload: {
            id: Math.random().toString(36).substring(2, 9),
            level: 'info',
            message: `Connected to live VPP telemetry stream (${wsUrl}).`,
            timestamp: new Date().toISOString(),
          },
        });
      };

      ws.onmessage = (event) => {
        const t0 = performance.now();
        try {
          const rawData = JSON.parse(event.data);

          // 1. Try validating as standard WSMessage schema
          const parsedMsg = WSMessageSchema.safeParse(rawData);
          if (parsedMsg.success) {
            const msg = parsedMsg.data;
            if (msg.type === 'telemetry') {
              dispatch({ type: 'SET_TELEMETRY', payload: msg.payload });
            } else if (msg.type === 'action_plan') {
              dispatch({ type: 'SET_ACTION_PLAN', payload: msg.payload });
            } else if (msg.type === 'alert') {
              dispatch({
                type: 'ADD_ALERT',
                payload: {
                  id: Math.random().toString(36).substring(2, 9),
                  level: msg.payload.level,
                  message: msg.payload.message,
                  timestamp: new Date().toISOString(),
                },
              });
            }
          } else {
            // 2. Direct TelemetrySchema payload fallback
            const directTelemetry = TelemetrySchema.safeParse(rawData);
            if (directTelemetry.success) {
              dispatch({ type: 'SET_TELEMETRY', payload: directTelemetry.data });
            } else {
              // 3. Direct ActionPlanSchema fallback
              const directActionPlan = ActionPlanSchema.safeParse(rawData);
              if (directActionPlan.success) {
                dispatch({ type: 'SET_ACTION_PLAN', payload: directActionPlan.data });
              } else {
                console.warn('[VPP WebSocket] Unrecognized payload schema:', rawData);
              }
            }
          }

          // Latency performance monitoring (<200ms)
          const latency = +(performance.now() - t0).toFixed(2);
          if (latency > 200) {
            console.warn(`[VPP Performance Warning] WS dispatch latency high: ${latency}ms (>200ms target)`);
          } else {
            console.debug(`[VPP Performance] WS message parsed & dispatched in ${latency}ms`);
          }
          dispatch({ type: 'SET_LATENCY', payload: Math.max(1, latency) });
        } catch (err) {
          console.error('[VPP WebSocket] JSON parse error:', err);
        }
      };

      ws.onerror = () => {
        if (isUnmountedRef.current) return;
        startFallbackSimulator();
      };

      ws.onclose = () => {
        if (isUnmountedRef.current) return;
        socketRef.current = null;

        attemptCountRef.current += 1;
        const currentRetryMs = retryMsRef.current;
        const delaySec = Math.round(currentRetryMs / 1000);

        dispatch({ type: 'SET_CONNECTED', payload: { connected: false, isStandalone: true } });
        dispatch({
          type: 'SET_RECONNECTING',
          payload: { isReconnecting: true, attempt: attemptCountRef.current, delaySec },
        });

        startFallbackSimulator();

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s... capped at 30s
        retryMsRef.current = Math.min(currentRetryMs * 2, 30000);

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current();
        }, currentRetryMs);
      };
    } catch {
      startFallbackSimulator();
    }
  }, [startFallbackSimulator]);
  connectRef.current = connectWebSocket;

  const reconnectNow = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    retryMsRef.current = 1000;
    connectWebSocket();
  }, [connectWebSocket]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connectWebSocket();

    return () => {
      isUnmountedRef.current = true;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
    };
  }, [connectWebSocket]);

  const setScenario = useCallback((scenarioKey: string) => {
    dispatch({ type: 'SET_SCENARIO', payload: scenarioKey });
  }, []);

  const setCampus = useCallback((campusId: string) => {
    dispatch({ type: 'SET_CAMPUS', payload: campusId });
  }, []);

  const triggerManualAction = useCallback((action: ActionItem) => {
    dispatch({
      type: 'ADD_ALERT',
      payload: {
        id: Math.random().toString(36).substring(2, 9),
        level: action.priority === 'HIGH' ? 'critical' : 'info',
        message: `Action executed: ${action.title}`,
        timestamp: new Date().toISOString(),
      },
    });
  }, []);

  return (
    <LiveDataContext.Provider
      value={{
        ...state,
        setScenario,
        setCampus,
        triggerManualAction,
        reconnectNow,
      }}
    >
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData() {
  const ctx = useContext(LiveDataContext);
  if (!ctx) {
    throw new Error('useLiveData must be used inside a LiveDataProvider');
  }
  return ctx;
}
