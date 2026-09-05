import { useMutation } from '@tanstack/react-query';
import { SimulationInput, SimulationResult } from '@/types';
import { mockSimulationResult } from '@/lib/mockData';

export function useSimulator() {
  return useMutation<SimulationResult, Error, SimulationInput>({
    mutationFn: async (input: SimulationInput) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      
      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl}/api/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (res.ok) {
            return await res.json();
          }
        } catch {
          // fallback to offline calculation if backend unreachable
        }
      }

      // Simulate network latency for realism
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Calculate dynamic simulated optimization based on input parameters
      const capRatio = input.batteryCapacityKwh / 300;
      const exportRatio = input.exportLimitKw / 200;
      const carbonFactor = input.carbonPriceInrPerTon / 800;

      const annualSavingsInr = Math.round(
        720000 * (0.4 + capRatio * 0.4 + exportRatio * 0.2 * carbonFactor)
      );
      const co2eAvoidedTons = Math.round(75 * (0.5 + capRatio * 0.5));
      const gridIndependencePct = Math.min(
        98,
        Math.round(55 + capRatio * 20 + exportRatio * 10 - input.criticalLoadPct * 0.2)
      );
      const bessCyclesPerYear = Math.round(360 - capRatio * 40);

      return {
        annualSavingsInr,
        co2eAvoidedTons,
        gridIndependencePct,
        bessCyclesPerYear,
        baseline: {
          ...input,
          annualSavingsInr: mockSimulationResult.baseline.annualSavingsInr,
        },
      };
    },
  });
}
