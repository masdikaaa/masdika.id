import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedDiscounts = unstable_cache(
  async () => {
    return prisma.setting.findMany({
      where: {
        key: {
          in: ["DISCOUNT_3M", "DISCOUNT_6M", "DISCOUNT_12M"]
        }
      }
    });
  },
  ['public-discounts'],
  { revalidate: 60, tags: ['discounts'] }
);

export async function GET() {
  try {
    const settings = await getCachedDiscounts();

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
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
