import { elasticClient, withElastic } from './elastic';
import { prisma } from './prisma';
import { decryptDeterministic } from './encryption';

const VPS_INDEX = 'masdika-vps';

/**
 * Initializes the Elasticsearch index for VPS with proper mappings for search
 */
export async function initializeElasticIndices() {
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: VPS_INDEX });
    if (!exists) {
      await client.indices.create({
        index: VPS_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              hostname: { type: 'text', analyzer: 'standard' },
              vmid: { type: 'keyword' },
              node: { type: 'keyword' },
              status: { type: 'keyword' },
              userEmail: { type: 'text', analyzer: 'simple' },
              userName: { type: 'text', analyzer: 'simple' },
              ips: { type: 'keyword' }
            }
          }
        }
      });
      console.log(`[Elasticsearch] Index ${VPS_INDEX} created.`);
    }
  });
}

/**
 * Syncs a single VPS record to Elasticsearch
 */
export async function syncVpsToElastic(vpsId: number) {
  const vps = await prisma.vpsService.findUnique({
    where: { id: vpsId },
    include: {
      user: true,
      assignedIps: true
    }
  });

  if (!vps) {
    // Delete from ES if it was removed from DB
    await withElastic(async (client) => {
      await client.delete({
        index: VPS_INDEX,
        id: vpsId.toString(),
      }).catch(e => {
        if (e.meta?.statusCode !== 404) console.error(e);
      });
    });
    return;
  }

  const rawEmail = vps.user.email || "";
  const email = decryptDeterministic(rawEmail) || rawEmail;
  const rawName = vps.user.name || "";
  const name = decryptDeterministic(rawName) || rawName;

  const doc = {
    id: vps.id,
    hostname: vps.hostname,
    vmid: vps.vmid?.toString() || "",
    node: vps.node,
    status: vps.status,
    userEmail: email,
    userName: name,
    ips: vps.assignedIps.map(ip => ip.ipAddress)
  };

  await withElastic(async (client) => {
    await client.index({
      index: VPS_INDEX,
      id: vps.id.toString(),
      document: doc
    });
  });
}

/**
 * Searches VPS in Elasticsearch
 */
export async function searchVpsElastic(query: string) {
  return await withElastic(async (client) => {
    const result = await client.search({
      index: VPS_INDEX,
      body: {
        query: {
          multi_match: {
            query: query,
            fields: ['hostname^3', 'userEmail^2', 'userName', 'vmid', 'ips'],
            fuzziness: 'AUTO'
          }
        },
        size: 50
      }
    });
    
    // Map hits to IDs
    return result.hits.hits.map((hit: any) => parseInt(hit._id));
  }, null);
}

export const CUSTOMER_INDEX = 'masdika-customers';

/**
 * Initializes the Elasticsearch index for Customers with proper mappings for search
 */
export async function initializeCustomerElasticIndex() {
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: CUSTOMER_INDEX });
    if (!exists) {
      await client.indices.create({
        index: CUSTOMER_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              email: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              name: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              isSuspended: { type: 'boolean' },
              balance: { type: 'integer' },
              lastActive: { type: 'date' },
              createdAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`[Elasticsearch] Index ${CUSTOMER_INDEX} created.`);
    }
  });
}

/**
 * Syncs a single customer record to Elasticsearch
 */
export async function syncCustomerToElastic(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isSuspended: true,
      balance: true,
      lastActive: true,
      createdAt: true
    }
  });

  if (!user || user.role !== 'USER') {
    // If deleted or not a customer, delete from ES
    await withElastic(async (client) => {
      await client.delete({
        index: CUSTOMER_INDEX,
        id: userId.toString(),
      }).catch(e => {
        if (e.meta?.statusCode !== 404) console.error(e);
      });
    });
    return;
  }

  const email = decryptDeterministic(user.email) || user.email;
  const name = user.name ? (decryptDeterministic(user.name) || user.name) : '';

  const doc = {
    id: user.id,
    email,
    name,
    isSuspended: user.isSuspended,
    balance: user.balance,
    lastActive: user.lastActive,
    createdAt: user.createdAt
  };

  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: CUSTOMER_INDEX });
    if (!exists) {
      await initializeCustomerElasticIndex();
    }

    await client.index({
      index: CUSTOMER_INDEX,
      id: user.id.toString(),
      document: doc
    });
  });
}

/**
 * Searches Customers in Elasticsearch
 */
export async function searchCustomersElastic(
  query: string,
  options?: { isSuspended?: boolean; limit?: number }
): Promise<number[] | null> {
  return await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: CUSTOMER_INDEX });
    if (!exists) {
      return null;
    }

    const must: any[] = [];
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: ['name^3', 'email^3', 'id'],
          fuzziness: 'AUTO',
          prefix_length: 1
        }
      });
    }

    const filter: any[] = [];
    if (options?.isSuspended !== undefined) {
      filter.push({ term: { isSuspended: options.isSuspended } });
    }

    const result = await client.search({
      index: CUSTOMER_INDEX,
      body: {
        query: must.length || filter.length ? {
          bool: {
            ...(must.length ? { must } : {}),
            ...(filter.length ? { filter } : {})
          }
        } : { match_all: {} },
        sort: [{ createdAt: { order: 'desc' } }],
        size: options?.limit || 100
      }
    });

    return result.hits.hits.map((hit: any) => hit._source ? hit._source.id : parseInt(hit._id, 10));
  }, null);
}
