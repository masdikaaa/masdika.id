import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limit";
import { createVpcOnMikrotik, deleteVpcFromMikrotik } from "@/lib/mikrotik";
import { Address4 } from "ip-address";

function isPrivateIp(cidr: string) {
  try {
    const address = new Address4(cidr);
    // Address4 considers 10.x, 172.16-31.x, 192.168.x as private
    // Actually, let's just check the starting octets for RFC 1918
    const ip = cidr.split('/')[0];
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  } catch (e) {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpcs = await prisma.vpcNetwork.findMany({
      where: { userId: auth.userId! },
      include: {
        router: { select: { name: true } },
        _count: {
          select: {
            vpsServices: { where: { status: { notIn: ["TERMINATED", "TERMINATING"] } } },
            peeringsA: true,
            peeringsB: true
          }
        },
        vpsServices: {
          where: { status: { notIn: ["TERMINATED", "TERMINATING"] } },
          select: { id: true, hostname: true, vpcIp: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(vpcs);
  } catch (error) {
    console.error("VPC GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate Limit: Max 5 VPC creations per 10 minutes per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const allowed = await checkRateLimit("VPC_CREATE", ip, 5, 600);
    if (!allowed) {
      return NextResponse.json({ error: "Too many VPC creations. Please try again later." }, { status: 429 });
    }

    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { name, description, cidr, routerId, isNatEnabled } = body;

    if (!name || !cidr) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Quota Limit: Max 5 VPCs per User Account (except Admin)
    const existingVpcsCount = await prisma.vpcNetwork.count({
      where: { userId: auth.userId! }
    });

    if (auth.user!.role === "USER") {
      if (existingVpcsCount >= 5) {
        return NextResponse.json({ error: "Maximum quota reached. You can only create up to 5 VPC networks." }, { status: 403 });
      }

      if (existingVpcsCount === 0 && auth.user!.balance < 50000) {
        return NextResponse.json({ error: "A minimum balance of Rp 50,000 is required to create your first VPC Network." }, { status: 403 });
      }
    }

    if (!isPrivateIp(cidr)) {
      return NextResponse.json({ error: "Invalid CIDR. Only Private IP ranges (RFC 1918) are allowed (e.g. 10.x.x.x, 172.16-31.x.x, 192.168.x.x)" }, { status: 400 });
    }

    let parsedCidr;
    try {
      parsedCidr = new Address4(cidr);

      // Ensure the CIDR provided is a network address (e.g. 192.168.1.0) and not a host/gateway (e.g. 192.168.1.1)
      if (parsedCidr.addressMinusSuffix !== parsedCidr.startAddress().addressMinusSuffix) {
        return NextResponse.json({ error: `CIDR must be a network address (e.g. ${parsedCidr.startAddress().addressMinusSuffix}/${parsedCidr.subnetMask}), not a host or gateway IP.` }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid CIDR format" }, { status: 400 });
    }

    // Prevent overlapping CIDR within the same user account
    const userVpcs = await prisma.vpcNetwork.findMany({
      where: { userId: auth.userId! },
      select: { cidr: true, name: true }
    });

    for (const userVpc of userVpcs) {
      try {
        const existingAddress = new Address4(userVpc.cidr);
        // Check for any overlap: if one subnet is contained within the other
        if (parsedCidr.isInSubnet(existingAddress) || existingAddress.isInSubnet(parsedCidr)) {
          return NextResponse.json({ 
            error: `The CIDR block ${cidr} overlaps with your existing VPC "${userVpc.name}" (${userVpc.cidr}). Please choose a different private IP range.` 
          }, { status: 400 });
        }
      } catch (e) {
        // Ignore parsing errors for existing CIDRs in DB just in case
      }
    }

    // startAddressExclusive() returns the first usable IP (.1 for a /24)
    const gateway = parsedCidr.startAddressExclusive().address;

    let router;
    if (routerId) {
      router = await prisma.vpcRouter.findUnique({ where: { id: parseInt(routerId) } });
    } else {
      router = await prisma.vpcRouter.findFirst();
    }

    if (!router) return NextResponse.json({ error: "No VPC Router available in the system" }, { status: 404 });

    // Allocate VLAN ID and create VPC record atomically inside a transaction.
    // Retry up to 5 times in case of concurrent collision on the unique constraint.
    let vpc: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        vpc = await prisma.$transaction(async (tx) => {
          // SECURITY: Row-level write lock on the Router to strictly serialize VPC creations.
          // This prevents the massive race condition where concurrent users could be assigned
          // the exact same VLAN ID, breaking network isolation.
          await tx.vpcRouter.update({
            where: { id: router!.id },
            data: { updatedAt: new Date() }
          });

          // Lock: read existing VLAN IDs within the transaction
          const existingVpcs = await tx.vpcNetwork.findMany({
            where: { routerId: router!.id },
            select: { vlanId: true },
            orderBy: { vlanId: 'asc' }
          });

          const usedVlanIds = new Set(existingVpcs.map(v => v.vlanId));
          let nextVlanId = 2;

          while (usedVlanIds.has(nextVlanId) && nextVlanId <= 4094) {
            nextVlanId++;
          }

          if (nextVlanId > 4094) {
            throw new Error("Maximum VLAN capacity reached (4094)");
          }

          return tx.vpcNetwork.create({
            data: {
              name,
              description,
              cidr,
              gateway,
              vlanId: nextVlanId,
              isNatEnabled: Boolean(isNatEnabled),
              userId: auth.userId!,
              routerId: router!.id,
            },
          });
        });
        break; // success, exit retry loop
      } catch (err: any) {
        lastError = err;
        // P2002 = Prisma unique constraint violation (concurrent race)
        if (err.code === 'P2002' && attempt < 4) {
          console.warn(`VLAN ID collision on attempt ${attempt + 1}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
          continue;
        }
        // Non-retriable error
        if (err.message === "Maximum VLAN capacity reached (4094)") {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }
    }

    if (!vpc) {
      console.error("Failed to allocate VLAN ID after 5 attempts:", lastError);
      return NextResponse.json({ error: "Failed to allocate VLAN ID due to high concurrency. Please try again." }, { status: 409 });
    }

    // Return response immediately — provision Mikrotik in the background
    setImmediate(async () => {
      try {
        await createVpcOnMikrotik(router!, vpc, auth.user);
        await prisma.vpcNetwork.update({
          where: { id: vpc.id },
          data: { status: "ACTIVE" }
        });
      } catch (error: any) {
        console.error("Mikrotik Background Provisioning Error:", error);
        await prisma.vpcNetwork.update({
          where: { id: vpc.id },
          data: { status: "FAILED" }
        });
      }
    });

    return NextResponse.json({ ...vpc, status: "PROVISIONING" });
  } catch (error) {
    console.error("VPC POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
