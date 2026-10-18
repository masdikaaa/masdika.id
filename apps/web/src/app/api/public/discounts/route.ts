import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedData } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const fetchDiscounts = () =>
  prisma.setting.findMany({
    where: {
      key: {
        in: ["DISCOUNT_3M", "DISCOUNT_6M", "DISCOUNT_12M"]
      }
    }
  });

export async function GET() {
  try {
    const settings = await getCachedData('settings:discounts', 300, fetchDiscounts);

    const getVal = (key: string, def: number) => {
      const s = settings.find(x => x.key === key);
      return s && !isNaN(parseInt(s.value)) ? parseInt(s.value) : def;
    };

    return NextResponse.json({
      success: true,
      data: {
        "3_MONTHS": getVal("DISCOUNT_3M", 5),
        "6_MONTHS": getVal("DISCOUNT_6M", 10),
        "12_MONTHS": getVal("DISCOUNT_12M", 20),
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
