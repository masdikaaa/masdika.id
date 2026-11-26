import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import { validateClusterOrStorageEndpoint } from "@/lib/ssrf";
import { testPowerDnsConnection } from "@/lib/powerdns";

export const dynamic = "force-dynamic";

const MASKED_SECRET = "••••••••";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    let apiUrl = typeof body?.apiUrl === "string" ? body.apiUrl.trim().replace(/\/+$/, "") : "";
    let apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";

    if (!apiUrl || !apiKey || apiKey === MASKED_SECRET) {
      const rows = await prisma.setting.findMany({
        where: { key: { in: ["powerdns_api_url", "powerdns_api_key"] } },
      });
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;

      if (!apiUrl) {
        apiUrl = (map.powerdns_api_url || process.env.POWERDNS_API_URL || "").trim().replace(/\/+$/, "");
      }
      if (!apiKey || apiKey === MASKED_SECRET) {
        const stored = map.powerdns_api_key;
        let decrypted = "";
        if (stored) {
          try {
            decrypted = decryptDeterministic(stored) || stored;
          } catch {
            decrypted = stored;
          }
        }
        apiKey = (decrypted || process.env.POWERDNS_API_KEY || "").trim();
      }
    }

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { success: false, message: "PowerDNS API URL and API Key are required." },
        { status: 400 }
      );
    }

    try {
      await validateClusterOrStorageEndpoint(apiUrl, "PowerDNS API URL");
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: err?.message || "Invalid PowerDNS API URL" },
        { status: 400 }
      );
    }

    const result = await testPowerDnsConnection({ apiUrl, apiKey });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    console.error("PowerDNS test connection error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Connection test failed" },
      { status: 500 }
    );
  }
}
