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


export const TICKET_INDEX = 'masdika-tickets';

/**
 * Initializes the Elasticsearch index for Support Tickets with proper mappings for search
 */
export async function initializeTicketElasticIndex() {
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: TICKET_INDEX });
    if (!exists) {
      await client.indices.create({
        index: TICKET_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              ticketId: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              userId: { type: 'integer' },
              userName: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              userEmail: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              service: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              priority: { type: 'keyword' },
              status: { type: 'keyword' },
              message: { type: 'text', analyzer: 'standard' },
              isReadByAdmin: { type: 'boolean' },
              isReadByUser: { type: 'boolean' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`[Elasticsearch] Index ${TICKET_INDEX} created.`);
    }
  });
}

/**
 * Syncs a single SupportTicket record to Elasticsearch
 */
export async function syncTicketToElastic(ticketIdOrId: number | string) {
  const where = typeof ticketIdOrId === 'number' 
    ? { id: ticketIdOrId } 
    : { ticketId: ticketIdOrId };

  const ticket = await prisma.supportTicket.findUnique({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      messages: {
        select: { message: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  if (!ticket) {
    // If ticket was deleted, remove from ES
    await withElastic(async (client) => {
      if (typeof ticketIdOrId === 'number') {
        await client.delete({
          index: TICKET_INDEX,
          id: ticketIdOrId.toString()
        }).catch(e => {
          if (e.meta?.statusCode !== 404) console.error(e);
        });
      }
    });
    return;
  }

  const rawEmail = ticket.user?.email || "";
  let email = rawEmail;
  if (rawEmail.startsWith('enc:')) {
    try {
      email = decryptDeterministic(rawEmail);
    } catch {
      email = rawEmail;
    }
  }
  const rawName = ticket.user?.name || "";
  let name = rawName;
  if (rawName.startsWith('enc:')) {
    try {
      name = decryptDeterministic(rawName);
    } catch {
      name = rawName;
    }
  }

  const messageText = ticket.messages?.map((m: any) => m.message).join(' ') || '';

  const doc = {
    id: ticket.id,
    ticketId: ticket.ticketId,
    userId: ticket.userId,
    userName: name,
    userEmail: email,
    subject: ticket.subject,
    service: ticket.service || '',
    priority: ticket.priority,
    status: ticket.status,
    message: messageText,
    isReadByAdmin: ticket.isReadByAdmin,
    isReadByUser: ticket.isReadByUser,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt
  };

  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: TICKET_INDEX });
    if (!exists) {
      await initializeTicketElasticIndex();
    }

    await client.index({
      index: TICKET_INDEX,
      id: ticket.id.toString(),
      document: doc
    });
  });
}

/**
 * Bulk syncs all tickets to Elasticsearch
 */
export async function syncAllTicketsToElastic(batchSize = 250): Promise<{ count: number }> {
  let count = 0;
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: TICKET_INDEX });
    if (!exists) {
      await initializeTicketElasticIndex();
    }

    let cursor: number | undefined = undefined;
    while (true) {
      const tickets: any[] = await prisma.supportTicket.findMany({
        take: batchSize,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          messages: {
            select: { message: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });

      if (tickets.length === 0) break;

      const operations = tickets.flatMap((t: any) => {
        const rawEmail = t.user?.email || "";
        let email = rawEmail;
        if (rawEmail.startsWith('enc:')) {
          try {
            email = decryptDeterministic(rawEmail);
          } catch {
            email = rawEmail;
          }
        }
        const rawName = t.user?.name || "";
        let name = rawName;
        if (rawName.startsWith('enc:')) {
          try {
            name = decryptDeterministic(rawName);
          } catch {
            name = rawName;
          }
        }

        const messageText = t.messages?.map((m: any) => m.message).join(' ') || '';

        const doc = {
          id: t.id,
          ticketId: t.ticketId,
          userId: t.userId,
          userName: name,
          userEmail: email,
          subject: t.subject,
          service: t.service || '',
          priority: t.priority,
          status: t.status,
          message: messageText,
          isReadByAdmin: t.isReadByAdmin,
          isReadByUser: t.isReadByUser,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        };

        return [
          { index: { _index: TICKET_INDEX, _id: t.id.toString() } },
          doc
        ];
      });

      if (operations.length > 0) {
        await client.bulk({ refresh: true, operations });
        count += tickets.length;
      }

      cursor = tickets[tickets.length - 1].id;
      if (tickets.length < batchSize) break;
    }
  });

  return { count };
}

