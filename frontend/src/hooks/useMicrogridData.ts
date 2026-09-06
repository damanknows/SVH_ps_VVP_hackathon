"use client";

import {
  generate24hForecast,
  getRecommendationsForCampus,
  getTelemetryForHour,
  RAJASTHAN_CAMPUSES,
} from "@/lib/mockData";
import { Campus, CurrentTelemetry, ForecastItem, Recommendation, ScenarioPreset } from "@/types/telemetry";
import { useCallback, useEffect, useState } from "react";

export function useMicrogridData() {
  const [currentScenario, setScenarioState] = useState<ScenarioPreset>("SUNNY_PEAK");
  const [currentHour, setCurrentHour] = useState<number>(14);
  const [selectedCampus, setSelectedCampus] = useState<Campus>(RAJASTHAN_CAMPUSES[0]);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);

  const [telemetry, setTelemetry] = useState<CurrentTelemetry>(() =>
    getTelemetryForHour("SUNNY_PEAK", 14, RAJASTHAN_CAMPUSES[0].id)
  );
  const [forecast, setForecast] = useState<ForecastItem[]>(() =>
    generate24hForecast("SUNNY_PEAK", RAJASTHAN_CAMPUSES[0].id)
  );
  const [recommendations, setRecommendations] = useState<Recommendation[]>(() =>
    getRecommendationsForCampus(RAJASTHAN_CAMPUSES[0].id)
  );

  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Main data fetch & state sync function
  const refreshData = useCallback(
    async (scenario: ScenarioPreset, hour: number, campus: Campus, live: boolean = false) => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      if (backendUrl) {
        try {
          const [telRes, fcRes, recRes] = await Promise.all([
            fetch(
              `${backendUrl}/api/telemetry/current?scenario=${scenario}&hour=${hour}&campus_id=${campus.id}&live=${live}`
            ),
            fetch(`${backendUrl}/api/forecast/24h?scenario=${scenario}&campus_id=${campus.id}`),
            fetch(`${backendUrl}/api/recommendations?campus_id=${campus.id}`),
          ]);

          if (telRes.ok && fcRes.ok && recRes.ok) {
            const telData = await telRes.json();
            const fcData = await fcRes.json();
            const recData = await recRes.json();

            setTelemetry(telData);
            setForecast(fcData);
            setRecommendations(recData);
            setIsLiveBackend(true);
            setLastUpdated(new Date());
            return;
          }
        } catch {
          setIsLiveBackend(false);
        }
      }

      // Fallback: Local client-side mock data computation
      await Promise.resolve();
      setTelemetry(getTelemetryForHour(scenario, hour, campus.id, live));
      setForecast(generate24hForecast(scenario, campus.id));
      setRecommendations(getRecommendationsForCampus(campus.id));
      setLastUpdated(new Date());
    },
    []
  );

  // Sync state whenever scenario, hour, or campus changes
  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshData(currentScenario, currentHour, selectedCampus, isLiveMode);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentScenario, currentHour, selectedCampus, isLiveMode, refreshData]);

  // Live SCADA Sensor Stream (gently updates telemetry every 3s in live mode)
  useEffect(() => {
    if (!isLiveMode) return;
    const streamInterval = setInterval(() => {
      void refreshData(currentScenario, currentHour, selectedCampus, true);
    }, 3000);

    return () => clearInterval(streamInterval);
  }, [isLiveMode, currentScenario, currentHour, selectedCampus, refreshData]);

  const setScenario = (newScenario: ScenarioPreset) => {
    setScenarioState(newScenario);
  };

  const applyRecommendation = (id: string) => {
    setRecommendations((prev) =>
      prev.map((rec) => {
        if (rec.id === id) {
          return { ...rec, status: "APPLIED" as const };
        }
        return rec;
      })
    );

    // Instant Telemetry Impact when recommendation is applied
    setTelemetry((prev) => ({
      ...prev,
      demand_kw: Math.max(20, Math.round(prev.demand_kw - 12)),
      rupees_saved: prev.rupees_saved + 450,
      co2_saved_kg: Number((prev.co2_saved_kg + 18.5).toFixed(1)),
    }));
  };

  return {
    currentScenario,
    setScenario,
    currentHour,
    setCurrentHour,
    selectedCampus,
    setSelectedCampus,
    campuses: RAJASTHAN_CAMPUSES,
    telemetry,
    forecast,
    recommendations,
    applyRecommendation,
    isLiveBackend,
    isLiveMode,
    setIsLiveMode,
    lastUpdated,
  };
}
