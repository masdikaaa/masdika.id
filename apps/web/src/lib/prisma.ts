import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma3 = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const dbUrlString = process.env.DATABASE_URL;
if (!dbUrlString) {
  throw new Error('Please define the DATABASE_URL environment variable inside .env');
}

// Ensure the connection pool is not re-instantiated on every Next.js HMR
const pool = globalForPrisma3.pool ?? new Pool({ 
  connectionString: dbUrlString,
  max: parseInt(process.env.DB_CONNECTION_LIMIT || '50', 10),
});

const adapter = new PrismaPg(pool);

export const prisma = (
  globalForPrisma3.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }).$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          if (process.env.DATABASE_URL?.includes('dummy')) {
             if (operation === 'findMany') return []
             if (operation === 'findUnique') return null
             if (operation === 'findFirst') return null
             if (operation === 'count') return 0
             return null
          }
          return query(args)
        },
      },
    },
  })
) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma3.pool = pool;
  globalForPrisma3.prisma = prisma;
}