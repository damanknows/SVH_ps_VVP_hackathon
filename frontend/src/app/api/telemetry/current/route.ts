import { getTelemetryForHour } from "@/lib/mockData";
import { ScenarioPreset } from "@/types/telemetry";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenario = (searchParams.get("scenario") as ScenarioPreset) || "SUNNY_PEAK";
  const hour = parseInt(searchParams.get("hour") || "14", 10);
  const campusId = searchParams.get("campus_id") || "gec-bikaner";
  const live = searchParams.get("live") === "true";

  const telemetry = getTelemetryForHour(scenario, hour, campusId, live);
  return NextResponse.json(telemetry);
}