/**
 * Searches Tickets in Elasticsearch
 */
export async function searchTicketsElastic(
  query: string,
  options?: { userId?: number; status?: string; limit?: number }
): Promise<number[] | null> {
  return await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: TICKET_INDEX });
    if (!exists) {
      return null;
    }

    const must: any[] = [];
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'ticketId^5',
            'subject^4',
            'userName^3',
            'userEmail^3',
            'service^2',
            'message^2',
            'priority'
          ],
          fuzziness: 'AUTO',
          prefix_length: 1
        }
      });
    }

    const filter: any[] = [];
    if (options?.userId !== undefined) {
      filter.push({ term: { userId: options.userId } });
    }
    if (options?.status && options.status !== 'all') {
      filter.push({ term: { status: options.status } });
    }

    const result = await client.search({
      index: TICKET_INDEX,
      body: {
        query: must.length || filter.length ? {
          bool: {
            ...(must.length ? { must } : {}),
            ...(filter.length ? { filter } : {})
          }
        } : { match_all: {} },
        sort: [{ updatedAt: { order: 'desc' } }],
        size: options?.limit || 100
      }
    });

    return result.hits.hits.map((hit: any) => hit._source ? hit._source.id : parseInt(hit._id, 10));
  }, null);
}


export const MEDIA_INDEX = 'masdika-media';

/**
 * Initializes the Elasticsearch index for SecureMedia with proper mappings for search
 */
export async function initializeMediaElasticIndex() {
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: MEDIA_INDEX });
    if (!exists) {
      await client.indices.create({
        index: MEDIA_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              filename: { type: 'keyword' },
              originalName: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              mimeType: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              size: { type: 'long' },
              folderPath: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              isFolder: { type: 'boolean' },
              isPinned: { type: 'boolean' },
              isPublic: { type: 'boolean' },
              token: { type: 'keyword' },
              expiresAt: { type: 'date' },
              userId: { type: 'integer' },
              userName: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              userEmail: { type: 'text', analyzer: 'standard', fields: { keyword: { type: 'keyword' } } },
              isAdminMedia: { type: 'boolean' },
              createdAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`[Elasticsearch] Index ${MEDIA_INDEX} created.`);
    }
  });
}

/**
 * Syncs a single SecureMedia item to Elasticsearch
 */
export async function syncMediaToElastic(mediaId: number) {
  const media = await prisma.secureMedia.findUnique({
    where: { id: mediaId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  if (!media) {
    // If deleted, remove from ES
    await withElastic(async (client) => {
      await client.delete({
        index: MEDIA_INDEX,
        id: mediaId.toString()
      }).catch(e => {
        if (e.meta?.statusCode !== 404) console.error(e);
      });
    });
    return;
  }

  const rawEmail = media.user?.email || "";
  let email = rawEmail;
  if (rawEmail.startsWith('enc:')) {
    try {
      email = decryptDeterministic(rawEmail);
    } catch {
      email = rawEmail;
    }
  }
  const rawName = media.user?.name || "";
  let name = rawName;
  if (rawName.startsWith('enc:')) {
    try {
      name = decryptDeterministic(rawName);
    } catch {
      name = rawName;
    }
  }

  const isAdminMedia = !media.userId || media.user?.role === 'ADMIN';

  const doc = {
    id: media.id,
    filename: media.filename,
    originalName: media.originalName,
    mimeType: media.mimeType,
    size: media.size,
    folderPath: media.folderPath,
    isFolder: media.isFolder,
    isPinned: media.isPinned,
    isPublic: media.isPublic,
    token: media.token,
    expiresAt: media.expiresAt,
    userId: media.userId,
    userName: name,
    userEmail: email,
    isAdminMedia,
    createdAt: media.createdAt
  };

  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: MEDIA_INDEX });
    if (!exists) {
      await initializeMediaElasticIndex();
    }

    await client.index({
      index: MEDIA_INDEX,
      id: media.id.toString(),
      document: doc
    });
  });
}

/**
 * Bulk syncs all media items to Elasticsearch
 */
