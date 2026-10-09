import { Client } from '@elastic/elasticsearch';

// Safe elasticsearch client that degrades gracefully for local development
let elasticClient: Client | null = null;

if (process.env.ELASTIC_URL) {
  try {
    const node = process.env.ELASTIC_URL;
    const auth = process.env.ELASTIC_PASSWORD 
      ? { username: 'elastic', password: process.env.ELASTIC_PASSWORD } 
      : undefined;
      
    elasticClient = new Client({
      node,
      auth,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });
    
    // Quick ping to check connection (optional, can be removed if it blocks startup)
    // elasticClient.ping().catch(e => console.warn('Elasticsearch ping failed, continuing without it:', e.message));
  } catch (error) {
    console.warn('Failed to initialize Elasticsearch client:', error);
  }
} else {
  console.log('ELASTIC_URL is not set. Running without Elasticsearch (graceful degradation).');
}

/**
 * Helper to safely execute Elasticsearch operations.
 * If Elasticsearch is not configured or fails, it will return null/undefined 
 * instead of crashing the app, allowing fallback to standard database queries.
 */
export async function withElastic<T>(
  operation: (client: Client) => Promise<T>,
  fallback?: T
): Promise<T | null> {
  if (!elasticClient) {
    return fallback ?? null;
  }
  
  try {
    return await operation(elasticClient);
  } catch (error) {
    console.error('Elasticsearch operation failed:', error);
    return fallback ?? null;
  }
}

export { elasticClient };
