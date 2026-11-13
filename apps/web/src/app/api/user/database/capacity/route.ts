import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { checkDatabaseClusterCapacity } from "@/lib/k8s-database";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    const capacity = await checkDatabaseClusterCapacity();
    return NextResponse.json({
      success: true,
      data: capacity,
    });
  } catch (error: any) {
    console.error("[ManagedDB Capacity] Error checking capacity:", error);
    return NextResponse.json({
      error: error.message || "Failed to check database cluster capacity",
    }, { status: 500 });
  }
}

