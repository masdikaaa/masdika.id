import { elasticClient, withElastic } from './elastic';
import { prisma } from './prisma';
import { decryptDeterministic } from './encryption';
import { standardizeInvoiceNumber } from './invoice-standardizer';

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

export const INVOICE_INDEX = 'masdika-invoices';

/**
 * Initializes the Elasticsearch index for Invoices with proper mappings for search
 */
export async function initializeInvoiceElasticIndex() {
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: INVOICE_INDEX });
    if (!exists) {
      await client.indices.create({
        index: INVOICE_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              invoiceNumber: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              merchantOrderId: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              status: { type: 'keyword' },
              paymentMethod: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              type: { type: 'keyword' },
              amount: { type: 'integer' },
              userName: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              userEmail: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              planTitle: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              vpsHostname: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              createdAt: { type: 'date' },
              paidAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`[Elasticsearch] Index ${INVOICE_INDEX} created.`);
    }
  });
}

/**
 * Syncs a single invoice record to Elasticsearch
 */
export async function syncInvoiceToElastic(invoiceId: number) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      user: { select: { name: true, email: true } },
      subscription: { include: { plan: true } },
      vpsService: { select: { hostname: true } }
    }
  });

  if (!invoice) {
    // If deleted or not found, remove from ES
    await withElastic(async (client) => {
      await client.delete({
        index: INVOICE_INDEX,
        id: invoiceId.toString(),
      }).catch(e => {
        if (e.meta?.statusCode !== 404) console.error(e);
      });
    });
    return;
  }

  const rawEmail = invoice.user?.email || "";
  let email = rawEmail;
  if (rawEmail.startsWith('enc:')) {
    try {
      email = decryptDeterministic(rawEmail);
    } catch {
      email = rawEmail;
    }
  }
  const rawName = invoice.user?.name || "";
  let name = rawName;
  if (rawName.startsWith('enc:')) {
    try {
      name = decryptDeterministic(rawName);
    } catch {
      name = rawName;
    }
  }

  const doc = {
    id: invoice.id,
    invoiceNumber: standardizeInvoiceNumber(invoice.invoiceNumber),
    merchantOrderId: invoice.merchantOrderId || "",
    status: invoice.status,
    paymentMethod: invoice.paymentMethod || "",
    type: invoice.type || "SUBSCRIPTION",
    amount: invoice.amount || 0,
    userName: name,
    userEmail: email,
    planTitle: invoice.subscription?.plan?.name || "",
    vpsHostname: invoice.vpsService?.hostname || "",
    createdAt: invoice.createdAt,
    paidAt: invoice.paidAt
  };

  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: INVOICE_INDEX });
    if (!exists) {
      await initializeInvoiceElasticIndex();
    }

    await client.index({
      index: INVOICE_INDEX,
      id: invoice.id.toString(),
      document: doc
    });
  });
}

/**
 * Bulk syncs all invoices to Elasticsearch
 */
export async function syncAllInvoicesToElastic(batchSize = 250): Promise<{ count: number }> {
  let count = 0;
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: INVOICE_INDEX });
    if (!exists) {
      await initializeInvoiceElasticIndex();
    }

    let cursor: number | undefined = undefined;
    while (true) {
      const invoices: any[] = await prisma.invoice.findMany({
        take: batchSize,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
        include: {
          user: { select: { name: true, email: true } },
          subscription: { include: { plan: true } },
          vpsService: { select: { hostname: true } }
        }
      });

      if (invoices.length === 0) break;

      const operations = invoices.flatMap((inv: any) => {
        const rawEmail = inv.user?.email || "";
        let email = rawEmail;
        if (rawEmail.startsWith('enc:')) {
          try {
            email = decryptDeterministic(rawEmail);
          } catch {
            email = rawEmail;
          }
        }
        const rawName = inv.user?.name || "";
        let name = rawName;
        if (rawName.startsWith('enc:')) {
          try {
            name = decryptDeterministic(rawName);
          } catch {
            name = rawName;
          }
        }

        const doc = {
          id: inv.id,
          invoiceNumber: standardizeInvoiceNumber(inv.invoiceNumber),
          merchantOrderId: inv.merchantOrderId || "",
          status: inv.status,
          paymentMethod: inv.paymentMethod || "",
          type: inv.type || "SUBSCRIPTION",
          amount: inv.amount || 0,
          userName: name,
          userEmail: email,
          planTitle: inv.subscription?.plan?.name || "",
          vpsHostname: inv.vpsService?.hostname || "",
          createdAt: inv.createdAt,
          paidAt: inv.paidAt
        };

        return [
          { index: { _index: INVOICE_INDEX, _id: inv.id.toString() } },
          doc
        ];
      });

      if (operations.length > 0) {
        await client.bulk({ refresh: true, operations });
        count += invoices.length;
      }

      cursor = invoices[invoices.length - 1].id;
      if (invoices.length < batchSize) break;
    }
  });

  return { count };
}

/**
 * Searches Invoices in Elasticsearch
 */
export async function searchInvoicesElastic(
  query: string,
  options?: { status?: string; limit?: number }
): Promise<number[] | null> {
  return await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: INVOICE_INDEX });
    if (!exists) {
      return null;
    }

    const must: any[] = [];
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'invoiceNumber^4',
            'merchantOrderId^3',
            'userName^3',
            'userEmail^3',
            'vpsHostname^2',
            'planTitle^2',
            'paymentMethod'
          ],
          fuzziness: 'AUTO',
          prefix_length: 1
        }
      });
    }

    const filter: any[] = [];
    if (options?.status && options.status !== 'all') {
      if (options.status === 'FAILED') {
        filter.push({
          terms: { status: ['FAILED', 'CANCELED', 'EXPIRED'] }
        });
      } else {
        filter.push({
          term: { status: options.status }
        });
      }
    }

    const result = await client.search({
      index: INVOICE_INDEX,
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
