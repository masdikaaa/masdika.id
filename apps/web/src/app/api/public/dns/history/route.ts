import { NextRequest, NextResponse } from "next/server";
import { type DnsHistoryRange, getDnsdistStats, getDnsTelemetryHistory } from "@/lib/powerdns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("range") || "1d";
  const range: DnsHistoryRange = raw === "7d" || raw === "30d" ? raw : "1d";

  // Ensure a fresh sample is recorded if needed
  await getDnsdistStats().catch(() => null);
  const history = await getDnsTelemetryHistory(range);
  return NextResponse.json(history);
}
