import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { discount3m, discount6m, discount12m } = await req.json();

    const upsertSetting = async (key: string, value: string) => {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    };

    if (discount3m !== undefined) await upsertSetting("DISCOUNT_3M", discount3m.toString());
    if (discount6m !== undefined) await upsertSetting("DISCOUNT_6M", discount6m.toString());
    if (discount12m !== undefined) await upsertSetting("DISCOUNT_12M", discount12m.toString());

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
