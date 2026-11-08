import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { syncInvoiceToElastic } from "@/lib/sync-elasticsearch";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.impersonatedBy) {
      return NextResponse.json({ error: "Invoice deletion is not permitted during impersonation" }, { status: 403 });
    }

    const { id } = await params;
    const invoiceId = Number(id);
    if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0) {
      return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
    }

    const existing = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true }
    });
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (existing.status === "PAID" || existing.status === "PAYG_RUNNING") {
      return NextResponse.json(
        { error: "Paid or active PAYG ledger invoices cannot be deleted for financial audit compliance" },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({
      where: { id: invoiceId }
    });

    // Remove from Elasticsearch
    syncInvoiceToElastic(invoiceId).catch(err => console.debug("ES sync delete invoice:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
