"use client";

import React from 'react';
import { 
  Terminal, 
  UploadCloud, 
  Wallet, 
  Network, 
  CodeXml, 
  Music, 
  PlaySquare, 
  Cloud, 
  Activity, 
  FileText, 
  Layers 
} from 'lucide-react';
import { SiKubernetes } from 'react-icons/si';
import { cn } from '@/lib/utils';

export function getInvoiceServiceIcon(serviceOrInvoice?: any, className = "w-4 h-4 shrink-0") {
  if (!serviceOrInvoice) return <Layers className={cn(className, "text-cyan-400")} />;

  // If passed an invoice or service object
  if (typeof serviceOrInvoice === 'object') {
    const inv = serviceOrInvoice;
    if (inv.type === 'TOP_UP') {
      return <Wallet className={cn(className, "text-emerald-400")} />;
    }
    if (inv.type === 'VPS' || inv.type === 'VPS_UPGRADE' || inv.vpsServiceId || inv.vpsService) {
      return <Terminal className={cn(className, "text-cyan-400")} />;
    }
    if (inv.type === 'IP_RESERVATION') {
      return <Network className={cn(className, "text-cyan-400")} />;
    }

    const s = (
      inv.subscription?.plan?.service || 
      inv.plan?.service || 
      inv.service || 
      ''
    ).toUpperCase();
    return getServiceIconByString(s, className);
  }

  // If passed a string
  return getServiceIconByString(String(serviceOrInvoice).toUpperCase(), className);
}

function getServiceIconByString(s: string, className = "w-4 h-4 shrink-0") {
  if (s.includes('VPS')) {
    return <Terminal className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('K3S') || s.includes('KUBERNETES')) {
    return <SiKubernetes className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('STORAGE') || s.includes('CDN')) {
    return <UploadCloud className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('TOP_UP') || s.includes('TOPUP') || s.includes('SALDO') || s.includes('WALLET')) {
    return <Wallet className={cn(className, "text-emerald-400")} />;
  }
  if (s.includes('IP_RESERVATION') || s.includes('RESERVED_IP') || s.includes('NETWORK')) {
    return <Network className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('SPOTIFY') || s.includes('MUSIC')) {
    return <Music className={cn(className, "text-green-400")} />;
  }
  if (s.includes('TIKTOK') || s.includes('YOUTUBE') || s.includes('VIDEO')) {
    return <PlaySquare className={cn(className, "text-rose-400")} />;
  }
  if (s.includes('BMKG') || s.includes('WEATHER')) {
    return <Cloud className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('EARTHQUAKE') || s.includes('QUAKE')) {
    return <Activity className={cn(className, "text-rose-400")} />;
  }
  if (s.includes('BLOG') || s.includes('TEXT')) {
    return <FileText className={cn(className, "text-amber-400")} />;
  }
  if (s.includes('API') || s.includes('RESELLER')) {
    return <CodeXml className={cn(className, "text-cyan-400")} />;
  }
  return <Layers className={cn(className, "text-cyan-400")} />;
}

