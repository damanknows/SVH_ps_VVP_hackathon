'use client';

import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef, useState, type ReactNode } from 'react';
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
  resolvedWsUrl: string;
}

type LiveAction =
  | { type: 'SET_TELEMETRY'; payload: Telemetry }
  | { type: 'SET_ACTION_PLAN'; payload: ActionPlan }
  | { type: 'ADD_ALERT'; payload: AlertItem }
  | { type: 'SET_CONNECTED'; payload: { connected: boolean; isStandalone: boolean } }
  | { type: 'SET_RECONNECTING'; payload: { isReconnecting: boolean; attempt: number; delaySec: number } }
  | { type: 'SET_LATENCY'; payload: number }
  | { type: 'SET_SCENARIO'; payload: string }
  | { type: 'SET_CAMPUS'; payload: string }
  | { type: 'SET_WS_URL'; payload: string };

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

    case 'SET_WS_URL':
      return { ...state, resolvedWsUrl: action.payload };

    case 'SET_SCENARIO': {
      const scenarioKey = action.payload;
      const scenario = (demoScenarios as any)[scenarioKey];
      if (!scenario) return state;

      const newTelemetry: Telemetry = {
        ...state.telemetry,
        timestamp: new Date().toISOString(),
        socPct: scenario.socPct ?? state.telemetry.socPct,
        flowsKw: {
          ...state.telemetry.flowsKw,
          solar: scenario.solar ?? state.telemetry.flowsKw.solar,
          wind: scenario.wind ?? state.telemetry.flowsKw.wind,
          load: scenario.load ?? state.telemetry.flowsKw.load,
          critical_load: scenario.criticalLoad ?? state.telemetry.flowsKw.critical_load,
          export: scenario.export ?? state.telemetry.flowsKw.export,
          grid: scenario.grid ?? state.telemetry.flowsKw.grid,
        },
        gridStatus: scenario.gridStatus ?? state.telemetry.gridStatus,
        autonomyPct: scenario.autonomyPct ?? state.telemetry.autonomyPct,
        savingsPerHour: scenario.savingsPerHour ?? state.telemetry.savingsPerHour,
        activeGenKw: (scenario.solar ?? state.telemetry.flowsKw.solar) + (scenario.wind ?? state.telemetry.flowsKw.wind),
      };

      return {
        ...state,
        activeScenario: scenarioKey,
        telemetry: newTelemetry,
        alerts: [
          {
            id: Math.random().toString(36).substring(2, 9),
            level: 'info' as const,
            message: `Applied Scenario: ${scenario.name}`,
            timestamp: new Date().toISOString(),
          },
          ...state.alerts,
        ].slice(0, 15),
      };
    }

    case 'SET_CAMPUS': {
      const campusId = action.payload;
      const campus = CAMPUSES.find((c) => c.id === campusId);
      if (!campus) return state;

      const campusTelemetry = getTelemetryForCampus(campusId);
      return {
        ...state,
        activeCampusId: campusId,
        activeCampus: campus,
        telemetry: {
          ...state.telemetry,
          ...campusTelemetry,
          timestamp: new Date().toISOString(),
        },
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
  setCustomWsUrl: (url: string) => void;
}

const LiveDataContext = createContext<LiveDataContextType | null>(null);

const initialActionPlan: ActionPlan = {
  generatedAt: new Date().toISOString(),
  actions: mockActions,
};

// ── Smart Dynamic WebSocket URL Resolver with Mixed Content Protection ──────
function sanitizeAndUpgradeWsUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return '';

  // Auto-convert HTTP(S) URLs to WS(S)
  if (url.startsWith('https://')) {
    url = url.replace('https://', 'wss://');
  } else if (url.startsWith('http://')) {
    url = url.replace('http://', 'ws://');
  }

  // Ensure /ws/live endpoint path
  if (!url.includes('/ws/')) {
    url = url.replace(/\/+$/, '') + '/ws/live';
  }

  // Mixed Content Protection: If page is loaded over HTTPS, MUST use WSS
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (url.startsWith('ws://')) {
      console.warn('[VPP Security] Upgrading ws:// to wss:// to prevent browser mixed-content block:', url);
      url = url.replace('ws://', 'wss://');
    }
  }

  return url;
}

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
    resolvedWsUrl: '',
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryMsRef = useRef<number>(1000);
  const attemptCountRef = useRef<number>(0);
  const isUnmountedRef = useRef<boolean>(false);
  const [customWsUrl, setCustomWsUrlState] = useState<string>('');

  // Determine current active WebSocket URL
  const resolveCurrentWsUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'ws://localhost:8000/ws/live';

    // 1. URL search parameter override: ?ws=wss://xyz.trycloudflare.com
    const searchParams = new URLSearchParams(window.location.search);
    const queryWs = searchParams.get('ws');
    if (queryWs) {
      return sanitizeAndUpgradeWsUrl(queryWs);
    }

    // 2. User custom URL saved in localStorage / state
    const savedCustom = customWsUrl || localStorage.getItem('vpp_custom_ws_url');
    if (savedCustom) {
      return sanitizeAndUpgradeWsUrl(savedCustom);
    }

    // 3. Environment variable (if baked)
    if (process.env.NEXT_PUBLIC_WS_URL) {
      return sanitizeAndUpgradeWsUrl(process.env.NEXT_PUBLIC_WS_URL);
    }

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';

    if (isLocalhost && !isHttps) {
      return sanitizeAndUpgradeWsUrl(backendConfig.server.wsUrl || 'ws://localhost:8000/ws/live');
    }

    // 4. Public deployment default
    if (backendConfig.server.productionWsUrl) {
      return sanitizeAndUpgradeWsUrl(backendConfig.server.productionWsUrl);
    }

    // 5. Relative host upgrade
    const proto = isHttps ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/live`;
  }, [customWsUrl]);

  // Set custom WebSocket URL and reconnect immediately
  const setCustomWsUrl = useCallback((url: string) => {
    if (typeof window !== 'undefined') {
      if (url.trim()) {
        localStorage.setItem('vpp_custom_ws_url', url.trim());
      } else {
        localStorage.removeItem('vpp_custom_ws_url');
      }
    }
    setCustomWsUrlState(url);
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    retryMsRef.current = 1000;
    attemptCountRef.current = 0;
  }, []);

  // Fallback simulator to keep UI alive with realistic data if backend WS is offline
  const startFallbackSimulator = useCallback(() => {
    if (fallbackIntervalRef.current) return;

    fallbackIntervalRef.current = setInterval(() => {
      const t0 = performance.now();

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

    const wsUrl = resolveCurrentWsUrl();
    dispatch({ type: 'SET_WS_URL', payload: wsUrl });

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
          const raw = JSON.parse(event.data);
          const validated = WSMessageSchema.safeParse(raw);

          if (validated.success) {
            const msg = validated.data;
            if (msg.type === 'telemetry') {
              dispatch({ type: 'SET_TELEMETRY', payload: msg.payload });
            } else if (msg.type === 'action_plan') {
              dispatch({ type: 'SET_ACTION_PLAN', payload: msg.payload });
            } else if (msg.type === 'alert') {
              dispatch({
                type: 'ADD_ALERT',
                payload: {
                  id: Math.random().toString(36).substring(2, 9),
                  level: msg.payload.level || 'info',
                  message: msg.payload.message || 'System notification received.',
                  timestamp: new Date().toISOString(),
                },
              });
            }
          } else if (raw && raw.type) {
            // Flexible fallback for raw backend payload schemas
            const payloadData = raw.payload || raw.data;
            if (raw.type === 'telemetry' && payloadData) {
              dispatch({ type: 'SET_TELEMETRY', payload: payloadData });
            } else if (raw.type === 'action_plan' && payloadData) {
              dispatch({ type: 'SET_ACTION_PLAN', payload: payloadData });
            }
          }

          const elapsed = +(performance.now() - t0).toFixed(1);
          if (elapsed > 200) {
            console.warn(`[VPP Perf Alert] WS message parse took ${elapsed}ms (>200ms threshold)`);
          }
          dispatch({ type: 'SET_LATENCY', payload: elapsed });
        } catch (err) {
          console.error('[VPP WebSocket] Invalid JSON frame:', err);
        }
      };

      ws.onerror = () => {
        // Handled in onclose
      };

      ws.onclose = () => {
        if (isUnmountedRef.current) return;
        socketRef.current = null;
        dispatch({ type: 'SET_CONNECTED', payload: { connected: false, isStandalone: true } });

        startFallbackSimulator();

        attemptCountRef.current += 1;
        const delay = retryMsRef.current;
        const delaySec = Math.round(delay / 1000);

        dispatch({
          type: 'SET_RECONNECTING',
          payload: { isReconnecting: true, attempt: attemptCountRef.current, delaySec },
        });

        reconnectTimeoutRef.current = setTimeout(() => {
          retryMsRef.current = Math.min(retryMsRef.current * 2, 30000);
          connectWebSocket();
        }, delay);
      };
    } catch (e) {
      console.warn('[VPP WebSocket] Error creating connection:', e);
      startFallbackSimulator();
    }
  }, [resolveCurrentWsUrl, startFallbackSimulator]);

  const reconnectNow = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    retryMsRef.current = 1000;
    attemptCountRef.current = 0;
    connectWebSocket();
  }, [connectWebSocket]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connectWebSocket();

    return () => {
      isUnmountedRef.current = true;
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
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
        level: 'info',
        message: `Dispatched Directive: ${action.title}`,
        timestamp: new Date().toISOString(),
      },
    });
  }, []);

  const contextValue: LiveDataContextType = {
    ...state,
    setScenario,
    setCampus,
    triggerManualAction,
    reconnectNow,
    setCustomWsUrl,
  };

  return <LiveDataContext.Provider value={contextValue}>{children}</LiveDataContext.Provider>;
}

export function useLiveData(): LiveDataContextType {
  const ctx = useContext(LiveDataContext);
  if (!ctx) {
    throw new Error('useLiveData must be used within a LiveDataProvider');
  }
  return ctx;
}
