"use client";

import { generate24hForecast, getTelemetryForHour, INITIAL_RECOMMENDATIONS, RAJASTHAN_CAMPUSES } from "@/lib/mockData";
import { Campus, CurrentTelemetry, ForecastItem, Recommendation, ScenarioPreset } from "@/types/telemetry";
import { useCallback, useEffect, useState } from "react";

export function useMicrogridData() {
  const [currentScenario, setScenarioState] = useState<ScenarioPreset>("SUNNY_PEAK");
  const [currentHour, setCurrentHour] = useState<number>(14);
  const [selectedCampus, setSelectedCampus] = useState<Campus>(RAJASTHAN_CAMPUSES[0]);
  
  const [telemetry, setTelemetry] = useState<CurrentTelemetry>(() =>
    getTelemetryForHour("SUNNY_PEAK", 14)
  );
  const [forecast, setForecast] = useState<ForecastItem[]>(() =>
    generate24hForecast("SUNNY_PEAK")
  );
  const [recommendations, setRecommendations] = useState<Recommendation[]>(INITIAL_RECOMMENDATIONS);
  
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Main data fetch & state sync function
  const refreshData = useCallback(
    async (scenario: ScenarioPreset, hour: number) => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      if (backendUrl) {
        setLoading(true);
        try {
          const [telRes, fcRes, recRes] = await Promise.all([
            fetch(`${backendUrl}/api/telemetry/current?scenario=${scenario}&hour=${hour}`),
            fetch(`${backendUrl}/api/forecast/24h?scenario=${scenario}`),
            fetch(`${backendUrl}/api/recommendations`),
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
            setLoading(false);
            return;
          }
        } catch {
          // Backend offline or connection refused -> Seamless Fallback to Local Mock Service
          setIsLiveBackend(false);
        }
        setLoading(false);
      }

      // Fallback: Local client-side mock data computation
      await Promise.resolve();
      setTelemetry(getTelemetryForHour(scenario, hour));
      setForecast(generate24hForecast(scenario));
      setLastUpdated(new Date());
    },
    []
  );

  // Sync state whenever scenario or hour changes
  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshData(currentScenario, currentHour);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentScenario, currentHour, refreshData]);

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

    // Instant Telemetry Impact when recommendation is applied: reduce demand by 15kW, increase battery SoC slightly
    setTelemetry((prev) => ({
      ...prev,
      demand_kw: Math.max(80, prev.demand_kw - 12),
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
    loading,
    lastUpdated,
  };
}
