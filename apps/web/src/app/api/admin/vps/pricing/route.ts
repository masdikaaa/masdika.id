import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";

const DEFAULT_PRICING = [
  { key: "vcpu", name: "vCPU Core", pricePerHour: 100, unit: "core" },
  { key: "ram", name: "RAM", pricePerHour: 50, unit: "GB" },
  { key: "disk", name: "Disk Storage", pricePerHour: 50, unit: "GB" },
  { key: "ipv4", name: "IPv4 Address", pricePerHour: 10, unit: "ip" },
  { key: "ipv6", name: "IPv6 Address", pricePerHour: 5, unit: "ip" },
  { key: "backup", name: "Backup Storage", pricePerHour: 30, unit: "GB" },
  { key: "addon_disk", name: "Add-on Disk", pricePerHour: 10, unit: "GB" },
  { key: "diskSsd", name: "SSD Storage", pricePerHour: 100, unit: "GB" },
];

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    let pricing = await prisma.vpsPricing.findMany({
      orderBy: { id: "asc" },
    });

    // Initialize defaults if empty
    if (pricing.length === 0) {
      await prisma.vpsPricing.createMany({ data: DEFAULT_PRICING });
      pricing = await prisma.vpsPricing.findMany({ orderBy: { id: "asc" } });
    } else {
      // Check for missing addon_disk
      const hasAddonDisk = pricing.find(p => p.key === "addon_disk");
      if (!hasAddonDisk) {
        const maxItem = await prisma.vpsPricing.findFirst({ orderBy: { id: 'desc' } });
        await prisma.vpsPricing.upsert({
          where: { key: "addon_disk" },
          update: {},
          create: { id: (maxItem?.id || 0) + 1, key: "addon_disk", name: "Add-on Disk", pricePerHour: 10, unit: "GB" }
        });
        pricing = await prisma.vpsPricing.findMany({ orderBy: { id: "asc" } });
      }
      
      const hasDiskSsd = pricing.find(p => p.key === "diskSsd");
      if (!hasDiskSsd) {
        const maxItem = await prisma.vpsPricing.findFirst({ orderBy: { id: 'desc' } });
        await prisma.vpsPricing.upsert({
          where: { key: "diskSsd" },
          update: {},
          create: { id: (maxItem?.id || 0) + 1, key: "diskSsd", name: "SSD Storage", pricePerHour: 100, unit: "GB" }
        });
        pricing = await prisma.vpsPricing.findMany({ orderBy: { id: "asc" } });
      }
    }

    return NextResponse.json(pricing);
  } catch (error) {
    console.error("GET VPS pricing error:", error);
    return NextResponse.json({ error: "Failed to fetch pricing" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const { items } = await req.json(); // Array of { id, pricePerHour }

    const updates = items.map((item: any) => 
      prisma.vpsPricing.update({
        where: { id: item.id },
        data: { pricePerHour: Number(item.pricePerHour) }
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST VPS pricing error:", error);
    return NextResponse.json({ error: "Failed to save pricing" }, { status: 500 });
  }
}
