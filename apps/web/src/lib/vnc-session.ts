import { encryptAuthenticated, decryptAuthenticated } from './encryption';

interface VncSession {
  proxmoxHost: string;
  node: string;
  vmid: number;
  port: number | string;
  ticket: string;
  tokenId: string;
  tokenSecret: string;
  userId: number;
  createdAt: number;
}

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes buffer for VNC ticket connections

export function createVncSession(data: Omit<VncSession, 'createdAt'>): string {
  const payload: VncSession = {
    ...data,
    port: Number(data.port) || data.port,
    vmid: Number(data.vmid) || data.vmid,
    userId: Number(data.userId) || data.userId,
    createdAt: Date.now(),
  };
  return encryptAuthenticated(JSON.stringify(payload), 'vnc-session');
}

export function consumeVncSession(sessionId: string): (Omit<VncSession, 'port'> & { port: number }) | null {
  try {
    const jsonStr = decryptAuthenticated(sessionId, 'vnc-session');
    if (!jsonStr) return null;

    const session: VncSession = JSON.parse(jsonStr);

    const numericPort = Number(session.port);
    const numericVmid = Number(session.vmid);
    const numericUserId = Number(session.userId);

    if (
      typeof session.createdAt !== 'number' ||
      Date.now() - session.createdAt > SESSION_TTL_MS ||
      !Number.isSafeInteger(numericUserId) ||
      numericUserId <= 0 ||
      !Number.isSafeInteger(numericVmid) ||
      numericVmid <= 0 ||
      !Number.isSafeInteger(numericPort) ||
      numericPort < 1 ||
      numericPort > 65535 ||
      !/^[a-zA-Z0-9_.-]{1,64}$/.test(String(session.node || ''))
    ) {
      return null;
    }

    return {
      ...session,
      port: numericPort,
      vmid: numericVmid,
      userId: numericUserId,
    };
  } catch (error) {
    console.error('Failed to parse VNC session:', error);
    return null;
  }
}
