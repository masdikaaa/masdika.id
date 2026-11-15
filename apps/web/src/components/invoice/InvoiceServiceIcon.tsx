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
  Layers,
  Database,
  HardDrive,
  Gift,
  Box,
} from 'lucide-react';
import { SiKubernetes } from 'react-icons/si';
import { cn } from '@/lib/utils';
import { getInvoiceDisplayInfo } from '@/lib/invoice-display';

export function getInvoiceServiceIcon(serviceOrInvoice?: any, className = "w-4 h-4 shrink-0") {
  if (!serviceOrInvoice) return <Layers className={cn(className, "text-cyan-400")} />;

  if (typeof serviceOrInvoice === 'object') {
    const inv = serviceOrInvoice;
    const t = (inv.type || '').toUpperCase();
    const invNum = (inv.invoiceNumber || '').toUpperCase();
    const pm = (inv.paymentMethod || '').toUpperCase();

    if (t === 'TOP_UP') {
      return <Wallet className={cn(className, "text-emerald-400")} />;
    }
    if (t === 'REWARD' || pm === 'REWARD' || invNum.startsWith('RWD-')) {
      return <Gift className={cn(className, "text-amber-400")} />;
    }
    if (t === 'VPS' || t === 'VPS_UPGRADE' || inv.vpsServiceId || inv.vpsService) {
      return <Terminal className={cn(className, "text-cyan-400")} />;
    }
    if (t === 'IP_RESERVATION') {
      return <Network className={cn(className, "text-cyan-400")} />;
    }
    if (t === 'OBJECT_STORAGE' || invNum.startsWith('INV-S3-')) {
      return <HardDrive className={cn(className, "text-cyan-400")} />;
    }
    if (t === 'MANAGED_APP') {
      return <Box className={cn(className, "text-cyan-400")} />;
    }
    if (t === 'MANAGED_DATABASE') {
      return <Database className={cn(className, "text-cyan-400")} />;
    }

    const s = (
      inv.subscription?.plan?.service ||
      inv.plan?.service ||
      inv.service ||
      ''
    ).toUpperCase();
    return getServiceIconByString(s, className);
  }

  return getServiceIconByString(String(serviceOrInvoice).toUpperCase(), className);
}

function getServiceIconByString(s: string, className = "w-4 h-4 shrink-0") {
  if (s.includes('VPS')) {
    return <Terminal className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('K3S') || s.includes('KUBERNETES')) {
    return <SiKubernetes className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('OBJECT_STORAGE') || s === 'S3') {
    return <HardDrive className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('DATABASE')) {
    return <Database className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('MANAGED_APP') || s.includes('APPS')) {
    return <Box className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('STORAGE') || s.includes('CDN')) {
    return <UploadCloud className={cn(className, "text-cyan-400")} />;
  }
  if (s.includes('TOP_UP') || s.includes('TOPUP') || s.includes('SALDO') || s.includes('WALLET')) {
    return <Wallet className={cn(className, "text-emerald-400")} />;
  }
  if (s.includes('REWARD')) {
    return <Gift className={cn(className, "text-amber-400")} />;
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

  const info = getInvoiceDisplayInfo(invoice);
  const showSpecs = info.specs.length > 0 && info.category !== 'IP_RESERVATION';

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        {getInvoiceServiceIcon(invoice)}
        <span
          className={cn(
            "truncate font-bold",
            info.category === 'IP_RESERVATION' && "font-mono",
            isDark ? "text-white" : "text-slate-900"
          )}
          title={info.title}
        >
          {info.title}
        </span>
      </div>
      {info.subtitle && (
        <span className={cn("text-xs ml-[24px] truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
          {info.subtitle}
        </span>
      )}
      {showSpecs && (
        <div className="ml-[24px] mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20 w-fit">
          {info.specs.map((spec, idx) => (
            <span key={`${spec.kind}-${idx}`}>{spec.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
