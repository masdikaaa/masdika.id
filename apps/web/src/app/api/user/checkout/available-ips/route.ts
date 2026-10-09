import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { Address4, Address6 } from 'ip-address';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    // Get all public pools
    const pools = await prisma.ipPool.findMany({
      where: {
        type: "PUBLIC"
      },
      include: { 
        assignedIps: true,
        reservedIps: true
      }
    });

    const ipToNum = (parts: number[]) => 
      (parts[0] * Math.pow(2, 24)) + 
      (parts[1] * Math.pow(2, 16)) + 
      (parts[2] * Math.pow(2, 8)) + 
      parts[3];

    const numToIp = (num: number) => [
      Math.floor(num / Math.pow(2, 24)) % 256,
      Math.floor(num / Math.pow(2, 16)) % 256,
      Math.floor(num / Math.pow(2, 8)) % 256,
      num % 256
    ].join('.');

    let availableIps: Array<{ id: number, ipAddress: string, gateway: string, netmask: string, version: number }> = [];

    for (const pool of pools) {
      if (!pool.startIp || !pool.endIp) continue;

      if (pool.version === 4) {
        try {
            const startParts = pool.startIp.split('.').map(Number);
            const endParts = pool.endIp.split('.').map(Number);
            
            const startNum = ipToNum(startParts);
            const endNum = ipToNum(endParts);

            const usedIps = new Set([
              ...pool.assignedIps.map((a: any) => a.ipAddress),
              ...pool.reservedIps.map((a: any) => a.ipAddress)
            ]);

            for (let i = startNum; i <= endNum; i++) {
              const candidateIp = numToIp(i);
              if (candidateIp !== pool.gateway && !usedIps.has(candidateIp)) {
                availableIps.push({
                  id: pool.id,
                  ipAddress: candidateIp,
                  gateway: pool.gateway || "",
                  netmask: pool.network || "",
                  version: 4
                });
              }
            }
        } catch(e) {
           // ignore parsing errors
        }
      } else if (pool.version === 6) {
        try {
            const startIp = new Address6(pool.startIp);
            const endIp = new Address6(pool.endIp);
            
            const startNum = (startIp as any).bigInteger();
            const endNum = (endIp as any).bigInteger();

            const usedIps = new Set([
              ...pool.assignedIps.map((a: any) => a.ipAddress),
              ...pool.reservedIps.map((a: any) => a.ipAddress)
            ]);

            // Limit to 100 IPs max per pool for IPv6 to prevent memory overflow
            let count = 0;
            for (let i = startNum; i <= endNum; i++) {
              const candidateIp = (Address6 as any).fromBigInteger(i).correctForm();
              if (candidateIp !== pool.gateway && !usedIps.has(candidateIp)) {
                availableIps.push({
                  id: pool.id,
                  ipAddress: candidateIp,
                  gateway: pool.gateway || "",
                  netmask: pool.network || "",
                  version: 6
                });
                count++;
                if (count > 100) break;
              }
            }
        } catch(e) {
           // ignore parsing errors
        }
      }
    }

    return NextResponse.json(availableIps);
  } catch (error) {
    console.error("GET available IPs error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
