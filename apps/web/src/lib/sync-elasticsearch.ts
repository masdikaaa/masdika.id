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
