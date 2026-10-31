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

    const { id } = await params;
    const invoiceId = parseInt(id);

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
