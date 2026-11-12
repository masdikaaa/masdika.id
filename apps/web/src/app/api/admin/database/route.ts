import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";
import {
  getDatabaseStatus,
  deleteDatabase,
  buildConnectionDetails,
  getK8sClusterConfig,
  MANAGED_DB_PMA_URL,
  MANAGED_DB_PGADMIN_URL,
  MANAGED_DB_MONGO_URL
} from "@/lib/k8s-database";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const clusterConfig = await getK8sClusterConfig().catch(() => undefined);

    const databases = await prisma.databaseService.findMany({
      where: {
        status: { not: "TERMINATED" },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = databases.map((db) => {
      let resolvedCustomerName = "Customer";
      let resolvedCustomerEmail = "customer@domain.com";

      if (db.user) {
        if (db.user.name) {
          try {
            resolvedCustomerName = decryptDeterministic(db.user.name) || db.user.name;
          } catch {
            resolvedCustomerName = db.user.name;
          }
        }
        if (db.user.email) {
          try {
            resolvedCustomerEmail = decryptDeterministic(db.user.email) || db.user.email;
          } catch {
            resolvedCustomerEmail = db.user.email;
          }
        }
      }

      const connection = buildConnectionDetails(db, clusterConfig);
      const isShared = Boolean(
        db.planName?.toLowerCase().includes("shared") ||
        (db.cpuShares < 1.0 && !db.planName?.toLowerCase().includes("dedicated"))
      );

      return {
        ...db,
        isShared,
        isDedicated: !isShared,
        customerName: resolvedCustomerName,
        customerEmail: resolvedCustomerEmail,
        connectionDetails: connection,
      };
    });

    const totalInstances = mapped.length;
    const runningCount = mapped.filter((d) => d.status === "RUNNING").length;
    const stoppedCount = totalInstances - runningCount;
    const totalCpu = mapped.reduce((acc, d) => acc + (d.cpuShares || 0), 0);
    const totalMemoryMb = mapped.reduce((acc, d) => acc + (d.memoryMb || 0), 0);
    const totalStorageGb = mapped.reduce((acc, d) => acc + (d.storageGb || 0), 0);
    const totalHourlyBurn = mapped.reduce((acc, d) => acc + (d.hourlyRate || 28), 0);
    const totalMonthlyRunRate = totalHourlyBurn * 720;

    return NextResponse.json({
      success: true,
      data: mapped,
      stats: {
        totalInstances,
        runningCount,
        stoppedCount,
        totalCpu: parseFloat(totalCpu.toFixed(1)),
        totalMemoryGb: parseFloat((totalMemoryMb / 1024).toFixed(1)),
        totalStorageGb,
        totalHourlyBurn,
        totalMonthlyRunRate,
        webPanels: {
          pmaUrl: clusterConfig?.pmaUrl || MANAGED_DB_PMA_URL,
          pgadminUrl: clusterConfig?.pgadminUrl || MANAGED_DB_PGADMIN_URL,
          mongoUrl: clusterConfig?.mongoUrl || MANAGED_DB_MONGO_URL,
        },
      },
    });
  } catch (error: any) {
    console.error("[AdminManagedDB] Error fetching instances:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { action, id } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "Missing required fields (id, action)" }, { status: 400 });
    }

    const db = await prisma.databaseService.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!db) {
      return NextResponse.json({ error: "Database instance not found" }, { status: 404 });
    }

    if (action === "delete") {
      await deleteDatabase(db.id, db.k8sNamespace || "managed-db");
      await prisma.databaseService.update({
        where: { id: db.id },
        data: {
          status: "TERMINATED",
          terminationDate: new Date(),
        },
      });
      return NextResponse.json({ success: true, message: `Database ${db.name} terminated and cleaned up` });
    }

    return NextResponse.json({ error: `Unsupported admin action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("[AdminManagedDB] Action error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
