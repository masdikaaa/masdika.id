import dns from 'dns';
import net from 'net';
import { Address6 } from 'ip-address';

/**
 * Checks whether an IP address belongs to a private, loopback, link-local,
 * cloud metadata (169.254.169.254), or reserved internal address space.
 */
export function isPrivateIp(rawInput: string): boolean {
  if (!rawInput || typeof rawInput !== 'string') return true;
  // Strip IPv6 brackets and zone index if present
  const ip = rawInput.trim().replace(/^\[|\]$/g, '').split('%')[0];
  if (!ip) return true;

  // Normalize case-insensitive IPv4-mapped IPv6 dotted form (e.g. ::ffff:127.0.0.1 or ::FFFF:127.0.0.1)
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const rawIpv4 = ip.substring(7);
    if (net.isIPv4(rawIpv4)) {
      return isPrivateIp(rawIpv4);
    }
  }

  // IPv4 Checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    const [a, b, c, d] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 10.0.0.0/8 (Private network - RFC 1918 / K8s pod network)
    if (a === 10) return true;

    // 100.64.0.0/10 (Shared address space / Carrier Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 127.0.0.0/8 (Loopback / Localhost)
    if (a === 127) return true;

    // 169.254.0.0/16 (Link-local / AWS & Cloud Metadata Service 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 172.16.0.0/12 (Private network - RFC 1918)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0 && c === 0) return true;

    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && c === 2) return true;

    // 192.168.0.0/16 (Private network - RFC 1918 / Home & Server LAN)
    if (a === 192 && b === 168) return true;

    // 198.18.0.0/15 (Network benchmark tests)
    if (a === 198 && (b === 18 || b === 19)) return true;

    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && c === 100) return true;

    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && c === 113) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved for future use)
    if (a >= 240) return true;

    // 255.255.255.255 (Broadcast)
    if (a === 255 && b === 255 && c === 255 && d === 255) return true;

    return false;
  }

  // IPv6 Checks (canonicalized across expanded, hex-mapped ::ffff:7f00:1, NAT64, 6to4, ULA, Link-Local)
  if (net.isIPv6(ip)) {
    try {
      const addr6 = new Address6(ip);
      const groups = addr6.parsedAddress.map((g) => parseInt(g, 16));
      if (groups.length !== 8 || groups.some(isNaN)) return true;

      // :: (Unspecified) or ::1 (Loopback) including 0:0:0:0:0:0:0:1
      const allFirst7Zero = groups.slice(0, 7).every((g) => g === 0);
      if (allFirst7Zero && (groups[7] === 0 || groups[7] === 1)) return true;

      // IPv4-compatible ::w.x.y.z or IPv4-mapped ::ffff:w.x.y.z (including ::ffff:7f00:1)
      const first5Zero = groups.slice(0, 5).every((g) => g === 0);
      if (first5Zero && (groups[5] === 0 || groups[5] === 0xffff)) {
        const ipv4 = `${(groups[6] >> 8) & 0xff}.${groups[6] & 0xff}.${(groups[7] >> 8) & 0xff}.${groups[7] & 0xff}`;
        return isPrivateIp(ipv4);
      }

      // NAT64 well-known prefix 64:ff9b::/96 & 64:ff9b:1::/48
      if (groups[0] === 0x0064 && groups[1] === 0xff9b) {
        const ipv4 = `${(groups[6] >> 8) & 0xff}.${groups[6] & 0xff}.${(groups[7] >> 8) & 0xff}.${groups[7] & 0xff}`;
        return isPrivateIp(ipv4);
      }

      // 6to4 2002::/16 embeds IPv4 in groups[1..2]
      if (groups[0] === 0x2002) {
        const ipv4 = `${(groups[1] >> 8) & 0xff}.${groups[1] & 0xff}.${(groups[2] >> 8) & 0xff}.${groups[2] & 0xff}`;
        return isPrivateIp(ipv4);
      }

      // Teredo 2001:0000::/32, Benchmarking 2001:0002::/48, Documentation 2001:db8::/32, Discard 100::/64
      if (groups[0] === 0x2001 && (groups[1] === 0x0000 || groups[1] === 0x0002 || groups[1] === 0x0db8)) return true;
      if (groups[0] === 0x0100 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0) return true;

      // fc00::/7 (Unique Local Address - RFC 4193)
      if ((groups[0] & 0xfe00) === 0xfc00) return true;

      // fe80::/10 (Link-Local - RFC 4291) & fec0::/10 (Site-Local)
      if ((groups[0] & 0xffc0) === 0xfe80 || (groups[0] & 0xffc0) === 0xfec0) return true;

      // ff00::/8 (Multicast)
      if ((groups[0] & 0xff00) === 0xff00) return true;

      return false;
    } catch {
      return true;
    }
  }

  // Unparseable string as IP: treat as unsafe
  return true;
}

