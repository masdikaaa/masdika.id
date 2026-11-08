import { EventEmitter } from 'events';
import { prisma } from './prisma';
import { decryptDeterministic } from './encryption';

class PresenceEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }
}

// Global singleton to survive Next.js HMR in development
const globalForPresence = globalThis as unknown as {
  presenceEmitter?: PresenceEmitter;
};

export const presenceEmitter = globalForPresence.presenceEmitter ?? new PresenceEmitter();
if (process.env.NODE_ENV !== 'production') {
  globalForPresence.presenceEmitter = presenceEmitter;
}

export interface OnlineUserSummary {
  id: number;
  name: string;
  email: string;
  image: string | null;
  role: string;
  lastActive: string;
}

export async function fetchOnlineUsersList(): Promise<OnlineUserSummary[]> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const users = await prisma.user.findMany({
      where: {
        lastActive: {
          gte: fiveMinutesAgo,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        lastActive: true,
      },
      orderBy: {
        lastActive: 'desc',
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name ? (decryptDeterministic(u.name) || u.name || 'Unknown') : 'Unknown',
      email: u.email ? (decryptDeterministic(u.email) || u.email || '') : '',
      image: u.image || null,
      role: u.role,
      lastActive: u.lastActive ? u.lastActive.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to fetch online users list:', error);
    return [];
  }
}

export function notifyUserPresencePing(user: {
  id: number;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  lastActive: Date;
}) {
  const decryptedName = user.name ? (decryptDeterministic(user.name) || 'Unknown') : 'Unknown';
  const decryptedEmail = user.email ? (decryptDeterministic(user.email) || '') : '';

  presenceEmitter.emit('presence_ping', {
    id: user.id,
    name: decryptedName,
    email: decryptedEmail,
    image: user.image || null,
    role: user.role || 'USER',
    lastActive: user.lastActive.toISOString(),
  });
}

