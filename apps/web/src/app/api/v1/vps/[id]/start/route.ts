import { NextRequest } from "next/server";
import { executeVpsPowerAction } from "@/lib/vps-api";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeVpsPowerAction(req, id, "start");
}
