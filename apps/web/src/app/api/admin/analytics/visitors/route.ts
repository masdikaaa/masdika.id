export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d"; // 1d, 7d, 30d, 90d, 180d, 365d, all

    const now = new Date();
    let startDate = new Date(0); // Epoch for 'all'
    let groupBy = "day"; // hour, day, week, month

    if (range === "1d") {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      groupBy = "hour";
    } else if (range === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      groupBy = "day";
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      groupBy = "day";
    } else if (range === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      groupBy = "day";
    } else if (range === "180d") {
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      groupBy = "week";
    } else if (range === "365d") {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      groupBy = "month";
    }

    const pageViews = await prisma.pageView.findMany({
      where: range === "all" ? undefined : {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
      }
    });

    // Grouping logic in JS
    const groupedData: Record<string, number> = {};

    pageViews.forEach((view) => {
      let key = "";
      const date = new Date(view.createdAt);

      if (groupBy === "hour") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      } else if (groupBy === "day") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else if (groupBy === "week") {
        // Group by Sunday of the week
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (groupBy === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      }

      groupedData[key] = (groupedData[key] || 0) + 1;
    });

    // Generate continuous timeline to fill gaps with 0
    const timeline: Array<{ date: string; visitors: number; timestamp: number }> = [];
    let current = new Date(startDate);
    // If 'all' and no data, just return empty
    if (range === "all" && pageViews.length > 0) {
       current = new Date(pageViews[0].createdAt);
       // start from the first day
       if(groupBy === "day" || groupBy === "week" || groupBy === "month") {
          current.setHours(0,0,0,0);
       }
    }

    if (pageViews.length > 0 || range !== "all") {
      const end = now;
      while (current <= end) {
        let key = "";
        
        if (groupBy === "hour") {
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')} ${String(current.getHours()).padStart(2, '0')}:00`;
        } else if (groupBy === "day") {
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        } else if (groupBy === "week") {
          const d = new Date(current);
          d.setDate(d.getDate() - d.getDay());
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (groupBy === "month") {
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`;
        }

        if (!timeline.find(t => t.date === key)) {
          timeline.push({
            date: key,
            visitors: groupedData[key] || 0,
            timestamp: current.getTime()
          });
        }

        if (groupBy === "hour") {
          current.setHours(current.getHours() + 1);
        } else if (groupBy === "day") {
          current.setDate(current.getDate() + 1);
        } else if (groupBy === "week") {
          current.setDate(current.getDate() + 7);
        } else if (groupBy === "month") {
          current.setMonth(current.getMonth() + 1);
        }
      }
    }

    return NextResponse.json(timeline);
  } catch (error) {
    console.error("Error fetching visitor analytics:", error);
    return NextResponse.json({ error: "Failed to fetch visitor analytics" }, { status: 500 });
  }
}
