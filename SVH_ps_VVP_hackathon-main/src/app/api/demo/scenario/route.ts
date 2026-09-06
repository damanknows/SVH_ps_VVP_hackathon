import { NextResponse } from 'next/server';
import { demoScenarios } from '@/lib/mockData';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenarioName = body?.name?.toLowerCase()?.trim() || 'sunny_day';

    const scenario = demoScenarios[scenarioName] || demoScenarios.sunny_day;

    return NextResponse.json({
      status: 'optimal',
      scenario: scenarioName,
      telemetry: scenario,
      summary: {
        total_cost_inr: 4500,
        greedy_cost_inr: 6800,
        arbitrage_savings_inr: 2300,
        savings_percentage: 33.8,
        is_emergency_plan: scenarioName === 'storm' || scenarioName === 'grid_outage',
        worst_case_flagged: false,
        solve_time_ms: 12.4,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
