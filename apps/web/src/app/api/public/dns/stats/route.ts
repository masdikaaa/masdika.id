import { NextResponse } from "next/server";
import { getDnsdistStats } from "@/lib/powerdns";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getDnsdistStats();
  if (!stats.available) {
    return NextResponse.json({ available: false }, { status: 200 });
  }
  // Omit internal error reasons on the public endpoint
  const { reason: _reason, ...publicStats } = stats;
  return NextResponse.json(publicStats);
}
