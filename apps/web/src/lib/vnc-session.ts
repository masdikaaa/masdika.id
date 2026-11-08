import { encryptAuthenticated, decryptAuthenticated } from './encryption';

interface VncSession {
  proxmoxHost: string;
  node: string;
  vmid: number;
  port: number;
  ticket: string;
  tokenId: string;
  tokenSecret: string;
  userId: number;
  createdAt: number;
}

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes (aligned with Proxmox VNC ticket window)

export function createVncSession(data: Omit<VncSession, 'createdAt'>): string {
  const payload: VncSession = { ...data, createdAt: Date.now() };
  return encryptAuthenticated(JSON.stringify(payload), 'vnc-session');
}

export function consumeVncSession(sessionId: string): VncSession | null {
  try {
    const jsonStr = decryptAuthenticated(sessionId, 'vnc-session');
    if (!jsonStr) return null;

    const session: VncSession = JSON.parse(jsonStr);

    if (
      typeof session.createdAt !== 'number' ||
      Date.now() - session.createdAt > SESSION_TTL_MS ||
      !Number.isSafeInteger(session.userId) ||
      session.userId <= 0 ||
      !Number.isSafeInteger(session.vmid) ||
      session.vmid <= 0 ||
      !Number.isSafeInteger(session.port) ||
      session.port < 5900 ||
      session.port > 65535 ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(String(session.node || ''))
    ) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to parse VNC session:', error);
    return null;
  }
}
