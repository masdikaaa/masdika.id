export type InvoiceDisplayCategory =
  | 'TOP_UP'
  | 'AI_GATEWAY'
  | 'REWARD'
  | 'ADMIN'
  | 'VPS'
  | 'IP_RESERVATION'
  | 'OBJECT_STORAGE'
  | 'MANAGED_APP'
  | 'MANAGED_DATABASE'
  | 'APP_PLATFORM'
  | 'SUBSCRIPTION'
  | 'OTHER';

export interface InvoiceSpecBadge {
  kind: 'cpu' | 'ram' | 'disk' | 'backup' | 'ip' | 'engine' | 'plan';
  label: string;
}

export interface InvoiceDisplayInfo {
  category: InvoiceDisplayCategory;
  title: string;
  subtitle: string;
  description: string;
  billingTypeLabel: string;
  specs: InvoiceSpecBadge[];
  parsedDetails: Record<string, any> | null;
}

export function parseInvoiceDetails(details?: string | null): Record<string, any> | null {
  if (!details || typeof details !== 'string') return null;
  try {
    const parsed = JSON.parse(details);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function formatServiceDisplayName(serviceCode?: string | null): string {
  const s = (serviceCode || '').toUpperCase().trim();
  if (!s) return 'Cloud Service';
  if (s === 'CDN' || s === 'FILE_CDN') return 'File CDN';
  if (s === 'OBJECT_STORAGE' || s === 'S3') return 'Object Storage';
  if (s === 'MANAGED_APP' || s === 'APPS') return 'Managed App';
  if (s === 'APP_PLATFORM') return 'App Platform';
  if (s === 'MANAGED_DATABASE' || s === 'DATABASE') return 'Managed Database';
  if (s === 'VPS') return 'Cloud VPS';
  return s
    .split(/[_\s]+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

function formatMemoryLabel(memoryMb?: number | null, ramGb?: number | null): string | null {
  if (typeof ramGb === 'number' && ramGb > 0) return `${ramGb} GB RAM`;
  if (typeof memoryMb === 'number' && memoryMb > 0) {
    if (memoryMb >= 1024 && memoryMb % 1024 === 0) {
      return `${memoryMb / 1024} GB RAM`;
    }
    return `${memoryMb} MB RAM`;
  }
  return null;
}

function getDiskBadgeText(diskGb?: number | null, diskType?: string | null): string | null {
  if (!diskGb) return null;
  const t = (diskType || '').toUpperCase().trim();
  if (t === 'HDD') return `${diskGb} GB HDD`;
  if (t === 'SSD') return `${diskGb} GB SSD`;
  return `${diskGb} GB Storage`;
}

function isPaygInvoice(invoice: any, details: Record<string, any> | null): boolean {
  if (details?.billingMode?.toUpperCase?.() === 'PAYG') return true;
  if (invoice.vpsService?.billingMode === 'PAYG') return true;
  return ['PAYG_FIRST_HOUR', 'PAYG_RUNNING', 'PAYG_COMPLETED'].includes(invoice.reference || '');
}

export function getInvoiceDisplayInfo(invoice: any): InvoiceDisplayInfo {
  const details = parseInvoiceDetails(invoice?.details);
  const type = (invoice?.type || '').toUpperCase();
  const ref = (invoice?.reference || '').toUpperCase();
  const invNum = (invoice?.invoiceNumber || '').toUpperCase();
  const paymentMethod = (invoice?.paymentMethod || '').toUpperCase();
  const payg = isPaygInvoice(invoice, details);

  if (type === 'AI_CREDIT' || invNum.startsWith('INV-AI-')) {
    const aiCredit = Number(details?.aiCreditAmount || invoice?.amount || 0);
    const fee = Number(details?.adminFeeRp || 0);
    const isAuto = details?.mode === 'AUTO_TOPUP' || ref === 'AI_CREDIT_AUTO_TOPUP';
    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const specs: InvoiceSpecBadge[] = [
      { kind: 'plan', label: `AI Credit: ${fmt(aiCredit)}` },
    ];
    if (fee > 0) {
      specs.push({ kind: 'ip', label: `Platform Fee: ${fmt(fee)}` });
    }
    return {
      category: 'AI_GATEWAY',
      title: 'AI Gateway Credit',
      subtitle: isAuto ? 'Auto Top-Up from Masdika Wallet' : 'Manual AI Credit Purchase',
      description: `Dedicated AI Gateway credit (${fmt(aiCredit)}${fee > 0 ? ` + ${fmt(fee)} platform fee` : ''}) for OpenAI, Responses & Anthropic API usage.`,
      billingTypeLabel: 'One-Time Credit',
      specs,
      parsedDetails: details,
    };
  }

  if (type === 'TOP_UP') {
    return {
      category: 'TOP_UP',
      title: 'Account Balance Top Up',
      subtitle: 'Wallet Credit',
      description: 'Addition to account wallet balance for seamless transactions across Masdika services.',
      billingTypeLabel: 'One-Time Credit',
      specs: [],
      parsedDetails: details,
    };
  }

  if (type === 'REWARD' || paymentMethod === 'REWARD' || invNum.startsWith('RWD-')) {
    const desc = details?.description || 'Promotional wallet reward credit';
    return {
      category: 'REWARD',
      title: 'Promo Reward Credit',
      subtitle: desc,
      description: `${desc}. Credited directly to your Masdika account balance.`,
      billingTypeLabel: 'Promo Reward',
      specs: [],
      parsedDetails: details,
    };
  }

  if (paymentMethod === 'ADMIN_CREDIT' || paymentMethod === 'ADMIN_DEBIT' || type === 'ADMIN_ADJUSTMENT') {
    const isDebit = paymentMethod === 'ADMIN_DEBIT';
    const desc = details?.reason || details?.description || (isDebit ? 'Administrative balance deduction' : 'Administrative balance credit');
    return {
      category: 'ADMIN',
      title: isDebit ? 'Balance Deduction (Admin)' : 'Balance Credit (Admin)',
      subtitle: desc,
      description: desc,
      billingTypeLabel: 'Adjustment',
      specs: [],
      parsedDetails: details,
    };
  }

  if (type === 'VPS' || type === 'VPS_UPGRADE' || (type === 'SUBSCRIPTION' && invoice?.vpsServiceId)) {
    const hostname = invoice?.vpsService?.hostname || details?.hostname || '';
    const isSettlement = type === 'SUBSCRIPTION' && invoice?.vpsServiceId;
    const isUpgrade = type === 'VPS_UPGRADE';

    const title = isSettlement
      ? `PAYG Final Settlement${hostname ? ` - ${hostname}` : ''}`
      : isUpgrade
        ? `Cloud VPS Upgrade${hostname ? ` - ${hostname}` : ''}`
        : `Cloud VPS${hostname ? ` - ${hostname}` : (payg ? ' (PAYG)' : ' Order')}`;

    const subtitle = isSettlement
      ? 'PAYG Final Settlement'
      : isUpgrade
        ? 'Specs Upgrade'
        : payg
          ? 'Pay-As-You-Go'
          : 'Flex Month';

    const description = isSettlement
      ? 'Final Pay-As-You-Go usage settlement for Cloud VPS instance.'
      : isUpgrade
        ? 'Prorated resource expansion and hardware allocation for existing VPS instance.'
        : payg
          ? 'Pay-As-You-Go Cloud VPS usage for this billing cycle.'
          : 'New Cloud VPS instance deployment and resource allocation.';

    const specs: InvoiceSpecBadge[] = [];
    if (invoice?.vpsService) {
      if (invoice.vpsService.cpuCores) specs.push({ kind: 'cpu', label: `${invoice.vpsService.cpuCores} vCPU` });
      if (invoice.vpsService.ramGb) specs.push({ kind: 'ram', label: `${invoice.vpsService.ramGb} GB RAM` });
      const diskLabel = getDiskBadgeText(invoice.vpsService.diskGb, invoice.vpsService.diskType);
      if (diskLabel) specs.push({ kind: 'disk', label: diskLabel });
      if (invoice.vpsService.backupGb > 0) specs.push({ kind: 'backup', label: `${invoice.vpsService.backupGb} GB Backup` });
      specs.push({ kind: 'ip', label: 'Dedicated IPv4' });
    } else if (details) {
      if (details.addedCpu > 0) specs.push({ kind: 'cpu', label: `+${details.addedCpu} vCPU` });
      else if (details.newCpu || details.cpu) specs.push({ kind: 'cpu', label: `${details.newCpu || details.cpu} vCPU` });

      if (details.addedRam > 0) specs.push({ kind: 'ram', label: `+${details.addedRam} GB RAM` });
      else if (details.newRam || details.ram) specs.push({ kind: 'ram', label: `${details.newRam || details.ram} GB RAM` });

      if (details.addedDisk > 0) specs.push({ kind: 'disk', label: `+${details.addedDisk} GB Disk` });
      else {
        const diskLabel = getDiskBadgeText(details.newDisk || details.disk, details.diskType || details.storageType);
        if (diskLabel) specs.push({ kind: 'disk', label: diskLabel });
      }

      if (details.addedBackup > 0) specs.push({ kind: 'backup', label: `+${details.addedBackup} GB Backup` });
      else if (details.newBackup !== undefined) specs.push({ kind: 'backup', label: `${details.newBackup} GB Backup` });

      if (details.addedIpv4 > 0) specs.push({ kind: 'ip', label: `+${details.addedIpv4} IPv4` });
      if (details.addedIpv6 > 0) specs.push({ kind: 'ip', label: `+${details.addedIpv6} IPv6` });
    }

    return {
      category: 'VPS',
      title,
      subtitle,
      description,
      billingTypeLabel: payg ? 'Hourly Metered' : 'Service Cycle',
      specs,
      parsedDetails: details,
    };
  }

  if (type === 'IP_RESERVATION') {
    const ipAddress = details?.ipAddress || 'Reserved IPv4';
    return {
      category: 'IP_RESERVATION',
      title: `Reserved IPv4 - ${ipAddress}`,
      subtitle: 'Dedicated Reserved IP',
      description: 'Premium high-reputation dedicated public IPv4 address reservation.',
      billingTypeLabel: payg ? 'Hourly Metered' : 'Service Cycle',
      specs: details?.ipAddress ? [{ kind: 'ip', label: `IP: ${details.ipAddress}` }] : [],
      parsedDetails: details,
    };
  }

  if (type === 'OBJECT_STORAGE' || invNum.startsWith('INV-S3-')) {
    const storageGb = details?.storageGb;
    const planLabel = details?.planName || (storageGb ? `${storageGb} GB` : '');
    const instanceName = details?.name || '';
    const pkgText = [planLabel, instanceName ? `(${instanceName})` : ''].filter(Boolean).join(' ');

    const specs: InvoiceSpecBadge[] = [];
    if (storageGb) specs.push({ kind: 'disk', label: `${storageGb} GB Object Storage` });
    else if (planLabel) specs.push({ kind: 'plan', label: planLabel });
    specs.push({ kind: 'ip', label: 'S3 Compatible API' });

    return {
      category: 'OBJECT_STORAGE',
      title: `Object Storage${pkgText ? ` • ${pkgText}` : ''}`,
      subtitle: payg ? 'Pay-As-You-Go' : 'Monthly Plan',
      description: `S3-compatible Object Storage bucket & IAM capacity allocation${planLabel ? ` (${planLabel} Plan)` : ''}${instanceName ? ` for instance "${instanceName}"` : ''}.`,
      billingTypeLabel: payg ? 'Hourly Metered' : 'Monthly Cycle',
      specs,
      parsedDetails: details,
    };
  }

  if (type === 'MANAGED_APP') {
    const appTitle = details?.appName || details?.appType || 'Application';
    const planLabel = details?.planName || '';
    const instanceName = details?.name || '';
    const pkgText = [
      appTitle,
      planLabel ? `(${planLabel})` : '',
      instanceName ? `- ${instanceName}` : '',
    ].filter(Boolean).join(' ');

    const specs: InvoiceSpecBadge[] = [];
    if (details?.cpuShares) specs.push({ kind: 'cpu', label: `${details.cpuShares} vCPU` });
    const ramLabel = formatMemoryLabel(details?.memoryMb, null);
    if (ramLabel) specs.push({ kind: 'ram', label: ramLabel });
    if (details?.storageGb) specs.push({ kind: 'disk', label: `${details.storageGb} GB Storage` });
    if (planLabel) specs.push({ kind: 'plan', label: `Plan: ${planLabel}` });

    return {
      category: 'MANAGED_APP',
      title: `Managed App • ${pkgText}`,
      subtitle: payg ? 'Pay-As-You-Go' : 'Monthly Plan',
      description: `Managed application deployment ${appTitle}${planLabel ? ` (${planLabel} Plan)` : ''}${instanceName ? ` — instance "${instanceName}"` : ''}.`,
      billingTypeLabel: payg ? 'Hourly Metered' : 'Monthly Cycle',
      specs,
      parsedDetails: details,
    };
  }

  if (type === 'APP_PLATFORM') {
    const buildType = details?.buildType || 'Web App';
    const planLabel = details?.planName || '';
    const instanceName = details?.name || '';
    const pkgText = [
      buildType,
      planLabel ? `(${planLabel})` : '',
      instanceName ? `- ${instanceName}` : '',
    ].filter(Boolean).join(' ');

    const specs: InvoiceSpecBadge[] = [];
    if (details?.cpuShares) specs.push({ kind: 'cpu', label: `${details.cpuShares} vCPU` });
    const ramLabel = formatMemoryLabel(details?.memoryMb, null);
    if (ramLabel) specs.push({ kind: 'ram', label: ramLabel });
    if (details?.storageGb) specs.push({ kind: 'disk', label: `${details.storageGb} GB SSD` });
    if (planLabel) specs.push({ kind: 'plan', label: `Plan: ${planLabel}` });

    return {
      category: 'APP_PLATFORM',
      title: `App Platform • ${pkgText}`,
      subtitle: payg ? 'Pay-As-You-Go' : 'Monthly Plan',
      description: `Git-to-Web PaaS deployment ${buildType}${planLabel ? ` (${planLabel} Plan)` : ''}${instanceName ? ` — app "${instanceName}"` : ''}.`,
      billingTypeLabel: payg ? 'Hourly Metered' : 'Monthly Cycle',
      specs,
      parsedDetails: details,
    };
  }

  if (type === 'MANAGED_DATABASE') {
    const dbEngine = details?.dbType || 'Database';
    const dbVersion = details?.version ? ` v${details.version}` : '';
    const planLabel = details?.planName || '';
    const instanceName = details?.name || '';
    const pkgText = [
      `${dbEngine}${dbVersion}`,
      planLabel ? `(${planLabel})` : '',
      instanceName ? `- ${instanceName}` : '',
    ].filter(Boolean).join(' ');

    const specs: InvoiceSpecBadge[] = [];
    if (details?.cpuShares) specs.push({ kind: 'cpu', label: `${details.cpuShares} vCPU` });
    const ramLabel = formatMemoryLabel(details?.memoryMb, null);
    if (ramLabel) specs.push({ kind: 'ram', label: ramLabel });
    if (details?.storageGb) specs.push({ kind: 'disk', label: `${details.storageGb} GB Storage` });
    if (dbEngine) specs.push({ kind: 'engine', label: `${dbEngine}${dbVersion}` });

    return {
      category: 'MANAGED_DATABASE',
      title: `Managed Database • ${pkgText}`,
      subtitle: payg ? 'Pay-As-You-Go' : 'Monthly Plan',
      description: `Managed ${dbEngine}${dbVersion} database cluster${planLabel ? ` (${planLabel} Plan)` : ''}${instanceName ? ` — instance "${instanceName}"` : ''}.`,
      billingTypeLabel: payg ? 'Hourly Metered' : 'Monthly Cycle',
      specs,
      parsedDetails: details,
    };
  }

  if (invoice?.subscription || type === 'SUBSCRIPTION') {
    const rawService = invoice?.subscription?.plan?.service || details?.service || 'CDN';
    const serviceName = formatServiceDisplayName(rawService);
    const planName = invoice?.subscription?.plan?.name || details?.planName || '';
    const planDesc = invoice?.subscription?.plan?.description || details?.description || '';
    const isUpgrade = ref.startsWith('UPGRADE:');

    const specs: InvoiceSpecBadge[] = [];
    if (planName) specs.push({ kind: 'plan', label: `${planName} Plan` });
    if (rawService.toUpperCase() === 'CDN') {
      specs.push({ kind: 'ip', label: 'Global Edge CDN' });
    }

    return {
      category: 'SUBSCRIPTION',
      title: `${serviceName}${planName ? ` • ${planName}` : ''}`,
      subtitle: isUpgrade ? 'Plan Upgrade' : payg ? 'Pay-As-You-Go' : 'Monthly Plan',
      description: planDesc || `${serviceName} subscription & resource quota${planName ? ` (${planName} Plan)` : ''}.`,
      billingTypeLabel: payg ? 'Hourly Metered' : 'Service Cycle',
      specs,
      parsedDetails: details,
    };
  }

  return {
    category: 'OTHER',
    title: details?.name || details?.planName || 'Masdika Cloud Service',
    subtitle: payg ? 'Pay-As-You-Go' : 'Cloud Service',
    description: details?.description || 'Cloud service subscription access and computing resource allowance.',
    billingTypeLabel: payg ? 'Hourly Metered' : 'Service Cycle',
    specs: [],
    parsedDetails: details,
  };
}
