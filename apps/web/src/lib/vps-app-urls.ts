import { prisma } from "@/lib/prisma";

/**
 * Replaces the host/IP in an application URL with a target IP (e.g. public IP),
 * while keeping scheme, port, path, and query parameters intact.
 */
export function replaceUrlHost(
  rawUrl: string | null | undefined,
  targetHost: string | null | undefined,
  oldHosts?: (string | null | undefined)[]
): string {
  if (!rawUrl) return "";
  if (!targetHost || !targetHost.trim()) return rawUrl;

  const cleanTarget = targetHost.trim();
  const validOldHosts = (oldHosts || [])
    .filter((h): h is string => Boolean(h && h.trim()))
    .map((h) => h.trim());

  try {
    const hasScheme = rawUrl.startsWith("http://") || rawUrl.startsWith("https://");
    const testUrl = hasScheme ? rawUrl : `http://${rawUrl}`;
    const parsed = new URL(testUrl);

    // Match if hostname is in oldHosts, or is an IPv4/IPv6, or localhost/internal IP
    const isIpOrMatch =
      validOldHosts.includes(parsed.hostname) ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname) ||
      parsed.hostname.includes(":") ||
      parsed.hostname === "localhost" ||
      /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.)/.test(parsed.hostname);

    if (isIpOrMatch) {
      // If IPv6 without brackets in target, enclose
      parsed.hostname = cleanTarget.includes(":") && !cleanTarget.startsWith("[")
        ? `[${cleanTarget}]`
        : cleanTarget;

      let res = parsed.toString();
      if (!hasScheme && res.startsWith("http://")) {
        res = res.replace(/^http:\/\//, "");
      }
      return res;
    }
  } catch {
    // URL parsing failed, fall back to string replacement below
  }

  let result = rawUrl;
  for (const oldHost of validOldHosts) {
    if (oldHost && result.includes(oldHost)) {
      result = result.split(oldHost).join(cleanTarget);
    }
  }
  return result;
}

/**
 * Resolves the effective browser-accessible application URL.
 * Automatically swaps private IP with public IP, and guarantees aaPanel /login suffix.
 */
export function resolveEffectiveAppUrl(
  appUrl: string | null | undefined,
  effectiveIp: string | null | undefined,
  baseIp?: string | null | undefined,
  appName?: string | null | undefined
): string {
  if (!appUrl) return "";
  if (!effectiveIp || !effectiveIp.trim()) return appUrl;

  let url = replaceUrlHost(appUrl, effectiveIp.trim(), [baseIp]);
  if (appName?.toLowerCase().includes("aapanel") && !url.includes("/login")) {
    url = url.replace(/\/+$/, "") + "/login";
  }
  return url;
}

/**
 * Resolves the effective credentials JSON, updating loginUrl and instructions
 * to point to the effective public IP.
 */
export function resolveEffectiveAppCredentials(
  appCredentials: string | null | undefined,
  effectiveIp: string | null | undefined,
  baseIp?: string | null | undefined,
  appName?: string | null | undefined
): string | null {
  if (!appCredentials) return null;
  try {
    const creds = JSON.parse(appCredentials);
    if (typeof creds !== "object" || creds === null) return appCredentials;

    let modified = false;
    const cleanEffectiveIp = effectiveIp?.trim();

    if (creds.loginUrl && cleanEffectiveIp) {
      const updatedLoginUrl = resolveEffectiveAppUrl(creds.loginUrl, cleanEffectiveIp, baseIp, appName);
      if (updatedLoginUrl !== creds.loginUrl) {
        creds.loginUrl = updatedLoginUrl;
        modified = true;
      }
    }

    if (creds.instructions && cleanEffectiveIp) {
      let inst = creds.instructions;
      const oldHosts = [baseIp].filter(Boolean) as string[];
      for (const oldHost of oldHosts) {
        if (oldHost && inst.includes(oldHost)) {
          inst = inst.split(oldHost).join(cleanEffectiveIp);
          modified = true;
        }
      }
      creds.instructions = inst;
    }

    return modified ? JSON.stringify(creds) : appCredentials;
  } catch {
    return appCredentials;
  }
}

/**
 * Persists the updated appUrl and appCredentials in the database for a VPS
 * when an IP assignment or public IP is changed.
 */
export async function syncVpsAppUrlsWithPublicIp(
  prismaClient: any,
  vpsId: number,
  targetIp: string | null | undefined,
  oldHosts?: (string | null | undefined)[]
): Promise<void> {
  if (!vpsId || !targetIp) return;

  try {
    const cleanTarget = targetIp.trim();
    if (!cleanTarget) return;

    const vps = await prismaClient.vpsService.findUnique({
      where: { id: vpsId },
      select: { id: true, appName: true, appUrl: true, appCredentials: true }
    });

    if (!vps || (!vps.appUrl && !vps.appCredentials)) return;

    const validOldHosts = (oldHosts || []).filter(Boolean) as string[];

    let newAppUrl = vps.appUrl;
    if (newAppUrl) {
      newAppUrl = replaceUrlHost(newAppUrl, cleanTarget, validOldHosts);
      if (vps.appName?.toLowerCase().includes("aapanel") && !newAppUrl.includes("/login")) {
        newAppUrl = newAppUrl.replace(/\/+$/, "") + "/login";
      }
    }

    let newAppCredentials = vps.appCredentials;
    if (newAppCredentials) {
      newAppCredentials = resolveEffectiveAppCredentials(
        newAppCredentials,
        cleanTarget,
        validOldHosts[0],
        vps.appName
      );
    }

    if (newAppUrl !== vps.appUrl || newAppCredentials !== vps.appCredentials) {
      await prismaClient.vpsService.update({
        where: { id: vpsId },
        data: {
          appUrl: newAppUrl,
          appCredentials: newAppCredentials
        }
      });
      console.log(`[syncVpsAppUrlsWithPublicIp] Updated VPS #${vpsId} appUrl: ${newAppUrl}`);
    }
  } catch (err) {
    console.error(`[syncVpsAppUrlsWithPublicIp] Error syncing VPS #${vpsId}:`, err);
  }
}

