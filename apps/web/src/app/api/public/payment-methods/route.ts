import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" }
    });
    
    const taxSetting = await prisma.setting.findUnique({
      where: { key: 'tax_rate' }
    });
    const taxRate = taxSetting && !isNaN(Number(taxSetting.value)) ? Number(taxSetting.value) : 0;

    return NextResponse.json({ success: true, data: paymentMethods, taxRate });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
