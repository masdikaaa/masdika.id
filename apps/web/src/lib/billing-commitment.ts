import { prisma } from "./prisma";

export interface UserServicesCommitment {
  vpsMonthly: number;
  dbMonthly: number;
  subMonthly: number;
  reservedIpMonthly: number;
  totalMonthly: number;
  activeVpsCount: number;
  activeDbCount: number;
  activeSubCount: number;
  activeIpCount: number;
  totalActiveCount: number;
}

/**
 * Calculates the total monthly commitment of all active services for a given user.
 * Services include:
 * - Cloud VPS instances (hourlyRate * 730)
 * - Managed Databases (monthlyPrice or hourlyRate * 720)
 * - Subscriptions such as File CDN and API Hub (hourlyPrice * 730 or monthly price)
 * - Standalone Reserved IPs (hourlyRate * 730)
 */
export async function getUserServicesCommitment(
  userId: number,
  tx: any = prisma
): Promise<UserServicesCommitment> {
  const [activeVps, activeDb, activeSubs, activeIps] = await Promise.all([
    tx.vpsService.findMany({
      where: {
        userId,
        status: { notIn: ["TERMINATED", "TERMINATING"] },
      },
      select: { hourlyRate: true },
    }),
    tx.databaseService.findMany({
      where: {
        userId,
        status: { notIn: ["TERMINATED"] },
      },
      select: { monthlyPrice: true, hourlyRate: true, billingMode: true },
    }),
    tx.subscription.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "SUSPENDED"] },
      },
      include: {
        plan: {
          select: { price: true, hourlyPrice: true, service: true },
        },
      },
    }),
    tx.reservedIp.findMany({
      where: {
        userId,
        isAttached: false,
      },
      select: { hourlyRate: true },
    }),
  ]);

  const vpsMonthly = activeVps.reduce(
    (sum: number, v: any) => sum + Math.round((v.hourlyRate || 0) * 730),
    0
  );

  const dbMonthly = activeDb.reduce((sum: number, d: any) => {
    const cost = d.monthlyPrice || Math.round((d.hourlyRate || 0) * 720);
    return sum + (cost || 0);
  }, 0);

  const subMonthly = activeSubs.reduce((sum: number, s: any) => {
    const cost = s.plan?.hourlyPrice ? Math.round(s.plan.hourlyPrice * 730) : (s.plan?.price || 0);
    return sum + (cost || 0);
  }, 0);

  const reservedIpMonthly = activeIps.reduce(
    (sum: number, ip: any) => sum + Math.round((ip.hourlyRate || 0) * 730),
    0
  );

  const totalMonthly = vpsMonthly + dbMonthly + subMonthly + reservedIpMonthly;
  const totalActiveCount = activeVps.length + activeDb.length + activeSubs.length + activeIps.length;

  return {
    vpsMonthly,
    dbMonthly,
    subMonthly,
    reservedIpMonthly,
    totalMonthly,
    activeVpsCount: activeVps.length,
    activeDbCount: activeDb.length,
    activeSubCount: activeSubs.length,
    activeIpCount: activeIps.length,
    totalActiveCount,
  };
}

/**
 * Validates that user balance is sufficient to cover ALL current active services plus the new service.
 * Enforces strict commitment consistency in English across all services.
 */
export async function assertSufficientCommitmentBalance({
  userId,
  userBalance,
  newServiceMonthly,
  serviceName,
  tx = prisma,
}: {
  userId: number;
  userBalance: number;
  newServiceMonthly: number;
  serviceName: string;
  tx?: any;
}): Promise<{
  requiredBalance: number;
  currentCommitment: number;
}> {
  const commitment = await getUserServicesCommitment(userId, tx);
  const requiredBalance = commitment.totalMonthly + newServiceMonthly;

  if (userBalance < requiredBalance) {
    const breakdownParts = [];
    if (commitment.activeVpsCount > 0) breakdownParts.push(`${commitment.activeVpsCount} VPS (Rp ${commitment.vpsMonthly.toLocaleString("id-ID")}/mo)`);
    if (commitment.activeDbCount > 0) breakdownParts.push(`${commitment.activeDbCount} Database (Rp ${commitment.dbMonthly.toLocaleString("id-ID")}/mo)`);
    if (commitment.activeSubCount > 0) breakdownParts.push(`${commitment.activeSubCount} Subscription/CDN (Rp ${commitment.subMonthly.toLocaleString("id-ID")}/mo)`);
    if (commitment.activeIpCount > 0) breakdownParts.push(`${commitment.activeIpCount} Reserved IP (Rp ${commitment.reservedIpMonthly.toLocaleString("id-ID")}/mo)`);

    const activeDetails =
      commitment.totalMonthly > 0
        ? `Current active services commitment: Rp ${commitment.totalMonthly.toLocaleString("id-ID")}/mo [${breakdownParts.join(", ")}]. `
        : "";

    throw new Error(
      `Insufficient account balance for accumulated services commitment. ${activeDetails}Estimated cost for ${serviceName}: Rp ${newServiceMonthly.toLocaleString("id-ID")}/mo. Total required balance: Rp ${requiredBalance.toLocaleString("id-ID")}, but your current balance is Rp ${userBalance.toLocaleString("id-ID")}. Please top up your balance to deploy.`
    );
  }

  return {
    requiredBalance,
    currentCommitment: commitment.totalMonthly,
  };
}