export async function syncAllMediaToElastic(batchSize = 250): Promise<{ count: number }> {
  let count = 0;
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: MEDIA_INDEX });
    if (!exists) {
      await initializeMediaElasticIndex();
    }

    let cursor: number | undefined = undefined;
    while (true) {
      const items: any[] = await prisma.secureMedia.findMany({
        take: batchSize,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } }
        }
      });

      if (items.length === 0) break;

      const operations = items.flatMap((m: any) => {
        const rawEmail = m.user?.email || "";
        let email = rawEmail;
        if (rawEmail.startsWith('enc:')) {
          try {
            email = decryptDeterministic(rawEmail);
          } catch {
            email = rawEmail;
          }
        }
        const rawName = m.user?.name || "";
        let name = rawName;
        if (rawName.startsWith('enc:')) {
          try {
            name = decryptDeterministic(rawName);
          } catch {
            name = rawName;
          }
        }

        const isAdminMedia = !m.userId || m.user?.role === 'ADMIN';

        const doc = {
          id: m.id,
          filename: m.filename,
          originalName: m.originalName,
          mimeType: m.mimeType,
          size: m.size,
          folderPath: m.folderPath,
          isFolder: m.isFolder,
          isPinned: m.isPinned,
          isPublic: m.isPublic,
          token: m.token,
          expiresAt: m.expiresAt,
          userId: m.userId,
          userName: name,
          userEmail: email,
          isAdminMedia,
          createdAt: m.createdAt
        };

        return [
          { index: { _index: MEDIA_INDEX, _id: m.id.toString() } },
          doc
        ];
      });

      if (operations.length > 0) {
        await client.bulk({ refresh: true, operations });
        count += items.length;
      }

      cursor = items[items.length - 1].id;
      if (items.length < batchSize) break;
    }
  });

  return { count };
}

/**
 * Searches Media in Elasticsearch
 */
export async function searchMediaElastic(
  query: string,
  options?: { folderPath?: string; isAdminMedia?: boolean; userId?: number; limit?: number }
): Promise<number[] | null> {
  return await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: MEDIA_INDEX });
    if (!exists) {
      return null;
    }

    const must: any[] = [];
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'originalName^6',
            'token^4',
            'folderPath^2',
            'mimeType^2',
            'userName^2',
            'userEmail^2'
          ],
          fuzziness: 'AUTO',
          prefix_length: 1
        }
      });
    }

    const filter: any[] = [];
    if (options?.isAdminMedia) {
      filter.push({ term: { isAdminMedia: true } });
    }
    if (options?.userId !== undefined) {
      filter.push({ term: { userId: options.userId } });
    }
    if (options?.folderPath && options.folderPath !== '/') {
      filter.push({
        bool: {
          should: [
            { term: { "folderPath.keyword": options.folderPath } },
            { prefix: { "folderPath.keyword": `${options.folderPath}/` } }
          ],
          minimum_should_match: 1
        }
      });
    }

    const result = await client.search({
      index: MEDIA_INDEX,
      body: {
        query: must.length || filter.length ? {
          bool: {
            ...(must.length ? { must } : {}),
            ...(filter.length ? { filter } : {})
          }
        } : { match_all: {} },
        sort: [
          { _score: { order: 'desc' } },
          { isPinned: { order: 'desc' } },
          { isFolder: { order: 'desc' } },
          { createdAt: { order: 'desc' } }
        ],
        size: options?.limit || 100
      }
    });

    return result.hits.hits.map((hit: any) => hit._source ? hit._source.id : parseInt(hit._id, 10));
  }, null);
}


// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC WEBSITE MEDIA / IMAGES ELASTICSEARCH INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

export const PUBLIC_IMAGE_INDEX = 'masdika-public-images';

export interface ElasticPublicImage {
  id: string;
  name: string;
  url: string;
  folder: string;
  size: number;
  createdAt: string;
}

/**
 * Initializes the Elasticsearch index for Public Website Images
 */
export async function initializePublicImageElasticIndex() {
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: PUBLIC_IMAGE_INDEX });
    if (!exists) {
      await client.indices.create({
        index: PUBLIC_IMAGE_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              name: {
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              url: { type: 'keyword' },
              folder: { type: 'keyword' },
              size: { type: 'long' },
              createdAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`[Elasticsearch] Index ${PUBLIC_IMAGE_INDEX} created.`);
    }
  });
}

/**
 * Syncs a single Public Image to Elasticsearch
 */
export async function syncPublicImageToElastic(item: {
  name: string;
  url: string;
  size: number;
  createdAt: Date | string;
}) {
  const cleanId = Buffer.from(item.url).toString('base64url');
  const folder = item.url.startsWith('/uploads/')
    ? item.url.replace(/^\/uploads\//, '').split('/')[0] || 'uploads'
    : 'uploads';

  const doc: ElasticPublicImage = {
    id: cleanId,
    name: item.name,
    url: item.url,
    folder,
    size: item.size,
    createdAt: new Date(item.createdAt).toISOString()
  };

  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: PUBLIC_IMAGE_INDEX });
    if (!exists) {
      await initializePublicImageElasticIndex();
    }

    await client.index({
      index: PUBLIC_IMAGE_INDEX,
      id: cleanId,
      document: doc
    });
  });
}

