import dns from 'dns';
import net from 'net';

/**
 * Checks whether an IP address belongs to a private, loopback, link-local,
 * cloud metadata (169.254.169.254), or reserved internal address space.
 */
export function isPrivateIp(ip: string): boolean {
  // Normalize IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (ip.startsWith('::ffff:')) {
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

  // IPv6 Checks
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();

    // ::1 (Loopback)
    if (normalized === '::1') return true;

    // :: (Unspecified)
    if (normalized === '::') return true;

    // fc00::/7 (Unique Local Address - RFC 4193)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

    // fe80::/10 (Link-Local - RFC 4291)
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }

    // ff00::/8 (Multicast)
    if (normalized.startsWith('ff')) return true;

    return false;
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

    // Validate port
    const defaultPort = url.protocol === 'https:' ? 443 : 80;
    const port = url.port ? parseInt(url.port, 10) : defaultPort;
    const allowedPorts = options.allowedPorts || (url.protocol === 'https:' ? [443] : [80, 443]);

    if (!allowedPorts.includes(port)) {
      return { safe: false, reason: `Port '${port}' is not permitted.` };
    }

    const hostname = url.hostname.toLowerCase();

    // Block obvious local hostnames immediately
    if (
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
