import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const { tunnelId, tunnelName, domainId, subdomain, path, serviceType, serviceUrl, noTlsVerify } = await req.json();

    if (!domainId || !serviceUrl || !tunnelId || !serviceType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (serviceType === 'https' && noTlsVerify === undefined) {
       return NextResponse.json({ error: "noTlsVerify is required when service type is HTTPS" }, { status: 400 });
    }

    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!cfToken || !cfAccountId) {
      return NextResponse.json({ error: "Cloudflare credentials are not configured" }, { status: 500 });
    }

    // Verify user owns the tunnel
    const dbTunnel = await prisma.cloudflareTunnel.findFirst({
      where: { cfTunnelId: tunnelId, userId: Number(user.id) }
    });
    if (!dbTunnel) {
      return NextResponse.json({ error: "Tunnel not found or not owned by you" }, { status: 403 });
    }

    // Verify user owns the domain and get zone ID
    const dbDomain = await prisma.cloudflareDomain.findFirst({
      where: { id: Number(domainId), userId: Number(user.id) }
    });
    if (!dbDomain) {
      return NextResponse.json({ error: "Domain not found or not owned by you" }, { status: 403 });
    }
    
    if (dbDomain.status !== "active") {
      return NextResponse.json({ error: "Domain nameservers are still pending. Please wait until the domain is active." }, { status: 400 });
    }

    const cfZoneId = dbDomain.cfZoneId;
    const fullHostname = subdomain ? `${subdomain}.${dbDomain.domain}` : dbDomain.domain;

    // 1. Create DNS CNAME Record
    const dnsRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'CNAME',
        name: fullHostname,
        content: `${tunnelId}.cfargotunnel.com`,
        proxied: true,
        comment: `Cloudflared Tunnel: ${tunnelName}`
      })
    });
    const dnsData = await dnsRes.json();
    
    // Ignore 81053 error (Record already exists)
    if (!dnsData.success && dnsData.errors?.[0]?.code !== 81053) {
      console.error("DNS Error:", dnsData.errors);
      return NextResponse.json({ error: "Failed to create DNS record: " + (dnsData.errors?.[0]?.message || "Unknown error") }, { status: 400 });
    }

    // 2. Configure Tunnel Ingress Rules
    // First, get existing config to preserve existing rules
    const existingConfigRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${tunnelId}/configurations`,
      {
        headers: {
          'Authorization': `Bearer ${cfToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const existingConfigData = await existingConfigRes.json();

    let ingressRules: any[] = [];

    if (existingConfigData.success && existingConfigData.result?.config?.ingress) {
      // Preserve existing rules, remove the catch-all 404 rule (it must be last)
      // Also remove any existing rule with the same hostname and path to support Upsert (Edit)
      ingressRules = existingConfigData.result.config.ingress.filter(
        (rule: any) => {
          if (!rule.hostname) return false; // remove catch-all
          if (rule.hostname === fullHostname && (rule.path || "") === (path || "")) return false; // remove old matching rule
          return true;
        }
      );
    }

    // Add the new route
    ingressRules.push({
      hostname: fullHostname,
      path: path || undefined,
      service: `${serviceType}://${serviceUrl}`,
      originRequest: serviceType === 'https' ? { noTLSVerify: noTlsVerify } : undefined
    });

    // Always add catch-all at the end
    ingressRules.push({ service: "http_status:404" });

    const configRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${tunnelId}/configurations`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${cfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: { ingress: ingressRules }
        })
      }
    );
    
    const configData = await configRes.json();
    
    if (!configData.success) {
      console.error("Tunnel Config Error:", configData.errors);
      return NextResponse.json({ error: "Failed to configure tunnel: " + (configData.errors?.[0]?.message || "Unknown error") }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Route created: ${fullHostname} → ${serviceType}://${serviceUrl}`
    });
  } catch (error: any) {
    console.error("Failed to add tunnel route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const { searchParams } = new URL(req.url);
    const tunnelId = searchParams.get('tunnelId');
    const hostname = searchParams.get('hostname');
    const path = searchParams.get('path') || "";

    if (!tunnelId || !hostname) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!cfToken || !cfAccountId) {
      return NextResponse.json({ error: "Cloudflare credentials are not configured" }, { status: 500 });
    }

    // Verify user owns the tunnel
    const dbTunnel = await prisma.cloudflareTunnel.findFirst({
      where: { cfTunnelId: tunnelId, userId: Number(user.id) }
    });
    if (!dbTunnel) {
      return NextResponse.json({ error: "Tunnel not found or not owned by you" }, { status: 403 });
    }

    const existingConfigRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${tunnelId}/configurations`,
      {
        headers: {
          'Authorization': `Bearer ${cfToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const existingConfigData = await existingConfigRes.json();

    if (!existingConfigData.success || !existingConfigData.result?.config?.ingress) {
      return NextResponse.json({ error: "Failed to fetch tunnel configuration" }, { status: 400 });
    }

    let ingressRules = existingConfigData.result.config.ingress.filter((rule: any) => {
       if (rule.hostname === hostname) {
           const rulePath = rule.path || "";
           if (rulePath === path) return false;
       }
       return true;
    });

    const configRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${tunnelId}/configurations`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${cfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: { ingress: ingressRules }
        })
      }
    );
    
    const configData = await configRes.json();
    
    if (!configData.success) {
      console.error("Tunnel Config Error:", configData.errors);
      return NextResponse.json({ error: "Failed to configure tunnel: " + (configData.errors?.[0]?.message || "Unknown error") }, { status: 400 });
    }

    // Attempt to delete DNS record from our db if we can find the zone ID
    try {
        const userDomains = await prisma.cloudflareDomain.findMany({
            where: { userId: Number(user.id) }
        });
        const dbDomain = userDomains
            .filter(d => hostname === d.domain || hostname.endsWith(`.${d.domain}`))
            .sort((a, b) => b.domain.length - a.domain.length)[0];
            
        if (dbDomain) {
            const dnsRecordsRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${dbDomain.cfZoneId}/dns_records?name=${hostname}&type=CNAME`, {
                headers: { 'Authorization': `Bearer ${cfToken}` }
            });
            const dnsRecordsData = await dnsRecordsRes.json();
            if (dnsRecordsData.success && dnsRecordsData.result.length > 0) {
                const recordId = dnsRecordsData.result[0].id;
                await fetch(`https://api.cloudflare.com/client/v4/zones/${dbDomain.cfZoneId}/dns_records/${recordId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${cfToken}` }
                });
            }
        }
    } catch (e) {
        console.error("Failed to clean up DNS record", e);
    }

    return NextResponse.json({ 
      success: true,
      message: `Route removed successfully`
    });
  } catch (error: any) {
    console.error("Failed to delete tunnel route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