/**
 * Deletes a Public Image from Elasticsearch by url or filename
 */
export async function removePublicImageFromElastic(urlOrFilename: string) {
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: PUBLIC_IMAGE_INDEX });
    if (!exists) return;

    if (urlOrFilename.startsWith('/uploads/')) {
      const cleanId = Buffer.from(urlOrFilename).toString('base64url');
      await client.delete({
        index: PUBLIC_IMAGE_INDEX,
        id: cleanId
      }).catch((e: any) => {
        if (e.meta?.statusCode !== 404) console.warn('[ES Delete Image Warning]:', e.message);
      });
    } else {
      await client.deleteByQuery({
        index: PUBLIC_IMAGE_INDEX,
        body: {
          query: {
            bool: {
              should: [
                { term: { "name.keyword": urlOrFilename } },
                { wildcard: { url: `*${urlOrFilename}*` } }
              ]
            }
          }
        }
      }).catch(() => {});
    }
  });
}

/**
 * Bulk syncs all public images to Elasticsearch
 */
export async function syncAllPublicImagesToElastic(items: Array<{
  name: string;
  url: string;
  size: number;
  createdAt: Date | string;
}>): Promise<{ count: number }> {
  let count = 0;
  await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: PUBLIC_IMAGE_INDEX });
    if (!exists) {
      await initializePublicImageElasticIndex();
    }

    if (items.length === 0) return;

    const operations = items.flatMap((item) => {
      const cleanId = Buffer.from(item.url).toString('base64url');
      const folder = item.url.startsWith('/uploads/')
        ? item.url.replace(/^\/uploads\//, '').split('/')[0] || 'uploads'
        : 'uploads';

      const doc: ElasticPublicImage = {
        id: cleanId,
        name: item.name,
        url: item.url,
        folder,
        size: item.size,
        createdAt: new Date(item.createdAt).toISOString()
      };

      return [
        { index: { _index: PUBLIC_IMAGE_INDEX, _id: cleanId } },
        doc
      ];
    });

    if (operations.length > 0) {
      await client.bulk({ refresh: true, operations });
      count = items.length;
    }
  });

  return { count };
}

/**
 * Searches Public Images in Elasticsearch using fuzzy, wildcard, and prefix matching
 */
export async function searchPublicImagesElastic(
  query: string,
  options?: { limit?: number }
): Promise<Array<{ name: string; url: string; size: number; createdAt: string }> | null> {
  return await withElastic(async (client) => {
    const exists = await client.indices.exists({ index: PUBLIC_IMAGE_INDEX });
    if (!exists) {
      return null;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      const allRes = await client.search({
        index: PUBLIC_IMAGE_INDEX,
        body: {
          query: { match_all: {} },
          sort: [{ createdAt: { order: 'desc' } }],
          size: options?.limit || 100
        }
      });
      return (allRes.hits.hits || []).map((hit: any) => ({
        name: hit._source.name,
        url: hit._source.url,
        size: hit._source.size || 0,
        createdAt: hit._source.createdAt
      }));
    }

    const cleanLower = trimmed.toLowerCase();
    const result = await client.search({
      index: PUBLIC_IMAGE_INDEX,
      body: {
        query: {
          bool: {
            should: [
              // 1. Exact match on filename keyword (highest score)
              { term: { "name.keyword": { value: trimmed, boost: 10 } } },
              // 2. Fuzzy match across name and folder
              {
                multi_match: {
                  query: trimmed,
                  fields: ['name^6', 'folder^2'],
                  fuzziness: 'AUTO',
                  prefix_length: 1,
                  boost: 5
                }
              },
              // 3. Substring wildcard match for partial filename search
              { wildcard: { name: { value: `*${cleanLower}*`, boost: 3 } } },
              // 4. Prefix match
              { prefix: { name: { value: cleanLower, boost: 2 } } }
            ],
            minimum_should_match: 1
          }
        },
        sort: [
          { _score: { order: 'desc' } },
          { createdAt: { order: 'desc' } }
        ],
        size: options?.limit || 100
      }
    });

    return (result.hits.hits || []).map((hit: any) => ({
      name: hit._source.name,
      url: hit._source.url,
      size: hit._source.size || 0,
      createdAt: hit._source.createdAt
    }));
  }, null);
}
