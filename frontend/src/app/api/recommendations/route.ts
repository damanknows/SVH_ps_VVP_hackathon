import { getRecommendationsForCampus } from "@/lib/mockData";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campusId = searchParams.get("campus_id") || "gec-bikaner";
  const recs = getRecommendationsForCampus(campusId);
  return NextResponse.json(recs);
}