export function InvoiceItemDescription({ invoice, isDark = true }: { invoice: any; isDark?: boolean }) {
  if (!invoice) return null;

  if (invoice.type === 'TOP_UP') {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {getInvoiceServiceIcon(invoice)}
          <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>
            Account Top Up
          </span>
        </div>
        <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>
          Saldo
        </span>
      </div>
    );
  }

  if (invoice.type === 'VPS' || invoice.type === 'VPS_UPGRADE') {
    const isPayg = invoice.vpsService?.billingMode === 'PAYG' || ['PAYG_FIRST_HOUR', 'PAYG_RUNNING', 'PAYG_COMPLETED'].includes(invoice.reference);
    const title = invoice.vpsService?.hostname 
      ? `${invoice.type === 'VPS_UPGRADE' ? 'VPS Upgrade' : 'Cloud VPS'} - ${invoice.vpsService.hostname}` 
      : (isPayg ? 'Cloud VPS (PAYG)' : 'Cloud VPS Order');
    
    let specsData: any = null;
    if (invoice.details) {
      try {
        specsData = JSON.parse(invoice.details);
      } catch (e) {}
    }

    const hasSpecs = specsData && (
      specsData.type === 'PAYG_MONTHLY_USAGE' || 
      specsData.newCpu || specsData.cpu || 
      specsData.newRam || specsData.ram || 
      specsData.newDisk || specsData.disk || 
      specsData.newBackup !== undefined ||
      specsData.addedCpu || specsData.addedRam || specsData.addedDisk || specsData.addedBackup ||
      specsData.addedIpv4 || specsData.addedIpv6
    );

    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {getInvoiceServiceIcon(invoice)}
          <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>
            {title}
          </span>
        </div>
        <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>
          {isPayg ? 'Pay-As-You-Go' : 'Flex Month'}
        </span>
        {hasSpecs && (
          <div className="ml-[24px] mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-1.5 rounded-lg border border-cyan-500/20 w-fit">
            {specsData.type === 'PAYG_MONTHLY_USAGE' && <span>Monthly Usage</span>}
            {(specsData.addedCpu > 0) ? <span>CPU: +{specsData.addedCpu} Cores</span> : (specsData.newCpu || specsData.cpu) ? <span>CPU: {specsData.newCpu || specsData.cpu} Cores</span> : null}
            {(specsData.addedRam > 0) ? <span>RAM: +{specsData.addedRam}GB</span> : (specsData.newRam || specsData.ram) ? <span>RAM: {specsData.newRam || specsData.ram}GB</span> : null}
            {(specsData.addedDisk > 0) ? <span>Disk: +{specsData.addedDisk}GB</span> : (specsData.newDisk || specsData.disk) ? <span>Disk: {specsData.newDisk || specsData.disk}GB</span> : null}
            {(specsData.addedBackup > 0) ? <span>Backup: +{specsData.addedBackup}GB</span> : (specsData.newBackup !== undefined) ? <span>Backup: {specsData.newBackup}GB</span> : null}
            {(specsData.addedIpv4 > 0) && <span>IPv4: +{specsData.addedIpv4}</span>}
            {(specsData.addedIpv6 > 0) && <span>IPv6: +{specsData.addedIpv6}</span>}
          </div>
        )}
      </div>
    );
  }

  if (invoice.type === 'IP_RESERVATION') {
    let ipAddress = 'Reserved IPv4';
    if (invoice.details) {
      try {
        const d = JSON.parse(invoice.details);
        if (d.ipAddress) ipAddress = d.ipAddress;
      } catch (e) {}
    }
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {getInvoiceServiceIcon(invoice)}
          <span className={cn("truncate font-bold font-mono", isDark ? "text-white" : "text-slate-900")}>
            {ipAddress}
          </span>
        </div>
        <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>
          Dedicated Reserved IP
        </span>
      </div>
    );
  }

  if (invoice.type === 'SUBSCRIPTION' && invoice.vpsServiceId) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {getInvoiceServiceIcon(invoice)}
          <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>
            {invoice.vpsService?.hostname || 'Cloud VPS'}
          </span>
        </div>
        <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>
          PAYG Final Settlement
        </span>
      </div>
    );
  }

  if (invoice.subscription) {
    const serviceName = invoice.subscription?.plan?.service?.replace(/_/g, ' ') || 'Service';
    const planName = invoice.subscription?.plan?.name || '';
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {getInvoiceServiceIcon(invoice)}
          <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>
            {serviceName} - {planName}
          </span>
        </div>
        <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>
          Pay-As-You-Go
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        {getInvoiceServiceIcon(invoice)}
        <span className={cn("italic", isDark ? "text-zinc-500" : "text-slate-500")}>
          Plan Data Unavailable
        </span>
      </div>
    </div>
  );
}
