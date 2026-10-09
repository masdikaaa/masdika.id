import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        subscription: {
          include: { plan: true }
        },
        vpsService: { select: { hostname: true } },
        customService: { select: { name: true } }
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
        user: { ...invoice.user, email, name }
      };
    });

    return NextResponse.json({ success: true, data: decryptedInvoices });
  } catch (error) {
    console.error("Fetch invoices error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
