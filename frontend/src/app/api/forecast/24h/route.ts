import { generate24hForecast } from "@/lib/mockData";
import { ScenarioPreset } from "@/types/telemetry";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenario = (searchParams.get("scenario") as ScenarioPreset) || "SUNNY_PEAK";
  const campusId = searchParams.get("campus_id") || "gec-bikaner";

  const forecast = generate24hForecast(scenario, campusId);
  return NextResponse.json(forecast);
}
