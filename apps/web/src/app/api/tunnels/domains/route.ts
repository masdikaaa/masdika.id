import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_DOMAINS = 5;

// GET: List user's domains with live status from Cloudflare
export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!cfToken) {
      return NextResponse.json({ error: "Cloudflare credentials not configured" }, { status: 500 });
    }

    const userDomains = await prisma.cloudflareDomain.findMany({
      where: { userId: Number(user.id) },
      orderBy: { createdAt: "desc" },
    });

    // Enrich with live status from Cloudflare
    const domains = await Promise.all(
      userDomains.map(async (d) => {
        try {
          const res = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${d.cfZoneId}`,
            {
              headers: {
                'Authorization': `Bearer ${cfToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          const data = await res.json();

          if (data.success && data.result) {
            const liveStatus = data.result.status;
            const liveNs = data.result.name_servers || [];

            // Update DB if status changed
            if (liveStatus !== d.status) {
              await prisma.cloudflareDomain.update({
                where: { id: d.id },
                data: { status: liveStatus },
              });
            }

            return {
              id: d.id,
              cfZoneId: d.cfZoneId,
              domain: d.domain,
              nameServers: liveNs,
              status: liveStatus,
              createdAt: d.createdAt.toISOString(),
            };
          }
        } catch {
          // Fall back to DB data
        }

        return {
          id: d.id,
          cfZoneId: d.cfZoneId,
          domain: d.domain,
          nameServers: JSON.parse(d.nameServers || '[]'),
          status: d.status,
          createdAt: d.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ domains, total: domains.length });
  } catch (error: any) {
    console.error("Failed to list domains:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add a new domain to Cloudflare
export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain name is required" }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!cfToken || !cfAccountId) {
      return NextResponse.json({ error: "Cloudflare credentials not configured" }, { status: 500 });
    }

    // Verify user has an active VPS to prevent abuse
    const vpsCount = await prisma.vpsService.count({
      where: {
        userId: Number(user.id),
        status: { notIn: ["TERMINATED", "SUSPENDED", "PENDING"] }
      }
    });

    if (vpsCount === 0) {
      return NextResponse.json({ error: "Smart System: You must order and have an active VPS first to add a Domain." }, { status: 403 });
    }

    // Check if domain already exists in our DB
    const existingDomain = await prisma.cloudflareDomain.findUnique({
      where: { domain: domain.toLowerCase() }
    });

    if (existingDomain) {
      if (existingDomain.userId === Number(user.id)) {
        return NextResponse.json({ error: "You have already added this domain" }, { status: 400 });
      }
      return NextResponse.json({ error: "This domain is already in use by another account" }, { status: 400 });
    }

    // Check per-user domain limit
    const userDomainCount = await prisma.cloudflareDomain.count({
      where: { userId: Number(user.id) }
    });

    if (userDomainCount >= MAX_DOMAINS) {
      return NextResponse.json({ 
        error: `Maximum ${MAX_DOMAINS} domains allowed per account.` 
      }, { status: 400 });
    }

    // Try to create zone in Cloudflare
    const createRes = await fetch('https://api.cloudflare.com/client/v4/zones', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: domain.toLowerCase(),
        account: { id: cfAccountId },
        type: "full"
      })
    });

    const createData = await createRes.json();

    let zoneId: string;
    let nameServers: string[];
    let status: string;

    if (createData.success) {
      // Zone created successfully
      zoneId = createData.result.id;
      nameServers = createData.result.name_servers || [];
      status = createData.result.status || "pending";
    } else {
      // Check if zone already exists in Cloudflare (error code 1061)
      const alreadyExists = createData.errors?.some((e: any) => e.code === 1061);

      if (alreadyExists) {
        // Try to find the existing zone
        const searchRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain.toLowerCase())}`,
          {
            headers: {
              'Authorization': `Bearer ${cfToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const searchData = await searchRes.json();

        if (searchData.success && searchData.result?.length > 0) {
          const zone = searchData.result[0];
          zoneId = zone.id;
          nameServers = zone.name_servers || [];
          status = zone.status || "pending";
        } else {
          return NextResponse.json({ 
            error: "This domain is already registered in another Cloudflare account. Please remove it from the other account first." 
          }, { status: 400 });
        }
      } else {
        console.error("Cloudflare API Error (Create Zone):", createData.errors);
        return NextResponse.json({ 
          error: createData.errors?.[0]?.message || "Failed to add domain to Cloudflare" 
        }, { status: 400 });
      }
    }

    // Save to database
    const savedDomain = await prisma.cloudflareDomain.create({
      data: {
        cfZoneId: zoneId,
        domain: domain.toLowerCase(),
        nameServers: JSON.stringify(nameServers),
        status,
        userId: Number(user.id),
      }
    });

    return NextResponse.json({ 
      success: true, 
      domain: {
        id: savedDomain.id,
        cfZoneId: zoneId,
        domain: savedDomain.domain,
        nameServers,
        status,
        createdAt: savedDomain.createdAt.toISOString(),
      }
    });
  } catch (error: any) {
    console.error("Failed to add domain:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
