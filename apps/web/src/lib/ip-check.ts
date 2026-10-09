import { prisma } from '@/lib/prisma';

/**
 * Checks if a given IP address is blocked.
 * Supports exact matches and /24 CIDR prefixes.
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false;

  try {
    const blockedIPs = await prisma.blockedUser.findMany({
      where: { type: 'IP' },
      select: { value: true },
    });

    for (const block of blockedIPs) {
      const blockedValue = block.value;

      // Exact match
      if (blockedValue === ip) {
        return true;
      }

      // /24 Prefix match (IPv4)
      if (blockedValue.endsWith('/24')) {
        // Extract the first 3 octets (e.g., "114.120.33.")
        const parts = blockedValue.split('.');
        if (parts.length === 4) {
          const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
          if (ip.startsWith(prefix)) {
            return true;
          }
        }
      }

      // /64 Prefix match (IPv6)
      if (blockedValue.endsWith('/64')) {
        // Extract the first 4 segments (e.g., "2404:c0:3561:fa1b:")
        const parts = blockedValue.split(':');
        if (parts.length >= 4) {
          const prefix = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:`;
          if (ip.startsWith(prefix)) {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking blocked IP:', error);
    return false;
  }
}
