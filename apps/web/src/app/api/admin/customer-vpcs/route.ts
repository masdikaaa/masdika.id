import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    // Query all VPCs or filtered by customer
    const whereClause: any = {};
    if (customerId && customerId !== "all") {
      whereClause.userId = parseInt(customerId);
    }

    const rawVpcs = await prisma.vpcNetwork.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        router: {
          select: {
            id: true,
            name: true,
            host: true,
            proxmoxBridge: true,
          },
        },
        vpsServices: {
          where: { status: { notIn: ["TERMINATED", "TERMINATING"] } },
          select: {
            id: true,
            hostname: true,
            vpcIp: true,
            status: true,
            vmid: true,
            node: true,
          },
        },
        peeringsA: {
          include: {
            vpcB: {
              select: {
                id: true,
                name: true,
                cidr: true,
                vlanId: true,
                userId: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        peeringsB: {
          include: {
            vpcA: {
              select: {
                id: true,
                name: true,
                cidr: true,
                vlanId: true,
                userId: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        _count: {
          select: {
            vpsServices: { where: { status: { notIn: ["TERMINATED", "TERMINATING"] } } },
            peeringsA: true,
            peeringsB: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Decrypt user data
    const vpcs = rawVpcs.map((vpc) => {
      let resolvedName = "Customer";
      let resolvedEmail = "customer@domain.com";

      if (vpc.user) {
        if (vpc.user.name) {
          try {
            resolvedName = decryptDeterministic(vpc.user.name) || vpc.user.name;
          } catch {
            resolvedName = vpc.user.name;
          }
        }
        if (vpc.user.email) {
          try {
            resolvedEmail = decryptDeterministic(vpc.user.email) || vpc.user.email;
          } catch {
            resolvedEmail = vpc.user.email;
          }
        }
      }

      return {
        ...vpc,
        user: vpc.user ? {
          ...vpc.user,
          name: resolvedName,
          email: resolvedEmail,
        } : null,
      };
    });

    // Filter by search query if present
    const filteredVpcs = search
      ? vpcs.filter((v) => {
          const matchName = v.name?.toLowerCase().includes(search);
          const matchCidr = v.cidr?.toLowerCase().includes(search);
          const matchGateway = v.gateway?.toLowerCase().includes(search);
          const matchCustomer =
            v.user?.name?.toLowerCase().includes(search) ||
            v.user?.email?.toLowerCase().includes(search);
          const matchVm = v.vpsServices?.some(
            (vm) =>
              vm.hostname?.toLowerCase().includes(search) ||
              vm.vpcIp?.toLowerCase().includes(search)
          );
          return matchName || matchCidr || matchGateway || matchCustomer || matchVm;
        })
      : vpcs;

    // Fetch all Peerings
    const peeringWhereClause: any = {};
    if (customerId && customerId !== "all") {
      const parsedId = parseInt(customerId);
      peeringWhereClause.OR = [
        { vpcA: { userId: parsedId } },
        { vpcB: { userId: parsedId } },
      ];
    }

    const rawPeerings = await prisma.vpcPeering.findMany({
      where: peeringWhereClause,
      include: {
        vpcA: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            router: { select: { id: true, name: true, host: true } },
          },
        },
        vpcB: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            router: { select: { id: true, name: true, host: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const peerings = rawPeerings.map((p) => {
      const decryptUser = (u: any) => {
        if (!u) return null;
        let name = "Customer";
        let email = "customer@domain.com";
        try {
          if (u.name) name = decryptDeterministic(u.name) || u.name;
        } catch {
          name = u.name;
        }
        try {
          if (u.email) email = decryptDeterministic(u.email) || u.email;
        } catch {
          email = u.email;
        }
        return { ...u, name, email };
      };

      return {
        ...p,
        vpcA: { ...p.vpcA, user: decryptUser(p.vpcA.user) },
        vpcB: { ...p.vpcB, user: decryptUser(p.vpcB.user) },
      };
    });

    // Customers list who have VPCs or VPS
    const usersWithVpcs = await prisma.user.findMany({
      where: {
        OR: [
          { vpcNetworks: { some: {} } },
          { vpsServices: { some: { status: { notIn: ["TERMINATED"] } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        _count: {
          select: {
            vpcNetworks: true,
            vpsServices: { where: { status: { notIn: ["TERMINATED"] } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const customers = usersWithVpcs.map((u) => {
      let resolvedName = "Customer";
      let resolvedEmail = "customer@domain.com";
      try {
        if (u.name) resolvedName = decryptDeterministic(u.name) || u.name;
      } catch {
        resolvedName = u.name;
      }
      try {
        if (u.email) resolvedEmail = decryptDeterministic(u.email) || u.email;
      } catch {
        resolvedEmail = u.email;
      }

      return {
        id: u.id,
        name: resolvedName,
        email: resolvedEmail,
        avatar: u.image,
        role: u.role,
        vpcCount: u._count.vpcNetworks,
        vpsCount: u._count.vpsServices,
      };
    });

    // Calculate platform stats
    const totalVpcsCount = await prisma.vpcNetwork.count();
    const totalPeeringsCount = await prisma.vpcPeering.count();
    const totalAttachedVmsCount = await prisma.vpsService.count({
      where: {
        vpcId: { not: null },
        status: { notIn: ["TERMINATED", "TERMINATING"] },
      },
    });

    const customersWithActiveVpc = new Set(vpcs.map((v) => v.userId)).size;

    return NextResponse.json({
      vpcs: filteredVpcs,
      peerings,
      customers,
      stats: {
        totalVpcs: totalVpcsCount,
        totalPeerings: totalPeeringsCount,
        totalAttachedVms: totalAttachedVmsCount,
        totalCustomers: customersWithActiveVpc,
      },
    });
  } catch (error) {
    console.error("Admin Customer VPC GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