export interface ValidateUrlOptions {
  allowedProtocols?: string[];
  allowedDomains?: string[];
  allowedPorts?: number[];
  allowPrivate?: boolean;
}

/**
 * Validates a target URL against SSRF attacks:
 * 1. Protocol whitelist (default https only)
 * 2. Port restrictions (default 443 only for https, 80 for http)
 * 3. Domain whitelist (if provided)
 * 4. DNS resolution and check against all private/internal IP ranges (prevents DNS Rebinding)
 */
export async function validateSafeUrl(
  urlString: string,
  options: ValidateUrlOptions = {}
): Promise<{ safe: boolean; reason?: string }> {
  try {
    const url = new URL(urlString);
    const allowedProtocols = options.allowedProtocols || ['https:'];

    if (!allowedProtocols.includes(url.protocol)) {
      return { safe: false, reason: `Protocol '${url.protocol}' is not permitted.` };
    }

    if (url.username || url.password) {
      return { safe: false, reason: 'Embedded URL credentials are not permitted.' };
    }

    // Validate port
    const defaultPort = url.protocol === 'https:' ? 443 : 80;
    const port = url.port ? parseInt(url.port, 10) : defaultPort;
    const allowedPorts = options.allowedPorts || (url.protocol === 'https:' ? [443] : [80, 443]);

    if (!allowedPorts.includes(port)) {
      return { safe: false, reason: `Port '${port}' is not permitted.` };
    }

    // Strip IPv6 brackets from WHATWG URL hostname (e.g. "[::1]" -> "::1") and trailing dot
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');

    // Block obvious local hostnames immediately
    if (
      !hostname ||
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname === '0.0.0.0'
    ) {
      return { safe: false, reason: 'Targeting local/internal hostnames is prohibited.' };
    }

    // Check domain whitelist if specified
    if (options.allowedDomains && options.allowedDomains.length > 0) {
      const isAllowedDomain = options.allowedDomains.some((domain) => {
        const d = domain.toLowerCase();
        return hostname === d || hostname.endsWith('.' + d);
      });

      if (!isAllowedDomain) {
        return { safe: false, reason: `Domain '${hostname}' is not in the whitelist.` };
      }
    }

    // Check if hostname is an immediate IP literal
    if (net.isIP(hostname)) {
      if (!options.allowPrivate && isPrivateIp(hostname)) {
        return { safe: false, reason: `Direct private IP access (${hostname}) is blocked.` };
      }
      return { safe: true };
    }

    // DNS Resolution check (prevents DNS Rebinding to internal IPs)
    if (!options.allowPrivate) {
      try {
        const addresses = await dns.promises.lookup(hostname, { all: true });
        if (!addresses || addresses.length === 0) {
          return { safe: false, reason: `Unable to resolve host '${hostname}'.` };
        }
        for (const addr of addresses) {
          if (isPrivateIp(addr.address)) {
            return {
              safe: false,
              reason: `Host '${hostname}' resolves to a restricted private IP (${addr.address}).`,
            };
          }
        }
      } catch (dnsErr: any) {
        return { safe: false, reason: `Unable to resolve host '${hostname}': ${dnsErr.message}` };
      }
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: `Malformed URL: ${err.message}` };
  }
}
