import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import { startOfMonth, startOfDay, subDays, format } from "date-fns";

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["ADMIN", "OWNER"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const dayStart = startOfDay(now);
    const thirtyDaysAgo = subDays(now, 30);

    // 1. Get all PAID invoices for overall metrics (lightweight query)
    const allPaidInvoices = await prisma.invoice.findMany({
      where: {
        status: "PAID",
      },
      select: {
        amount: true,
        type: true,
        paidAt: true,
      },
    });

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let dailyRevenue = 0;
    let revenueByType = {
      SUBSCRIPTION: 0,
      TOP_UP: 0,
    };

    // Calculate chart data (last 30 days)
    const chartDataMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      chartDataMap[format(subDays(now, i), 'MMM dd')] = 0;
    }

    for (const inv of allPaidInvoices) {
      const amount = inv.amount || 0;
      const paidDate = inv.paidAt || new Date();

      totalRevenue += amount;
      
      if (paidDate >= monthStart) {
        monthlyRevenue += amount;
      }
      
      if (paidDate >= dayStart) {
        dailyRevenue += amount;
      }

      if (inv.type === 'SUBSCRIPTION') {
        revenueByType.SUBSCRIPTION += amount;
      } else if (inv.type === 'TOP_UP') {
        revenueByType.TOP_UP += amount;
      }

      if (paidDate >= thirtyDaysAgo) {
        const dateKey = format(paidDate, 'MMM dd');
        if (chartDataMap[dateKey] !== undefined) {
          chartDataMap[dateKey] += amount;
        }
      }
    }

    const chartData = Object.entries(chartDataMap).map(([date, revenue]) => ({
      date,
      revenue
    }));

    // 2. Build search where clause
    const tableWhere: any = {
      status: "PAID",
    };

    if (search) {
      const searchLower = search.toLowerCase();
      
      // Since name and email are encrypted, we fetch all users and filter in memory
      // to support partial text search, then pass their IDs to the invoice query.
      const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, email: true }
      });
      
      const matchingUserIds = allUsers.filter(u => {
        const dName = (decryptDeterministic(u.name) || u.name || "").toLowerCase();
        const dEmail = (decryptDeterministic(u.email) || u.email || "").toLowerCase();
        return dName.includes(searchLower) || dEmail.includes(searchLower);
      }).map(u => u.id);

      tableWhere.OR = [
        { invoiceNumber: { contains: search } },
        { userId: { in: matchingUserIds } }
      ];
    }

    // 3. Paginated query for recent invoices table
    const [paginatedInvoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where: tableWhere,
        select: {
          amount: true,
          type: true,
          paidAt: true,
          invoiceNumber: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { paidAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({
        where: tableWhere,
      })
    ]);

    // Decrypt recent invoices
    const recentInvoices = paginatedInvoices.map(inv => ({
      ...inv,
      user: inv.user ? {
        name: decryptDeterministic(inv.user.name) || inv.user.name,
        email: decryptDeterministic(inv.user.email) || inv.user.email
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        monthlyRevenue,
        dailyRevenue,
        revenueByType,
        chartData,
        recentInvoices,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        }
      }
    });

  } catch (error: any) {
    console.error("Error fetching revenue data:", error);
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 });
  }
}
