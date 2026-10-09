import { prisma } from './prisma';

let cachedMemoryContext: string | null = null;
let lastMemoryCacheTime = 0;
const MEMORY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function buildMemoryContext(): Promise<string> {
  if (cachedMemoryContext && Date.now() - lastMemoryCacheTime < MEMORY_CACHE_TTL) {
    return cachedMemoryContext;
  }

  try {
    // Get last 200 safe user messages to find patterns
    const recentMessages = await prisma.chatMessage.findMany({
      where: {
        role: 'user',
        isInjectionAttempt: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { content: true }
    });

    if (recentMessages.length === 0) {
      cachedMemoryContext = '';
      lastMemoryCacheTime = Date.now();
      return '';
    }

    // Basic frequency analysis for topics
    const keywords = ['harga', 'price', 'tutorial', 'error', 'bug', 'linux', 'windows', 'install', 'belajar', 'api', 'upload', 'password', 'login'];
    const topicCounts: Record<string, number> = {};
    
    recentMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      keywords.forEach(kw => {
        if (content.includes(kw)) {
          topicCounts[kw] = (topicCounts[kw] || 0) + 1;
        }
      });
    });

    // Sort top 5 topics
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    let memoryString = "AI GLOBAL MEMORY (Context from recent user interactions):\n";
    if (topTopics.length > 0) {
      memoryString += `- Users have frequently been asking about: ${topTopics.join(', ')}.\n`;
      memoryString += `- Use this knowledge to anticipate user needs, but do not mention this memory explicitly unless relevant.\n`;
    } else {
      memoryString += `- No strong topic patterns detected recently.\n`;
    }

    cachedMemoryContext = memoryString;
    lastMemoryCacheTime = Date.now();
    return memoryString;

  } catch (error) {
    console.error('Failed to build AI memory context:', error);
    return ''; // Return empty string on error so we don't break the chat
  }
}
