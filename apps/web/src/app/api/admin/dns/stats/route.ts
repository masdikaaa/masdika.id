import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDnsdistStats } from "@/lib/powerdns";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const stats = await getDnsdistStats();
  return NextResponse.json(stats);
}
