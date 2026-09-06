import { NextResponse } from 'next/server';
import { getTelemetryForCampus, CAMPUSES } from '@/lib/mockData';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const event = searchParams.get('event');
  const campusId = searchParams.get('campus_id') || CAMPUSES[0].id;

  const telemetry = getTelemetryForCampus(campusId);

  // Apply demo overrides if requested
  let solar = telemetry.flowsKw.solar;
  let wind = telemetry.flowsKw.wind;
  let demand = telemetry.flowsKw.load;

  if (event === 'DEMO_STATE') {
    solar = 185.0;
    wind = 32.0;
    demand = 205.0;
  } else if (event === 'CLOUD_COVER') {
    solar = 40.0;
    wind = 32.0;
    demand = 205.0;
  } else if (event === 'TARIFF_SPIKE') {
    solar = 0.0;
    wind = 32.0;
    demand = 205.0;
  }

  const gridImp = Math.max(0, demand - (solar + wind));

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    campus_id: campusId,
    solar_kw: solar,
    wind_kw: wind,
    campus_load_kw: demand,
    battery_soc_kwh: Math.round((telemetry.socPct / 100) * 500),
    battery_soc_pct: telemetry.socPct,
    grid_import_kw: gridImp,
    grid_available: true,
  });
}
