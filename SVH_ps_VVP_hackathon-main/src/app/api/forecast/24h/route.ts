import { NextResponse } from 'next/server';
import { generateMockForecast } from '@/lib/mockData';

export async function GET() {
  const forecast = generateMockForecast();

  const legacyPoints = forecast.map((pt) => ({
    timestamp: pt.timestamp,
    pred_solar_kw: pt.p50,
    pred_wind_kw: Math.round(pt.p50 * 0.35),
    pred_demand_kw: Math.round(pt.p50 * 0.75 + 50),
    solar_p10: pt.p10,
    solar_p90: pt.p90,
    wind_p10: Math.round(pt.p10 * 0.3),
    wind_p90: Math.round(pt.p90 * 0.4),
    demand_p10: Math.round(pt.p10 * 0.7 + 40),
    demand_p90: Math.round(pt.p90 * 0.8 + 60),
    tariff: pt.tariff,
    socProjected: pt.socProjected,
  }));

  return NextResponse.json(legacyPoints);
}
