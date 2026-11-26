import { NextResponse } from "next/server";
import { getDnsdistStats } from "@/lib/powerdns";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getDnsdistStats();
  if (!stats.available) {
    return NextResponse.json(
      { available: false },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }
  const { reason: _reason, ...publicStats } = stats;
  return NextResponse.json(publicStats, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
