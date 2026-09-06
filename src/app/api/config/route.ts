import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const wsUrl =
    process.env.WS_URL ||
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.BACKEND_WS_URL ||
    '';

  const httpUrl =
    process.env.BACKEND_HTTP_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    '';

  return NextResponse.json({
    wsUrl,
    httpUrl,
    environment: process.env.NODE_ENV || 'production',
  });
}
