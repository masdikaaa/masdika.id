import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";
import { standardizeInvoiceNumber } from "@/lib/invoice-standardizer";
import { searchInvoicesElastic } from "@/lib/sync-elasticsearch";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const search = req.nextUrl.searchParams.get("search") || req.nextUrl.searchParams.get("q") || "";
    const status = req.nextUrl.searchParams.get("status") || "all";

    // 1. Attempt Elasticsearch search if search query is provided
    let elasticInvoiceIds: number[] | null = null;
    if (search.trim()) {
      elasticInvoiceIds = await searchInvoicesElastic(search.trim(), {
        status: status !== "all" ? status : undefined,
        limit: 150,
      });
    }

    const whereClause: any = {};

    if (elasticInvoiceIds !== null) {
      whereClause.id = { in: elasticInvoiceIds };
    } else if (status !== "all") {
      if (status === "FAILED") {
        whereClause.status = { in: ["FAILED", "CANCELED", "EXPIRED"] };
      } else {
        whereClause.status = status;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        subscription: {
          include: { plan: true }
        },
        vpsService: { select: { hostname: true } }
      }
    });

    const decryptedInvoices = invoices.map(invoice => {
      let email = invoice.user?.email || "";
      if (email.startsWith('enc:')) {
        try {
          email = decryptDeterministic(email);
        } catch(e) {}
      }
      let name = invoice.user?.name || "";
      if (name.startsWith('enc:')) {
        try {
          name = decryptDeterministic(name);
        } catch(e) {}
      }
      return {
        ...invoice,
        invoiceNumber: standardizeInvoiceNumber(invoice.invoiceNumber),
        user: { ...invoice.user, email, name }
      };
    });

    // 2. Local development fallback: if Elasticsearch is offline / not configured, filter in memory
    let finalInvoices = decryptedInvoices;
    if (elasticInvoiceIds === null && search.trim()) {
      const q = search.trim().toLowerCase();
      finalInvoices = decryptedInvoices.filter(inv => {
        const invNum = (inv.invoiceNumber || "").toLowerCase();
        const mOrderId = (inv.merchantOrderId || "").toLowerCase();
        const userName = (inv.user?.name || "").toLowerCase();
        const userEmail = (inv.user?.email || "").toLowerCase();
        const planTitle = (inv.subscription?.plan?.name || "").toLowerCase();
        const vpsHostname = (inv.vpsService?.hostname || "").toLowerCase();
        const method = (inv.paymentMethod || "").toLowerCase();

        return (
          invNum.includes(q) ||
          mOrderId.includes(q) ||
          userName.includes(q) ||
          userEmail.includes(q) ||
          planTitle.includes(q) ||
          vpsHostname.includes(q) ||
          method.includes(q)
        );
      });
    }

    return NextResponse.json({
      success: true,
      data: finalInvoices,
      meta: {
        total: finalInvoices.length,
        source: elasticInvoiceIds !== null ? 'elasticsearch' : 'database'
      }
    });
  } catch (error) {
    console.error("Fetch invoices error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
