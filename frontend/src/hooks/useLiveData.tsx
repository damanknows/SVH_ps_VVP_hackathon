'use client';

import React, { createContext, useContext, useEffect, useReducer, useCallback, type ReactNode } from 'react';
import { WSMessageSchema } from '@/lib/validations';
import { Telemetry, ActionPlan, ActionItem } from '@/types';
import { mockTelemetry, mockActionItems, demoScenarios } from '@/lib/mockData';

export interface AlertItem {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

interface LiveState {
  telemetry: Telemetry;
  actionPlan: ActionPlan;
  alerts: AlertItem[];
  connected: boolean;
  isStandalone: boolean;
  latencyMs: number;
  activeScenario: string;
}

type LiveAction =
  | { type: 'SET_TELEMETRY'; payload: Telemetry }
  | { type: 'SET_ACTION_PLAN'; payload: ActionPlan }
  | { type: 'ADD_ALERT'; payload: AlertItem }
  | { type: 'SET_CONNECTED'; payload: { connected: boolean; isStandalone: boolean } }
  | { type: 'SET_LATENCY'; payload: number }
  | { type: 'SET_SCENARIO'; payload: string };

function reducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case 'SET_TELEMETRY':
      return { ...state, telemetry: action.payload };
    case 'SET_ACTION_PLAN':
      return { ...state, actionPlan: action.payload };
    case 'ADD_ALERT':
      return { ...state, alerts: [action.payload, ...state.alerts].slice(0, 10) };
    case 'SET_CONNECTED':
      return {
        ...state,
        connected: action.payload.connected,
        isStandalone: action.payload.isStandalone,
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
            id: Math.random().toString(36).substr(2, 9),
            level: 'info' as const,
            message: `Switched demo scenario to '${action.payload}'`,
            timestamp: new Date().toISOString(),
          },
          ...state.alerts,
        ].slice(0, 10),
      };
    }
    default:
      return state;
  }
}

interface LiveDataContextType extends LiveState {
  setScenario: (scenarioKey: string) => void;
  triggerManualAction: (action: ActionItem) => void;
}

const LiveDataContext = createContext<LiveDataContextType | null>(null);

const initialActionPlan: ActionPlan = {
  generatedAt: new Date().toISOString(),
  actions: mockActionItems,
};

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    telemetry: mockTelemetry,
    actionPlan: initialActionPlan,
    alerts: [
      {
        id: 'init-1',
        level: 'info',
        message: 'VPP Command Bridge telemetry pipeline initialized.',
        timestamp: new Date().toISOString(),
      },
    ],
    connected: false,
    isStandalone: true,
    latencyMs: 14,
    activeScenario: 'default',
  });

  const setScenario = useCallback((scenarioKey: string) => {
    dispatch({ type: 'SET_SCENARIO', payload: scenarioKey });
  }, []);

  const triggerManualAction = useCallback((action: ActionItem) => {
    dispatch({
      type: 'ADD_ALERT',
      payload: {
        id: Math.random().toString(36).substr(2, 9),
        level: action.priority === 'HIGH' ? 'critical' : 'info',
        message: `Action executed: ${action.title}`,
        timestamp: new Date().toISOString(),
      },
    });
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryMs = 1000;
    let closedByUs = false;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/live';

    function startFallbackSimulator() {
      if (fallbackInterval) return;
      dispatch({ type: 'SET_CONNECTED', payload: { connected: true, isStandalone: true } });

      fallbackInterval = setInterval(() => {
        const t0 = performance.now();
        
        // Compute realistic tick updates
        const socDelta = (Math.random() - 0.48) * 0.4;
        const currentSoc = state.telemetry.socPct;
        const newSoc = Math.min(100, Math.max(10, +(currentSoc + socDelta).toFixed(1)));

        const updatedTelemetry: Telemetry = {
          ...state.telemetry,
          timestamp: new Date().toISOString(),
          socPct: newSoc,
          flowsKw: {
            ...state.telemetry.flowsKw,
            solar: Math.round(Math.max(0, state.telemetry.flowsKw.solar + (Math.random() - 0.5) * 15)),
            wind: Math.round(Math.max(0, state.telemetry.flowsKw.wind + (Math.random() - 0.5) * 8)),
            load: Math.round(Math.max(100, state.telemetry.flowsKw.load + (Math.random() - 0.5) * 10)),
          },
          savingsPerHour: Math.round(state.telemetry.savingsPerHour + (Math.random() - 0.5) * 50),
        };

        dispatch({ type: 'SET_TELEMETRY', payload: updatedTelemetry });
        const elapsed = +(performance.now() - t0).toFixed(1);
        dispatch({ type: 'SET_LATENCY', payload: Math.max(8, Math.min(40, elapsed)) });
      }, 3000);
    }

    function connect() {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
          dispatch({ type: 'SET_CONNECTED', payload: { connected: true, isStandalone: false } });
          retryMs = 1000;
        };

        socket.onmessage = (event) => {
          const t0 = performance.now();
          try {
            const parsed = WSMessageSchema.safeParse(JSON.parse(event.data));
            if (!parsed.success) {
              console.warn('WS Schema Warning:', parsed.error);
              return;
            }
            const msg = parsed.data;
            if (msg.type === 'telemetry') {
              dispatch({ type: 'SET_TELEMETRY', payload: msg.payload });
            } else if (msg.type === 'action_plan') {
              dispatch({ type: 'SET_ACTION_PLAN', payload: msg.payload });
            } else if (msg.type === 'alert') {
              dispatch({
                type: 'ADD_ALERT',
                payload: {
                  id: Math.random().toString(36).substr(2, 9),
                  level: msg.payload.level,
                  message: msg.payload.message,
                  timestamp: new Date().toISOString(),
                },
              });
            }
            dispatch({ type: 'SET_LATENCY', payload: +(performance.now() - t0).toFixed(1) });
          } catch (e) {
            console.error('WS Parse Error:', e);
          }
        };

        socket.onerror = () => {
          startFallbackSimulator();
        };

        socket.onclose = () => {
          dispatch({ type: 'SET_CONNECTED', payload: { connected: false, isStandalone: true } });
          if (closedByUs) return;
          startFallbackSimulator();
          setTimeout(connect, retryMs);
          retryMs = Math.min(retryMs * 2, 30000);
        };
      } catch {
        startFallbackSimulator();
      }
    }

    connect();

    return () => {
      closedByUs = true;
      if (socket) socket.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [state.telemetry]);

  return (
    <LiveDataContext.Provider value={{ ...state, setScenario, triggerManualAction }}>
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
