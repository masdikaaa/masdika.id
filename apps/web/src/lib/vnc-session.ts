import { encryptDeterministic, decryptDeterministic } from './encryption';

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

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function createVncSession(data: Omit<VncSession, 'createdAt'>): string {
  const payload: VncSession = { ...data, createdAt: Date.now() };
  return encryptDeterministic(JSON.stringify(payload));
}

export function consumeVncSession(sessionId: string): VncSession | null {
  try {
    const jsonStr = decryptDeterministic(sessionId);
    if (!jsonStr || jsonStr === sessionId) return null;
    
    const session: VncSession = JSON.parse(jsonStr);
    
    if (Date.now() - session.createdAt > SESSION_TTL_MS) {
      return null;
    }
    
    return session;
  } catch (error) {
    console.error("Failed to parse VNC session:", error);
    return null;
  }
}
