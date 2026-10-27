'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import InvoiceRealtimeClient from './InvoiceRealtimeClient';
import { formatRupiah, getCycleText } from '@/lib/billing';
import { 
  ShieldCheck, 
  Building2, 
  Printer, 
  ArrowLeft, 
  Copy, 
  Check, 
  Share2, 
  CheckCircle2, 
  Clock, 
  Server, 
  Wallet, 
  Layers, 
  Network, 
  Cpu, 
  HardDrive, 
  Globe, 
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceViewClientProps {
  invoice: any;
  isPaid: boolean;
  decryptedName: string;
  decryptedEmail: string;
}

export default function InvoiceViewClient({ invoice, isPaid, decryptedName, decryptedEmail }: InvoiceViewClientProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const invoiceNumber = invoice.invoiceNumber || invoice.merchantOrderId;
  const subtotalAmount = (invoice.subtotal && invoice.subtotal > 0) 
    ? invoice.subtotal 
    : (invoice.amount - (invoice.taxAmount || 0));
  const taxAmount = invoice.taxAmount || 0;
  const taxRate = invoice.taxRate || 0;

  const handleCopyInvoiceNumber = async () => {
    try {
      await navigator.clipboard.writeText(invoiceNumber);
      setCopiedInvoice(true);
      toast.success('Invoice number copied to clipboard');
      setTimeout(() => setCopiedInvoice(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShareInvoice = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      toast.success('Invoice link copied to clipboard');
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const formatPaymentMethod = (method?: string | null) => {
    if (!method) return 'Account Balance';
    const m = method.toUpperCase();
    if (m === 'BALANCE' || m === 'ACCOUNT BALANCE') return 'Account Balance (Saldo Akun)';
    if (m === 'QRIS') return 'QRIS Instant Payment';
    if (m.includes('VA') || m.includes('VIRTUAL')) return `${method} Virtual Account`;
    return method;
  };

  const formattedDate = (dateVal: any, withTime = false) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
    });
  };

  // Helper to determine clean disk specification label (HDD / SSD / Storage)
  const getDiskBadgeText = (diskGb?: number | null, diskType?: string | null) => {
    if (!diskGb) return null;
    const t = (diskType || '').toUpperCase().trim();
    if (t === 'HDD') return `${diskGb} GB HDD`;
    if (t === 'SSD') return `${diskGb} GB SSD`;
    return `${diskGb} GB Storage`;
  };

  const userAddress = [
    invoice.user?.address1,
    invoice.user?.address2,
    invoice.user?.city,
    invoice.user?.state,
    invoice.user?.postalCode,
    invoice.user?.country
  ].filter(Boolean).join(', ');

  // Parse details once for reuse in mobile & desktop views
  let parsedDetails: any = null;
  if (!invoice.vpsService && invoice.details) {
    try {
      parsedDetails = JSON.parse(invoice.details);
    } catch {}
  }

  const vpsDiskLabel = invoice.vpsService
    ? getDiskBadgeText(invoice.vpsService.diskGb, invoice.vpsService.diskType)
    : parsedDetails
      ? getDiskBadgeText(parsedDetails.disk || parsedDetails.newDisk, parsedDetails.diskType || parsedDetails.storageType)
      : null;

  const itemTitle = invoice.type === "TOP_UP" ? "Account Balance Top Up"
    : invoice.type === "VPS" ? (`Cloud VPS Order (Pay-As-You-Go) - ${invoice.vpsService?.hostname || "New Instance"}`)
      : invoice.type === "VPS_UPGRADE" ? (`Cloud VPS Specs Upgrade (Pay-As-You-Go) - ${invoice.vpsService?.hostname || "Cloud Instance"}`)
        : invoice.type === "IP_RESERVATION" ? "Dedicated Reserved IPv4 Address"
          : invoice.type === "SUBSCRIPTION" && invoice.vpsServiceId ? (`PAYG Final Settlement - ${invoice.vpsService?.hostname || "Cloud VPS"}`)
            : (invoice.subscription?.plan?.name || "Masdika Cloud Services");

  const itemDescription = invoice.type === "TOP_UP"
    ? "Addition to account wallet balance for seamless transactions across Masdika services."
    : invoice.type === "VPS"
      ? (['PAYG_FIRST_HOUR', 'PAYG_RUNNING', 'PAYG_COMPLETED'].includes(invoice.reference || '')
          ? 'Pay-As-You-Go Cloud VPS usage for this billing cycle.'
          : 'New Cloud VPS instance deployment and resource allocation.')
      : invoice.type === "VPS_UPGRADE"
        ? "Prorated resource expansion and hardware allocation for existing VPS instance."
        : invoice.type === "IP_RESERVATION"
          ? "Premium high-reputation dedicated public IPv4 address reservation."
          : "Cloud service subscription access and computing resource allowance.";

  const billingTypeLabel = invoice.type === 'VPS' ? 'Hourly Metered' : invoice.type === 'TOP_UP' ? 'One-Time Credit' : 'Service Cycle';

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { margin: 12mm; size: auto; }
          html, body { 
            background-color: #ffffff !important; 
            color: #0f172a !important; 
            min-height: 100vh !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-clean {
            background-color: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border-color: #cbd5e1 !important;
          }
          .print-muted {
            color: #475569 !important;
          }
          .print-dark {
            color: #0f172a !important;
          }
          .print-badge {
            background-color: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
            color: #0f172a !important;
          }
        }
      `}} />

      <div 
        className={cn(
          'min-h-screen py-5 sm:py-10 pb-24 sm:pb-16 font-sans transition-colors',
          isDark ? 'bg-[#020617] text-zinc-300 selection:bg-cyan-500/30' : 'bg-slate-50 text-slate-700 selection:bg-cyan-500/30'
        )} 
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <InvoiceRealtimeClient invoiceNumber={invoiceNumber} isPaid={isPaid} />

        <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 print:p-0 print:max-w-full">
          
          {/* Top Actions Bar (Responsive on Mobile, Hidden on print) */}
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 w-full max-w-full min-w-0 print:hidden">
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <Link
                href="/dashboard/billing"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs shrink-0",
                  isDark
                    ? "bg-[#0b1322] border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Link>

              <button
                type="button"
                onClick={handleCopyInvoiceNumber}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer truncate max-w-[210px] sm:max-w-none",
                  isDark
                    ? "bg-[#0b1322] border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                )}
                title="Copy Invoice Number"
              >
                {copiedInvoice ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <span className="truncate">#{invoiceNumber}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleShareInvoice}
                className={cn(
                  "flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs",
                  isDark
                    ? "bg-[#0b1322] border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 sm:flex-none justify-center inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>

          {/* ── Official Invoice Document Card ── */}
          <div 
            className={cn(
              'relative rounded-3xl p-5 sm:p-10 md:p-12 border shadow-2xl transition-all overflow-hidden print-clean w-full max-w-full min-w-0 box-border',
              'print:p-6 print:border print:rounded-none print:shadow-none print:break-inside-avoid',
              isDark 
                ? 'bg-[#0b111e] border-slate-800/90 shadow-[0_25px_60px_rgba(0,0,0,0.8)]' 
                : 'bg-white border-slate-200/90 shadow-xl'
            )}
          >
            {/* Ambient Background Glows */}
            <div className={cn('absolute -top-28 -right-28 w-80 h-80 rounded-full blur-[100px] pointer-events-none print:hidden', isDark ? 'bg-cyan-500/10' : 'bg-cyan-500/5')} />
            <div className={cn('absolute -bottom-28 -left-28 w-80 h-80 rounded-full blur-[100px] pointer-events-none print:hidden', isDark ? 'bg-cyan-500/10' : 'bg-cyan-500/5')} />

            {/* Official Watermark / Rubber Stamp (Shown on tablet/desktop, hidden on mobile to avoid overlapping text) */}
            {isPaid && (
              <div className="hidden sm:block absolute top-16 right-10 md:right-14 pointer-events-none select-none rotate-[-12deg] z-0 opacity-15 dark:opacity-25 print:opacity-40">
                <div className="border-[3px] border-emerald-500 rounded-2xl px-5 py-2 sm:px-6 sm:py-2.5 text-center">
                  <div className="text-[10px] tracking-[0.25em] font-extrabold text-emerald-500 uppercase">OFFICIAL RECEIPT</div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-wider">LUNAS / PAID</div>
                  <div className="text-[9px] tracking-[0.15em] font-semibold text-emerald-500 uppercase">MASDIKA CLOUD BILLING</div>
                </div>
              </div>
            )}

            {/* ── 1. Document Header (Logo & Company Info vs Invoice Title) ── */}
            <div className={cn("relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-6 sm:pb-8 mb-6 sm:mb-8 gap-5 sm:gap-6 w-full min-w-0 print:pb-5 print:mb-5", isDark ? "border-slate-800/80" : "border-slate-200")}>
              
              {/* Left: Masdika Branding */}
              <div className="space-y-2.5 sm:space-y-3 w-full md:w-auto min-w-0">
                <div className="flex items-center gap-3">
                  <img
                    src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
                    alt="Masdika Logo"
                    className="h-8 sm:h-9 w-auto print:hidden"
                  />
                  {/* Clean High-Contrast Print Logo fallback */}
                  <img
                    src="/masdika-logo-light-mode.svg"
                    alt="Masdika Logo"
                    className="hidden print:block h-8 w-auto"
                  />
                </div>
                
                <div className={cn("text-xs leading-relaxed space-y-0.5 print-muted", isDark ? "text-slate-400" : "text-slate-500")}>
                  <p className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>Masdika Cloud Infrastructure</p>
                  <p>PT Masdika Teknologi Indonesia • Automated Cloud Billing</p>
                  <p>Sidoarjo, Jawa Timur 61256, Indonesia</p>
                  <p className="font-mono text-[11px] pt-0.5">billing@masdika.id • https://masdika.id</p>
                </div>
              </div>

              {/* Right: Invoice Number & Status */}
              <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto min-w-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/50">
                <div className="text-left md:text-right w-full min-w-0">
                  <div className={cn("text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest print-muted", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    OFFICIAL TAX INVOICE &amp; RECEIPT
                  </div>
                  <h1 className={cn("text-base sm:text-2xl md:text-3xl font-black tracking-tight font-mono mt-0.5 break-all sm:break-normal leading-tight print-dark", isDark ? "text-white" : "text-slate-900")}>
                    #{invoiceNumber}
                  </h1>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                    isPaid
                      ? (isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")
                      : (isDark ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")
                  )}>
                    {isPaid ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse print:hidden" />
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>PAID / LUNAS</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>UNPAID / PENDING</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 2. Billed To & Transaction Metadata (2 Columns) ── */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-6 sm:mb-8 print:mb-5 w-full min-w-0">
              
              {/* Billed To / Client Box */}
              <div className={cn(
                "p-4 sm:p-5 rounded-2xl border space-y-2.5 print-badge w-full min-w-0 box-border",
                isDark ? "bg-[#060b14]/70 border-slate-800/80" : "bg-slate-50 border-slate-200/90"
              )}>
                <div className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  BILLED TO (CUSTOMER)
                </div>
                <div className="space-y-1 min-w-0">
                  <h2 className={cn("text-base font-bold print-dark leading-tight truncate", isDark ? "text-white" : "text-slate-900")}>
                    {decryptedName || 'Valued Customer'}
                  </h2>
                  {invoice.user?.companyName && (
                    <p className={cn("text-xs font-semibold flex items-center gap-1.5 print-muted truncate", isDark ? "text-slate-300" : "text-slate-700")}>
                      <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{invoice.user.companyName}</span>
                    </p>
                  )}
                  <p className={cn("text-xs font-mono print-muted truncate", isDark ? "text-slate-400" : "text-slate-600")}>
                    {decryptedEmail}
                  </p>
                  {invoice.user?.phone && (
                    <p className={cn("text-xs font-mono print-muted", isDark ? "text-slate-400" : "text-slate-600")}>
                      {invoice.user.phone}
                    </p>
                  )}
                  {userAddress ? (
                    <p className={cn("text-xs leading-relaxed pt-1 print-muted break-words", isDark ? "text-slate-400" : "text-slate-600")}>
                      {userAddress}
                    </p>
                  ) : (
                    <p className={cn("text-[11px] italic pt-1 print-muted", isDark ? "text-slate-500" : "text-slate-400")}>
                      Registered Cloud User Account
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-dashed border-slate-700/50 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className={cn(isDark ? "text-slate-500" : "text-slate-500")}>Customer ID:</span>
                  <span className={cn("font-mono font-semibold print-dark", isDark ? "text-slate-300" : "text-slate-800")}>
                    UID-{String(invoice.userId).padStart(5, '0')}
                  </span>
                </div>
              </div>

              {/* Invoice & Payment Details Box */}
              <div className={cn(
                "p-4 sm:p-5 rounded-2xl border space-y-2.5 print-badge w-full min-w-0 box-border",
                isDark ? "bg-[#060b14]/70 border-slate-800/80" : "bg-slate-50 border-slate-200/90"
              )}>
                <div className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  INVOICE &amp; PAYMENT DETAILS
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(isDark ? "text-slate-400" : "text-slate-500")}>Invoice Date:</span>
                    <span className={cn("font-medium print-dark text-right", isDark ? "text-slate-200" : "text-slate-800")}>
                      {formattedDate(invoice.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(isDark ? "text-slate-400" : "text-slate-500")}>Settlement Date:</span>
                    <span className={cn("font-medium print-dark text-right", isDark ? "text-slate-200" : "text-slate-800")}>
                      {invoice.paidAt ? formattedDate(invoice.paidAt, true) : 'Pending Settlement'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(isDark ? "text-slate-400" : "text-slate-500")}>Payment Method:</span>
                    <span className={cn("font-semibold print-dark text-right", isDark ? "text-white" : "text-slate-900")}>
                      {formatPaymentMethod(invoice.paymentMethod)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-slate-700/50 dark:border-slate-800">
                    <span className={cn(isDark ? "text-slate-500" : "text-slate-500")}>Transaction Ref:</span>
                    <span className={cn("font-mono text-[11px] font-semibold print-dark text-right truncate max-w-[180px] sm:max-w-none", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      {invoice.merchantOrderId}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. Itemized Services (Responsive: Card on Mobile, Table on Desktop) ── */}
            <div className={cn(
              "relative z-10 mb-6 sm:mb-8 overflow-hidden rounded-2xl border print-badge print:mb-4 w-full max-w-full min-w-0 box-border",
              isDark ? "border-slate-800/80 bg-[#060b14]/50" : "border-slate-200 bg-white"
            )}>
              {/* ── Desktop View (sm+) ── */}
              <div className="hidden sm:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className={cn(
                      "border-b uppercase tracking-wider font-semibold text-[11px]",
                      isDark ? "bg-[#0b1322] text-slate-400 border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      <th className="py-3.5 px-4 sm:px-6">Description &amp; Resource Specs</th>
                      <th className="py-3.5 px-4 text-center">Billing Type</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
                    <tr>
                      <td className="py-5 px-4 sm:px-6 align-top">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {invoice.type === "VPS" || invoice.type === "VPS_UPGRADE" ? (
                              <Server className="w-4 h-4 text-cyan-400 shrink-0" />
                            ) : invoice.type === "TOP_UP" ? (
                              <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : invoice.type === "IP_RESERVATION" ? (
                              <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                            ) : (
                              <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                            )}
                            <h3 className={cn("font-bold text-sm sm:text-base print-dark", isDark ? "text-white" : "text-slate-900")}>
                              {itemTitle}
                            </h3>
                          </div>

                          <p className={cn("text-xs leading-relaxed max-w-lg print-muted", isDark ? "text-slate-400" : "text-slate-600")}>
                            {itemDescription}
                          </p>

                          {/* Specification Pills / Badges */}
                          {invoice.vpsService && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                              <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                                <Cpu className="w-3 h-3 text-cyan-400" /> {invoice.vpsService.cpuCores} vCPU
                              </span>
                              <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                                <Layers className="w-3 h-3 text-cyan-400" /> {invoice.vpsService.ramGb} GB RAM
                              </span>
                              {vpsDiskLabel && (
                                <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                                  <HardDrive className="w-3 h-3 text-cyan-400" /> {vpsDiskLabel}
                                </span>
                              )}
                              {invoice.vpsService.backupGb > 0 && (
                                <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                                  <ShieldCheck className="w-3 h-3 text-cyan-400" /> {invoice.vpsService.backupGb} GB Backup
                                </span>
                              )}
                              <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                                <Globe className="w-3 h-3 text-cyan-400" /> Dedicated IPv4
                              </span>
                            </div>
                          )}

                          {!invoice.vpsService && parsedDetails && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                              {(parsedDetails.cpu || parsedDetails.newCpu) && (
                                <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                                  <Cpu className="w-3 h-3 text-cyan-400" /> {parsedDetails.cpu || parsedDetails.newCpu} vCPU
                                </span>
                              )}
                              {(parsedDetails.ram || parsedDetails.newRam) && (
                                <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                                  <Layers className="w-3 h-3 text-cyan-400" /> {parsedDetails.ram || parsedDetails.newRam} GB RAM
                                </span>
                              )}
                              {vpsDiskLabel && (
                                <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                                  <HardDrive className="w-3 h-3 text-cyan-400" /> {vpsDiskLabel}
                                </span>
                              )}
                              {parsedDetails.ipAddress && (
                                <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                                  <Globe className="w-3 h-3 text-cyan-400" /> IP: {parsedDetails.ipAddress}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-5 px-4 text-center align-top">
                        <span className={cn(
                          "inline-block px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border",
                          isDark ? "bg-slate-800/60 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                        )}>
                          {billingTypeLabel}
                        </span>
                      </td>

                      <td className={cn("py-5 px-4 sm:px-6 text-right font-bold text-base sm:text-lg align-top font-mono print-dark", isDark ? "text-white" : "text-slate-900")}>
                        {formatRupiah(invoice.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Mobile View (< sm): Clean Non-Cramped Card ── */}
              <div className="block sm:hidden p-4 space-y-3.5 print:hidden">
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    {invoice.type === "VPS" || invoice.type === "VPS_UPGRADE" ? (
                      <Server className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    ) : invoice.type === "TOP_UP" ? (
                      <Wallet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : invoice.type === "IP_RESERVATION" ? (
                      <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    ) : (
                      <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    )}
                    <h3 className={cn("font-bold text-sm leading-snug break-words", isDark ? "text-white" : "text-slate-900")}>
                      {itemTitle}
                    </h3>
                  </div>

                  <p className={cn("text-xs leading-relaxed break-words", isDark ? "text-slate-400" : "text-slate-600")}>
                    {itemDescription}
                  </p>
                </div>

                {/* Specs Badges on Mobile (Full width wrap, no vertical ladder) */}
                {(invoice.vpsService || parsedDetails) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {invoice.vpsService ? (
                      <>
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                          <Cpu className="w-3 h-3 text-cyan-400" /> {invoice.vpsService.cpuCores} vCPU
                        </span>
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                          <Layers className="w-3 h-3 text-cyan-400" /> {invoice.vpsService.ramGb} GB RAM
                        </span>
                        {vpsDiskLabel && (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                            <HardDrive className="w-3 h-3 text-cyan-400" /> {vpsDiskLabel}
                          </span>
                        )}
                        {invoice.vpsService.backupGb > 0 && (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                            <ShieldCheck className="w-3 h-3 text-cyan-400" /> {invoice.vpsService.backupGb} GB Backup
                          </span>
                        )}
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                          <Globe className="w-3 h-3 text-cyan-400" /> Dedicated IPv4
                        </span>
                      </>
                    ) : parsedDetails ? (
                      <>
                        {(parsedDetails.cpu || parsedDetails.newCpu) && (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                            <Cpu className="w-3 h-3 text-cyan-400" /> {parsedDetails.cpu || parsedDetails.newCpu} vCPU
                          </span>
                        )}
                        {(parsedDetails.ram || parsedDetails.newRam) && (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                            <Layers className="w-3 h-3 text-cyan-400" /> {parsedDetails.ram || parsedDetails.newRam} GB RAM
                          </span>
                        )}
                        {vpsDiskLabel && (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800")}>
                            <HardDrive className="w-3 h-3 text-cyan-400" /> {vpsDiskLabel}
                          </span>
                        )}
                      </>
                    ) : null}
                  </div>
                )}

                {/* Mobile Item Footer */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                  <span className={cn(
                    "inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border",
                    isDark ? "bg-slate-800/60 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                  )}>
                    {billingTypeLabel}
                  </span>

                  <span className={cn("font-bold text-base font-mono", isDark ? "text-white" : "text-slate-900")}>
                    {formatRupiah(invoice.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 4. Financial Breakdown & Security Guarantee ── */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-end mb-6 sm:mb-8 print:mb-4 w-full min-w-0">
              
              {/* Payment Assurance Note */}
              <div className={cn(
                "p-4 sm:p-5 rounded-2xl border space-y-2.5 print-badge w-full min-w-0 box-border",
                isDark ? "bg-[#060b14]/70 border-slate-800/80" : "bg-slate-50 border-slate-200/90"
              )}>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified Electronic Payment</span>
                </div>
                <p className={cn("text-xs leading-relaxed print-muted", isDark ? "text-slate-400" : "text-slate-600")}>
                  This invoice has been processed and verified via Masdika Automated Cloud Billing. All resource meters are synchronized and confirmed.
                </p>
                <div className="pt-2 border-t border-dashed border-slate-700/50 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
                  <span className={isDark ? "text-slate-500" : "text-slate-500"}>Security Hash:</span>
                  <span className={cn("font-semibold print-dark truncate max-w-[160px] sm:max-w-none text-right", isDark ? "text-slate-300" : "text-slate-700")}>
                    SHA256-{invoice.merchantOrderId.slice(-8).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Totals Summary */}
              <div className={cn(
                "p-4 sm:p-6 rounded-2xl border space-y-3.5 print-badge w-full min-w-0 box-border",
                isDark ? "bg-[#060b14]/80 border-slate-800" : "bg-slate-50 border-slate-200"
              )}>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className={cn("print-muted", isDark ? "text-slate-400" : "text-slate-500")}>Subtotal</span>
                  <span className={cn("font-semibold font-mono print-dark", isDark ? "text-white" : "text-slate-900")}>
                    {formatRupiah(subtotalAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs sm:text-sm pb-3 border-b border-slate-800 dark:border-slate-800 border-dashed">
                  <span className={cn("print-muted", isDark ? "text-slate-400" : "text-slate-500")}>
                    Tax / PPN ({taxRate}%)
                  </span>
                  <span className={cn("font-semibold font-mono print-dark", isDark ? "text-white" : "text-slate-900")}>
                    {formatRupiah(taxAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-end pt-1">
                  <div>
                    <span className={cn("text-xs font-extrabold uppercase tracking-wider block print-muted", isDark ? "text-slate-400" : "text-slate-600")}>
                      Grand Total
                    </span>
                    <span className="text-[10px] text-slate-500">All fees included</span>
                  </div>
                  <span className={cn("text-xl sm:text-3xl font-black font-mono tracking-tight print-dark", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    {formatRupiah(invoice.amount)}
                  </span>
                </div>

                {isPaid && (
                  <div className="pt-2 border-t border-slate-800 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between items-center text-emerald-400 font-semibold">
                      <span>Amount Paid</span>
                      <span>{formatRupiah(invoice.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 text-[11px]">
                      <span>Balance Due</span>
                      <span>Rp 0</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── 5. Footer & Legal Terms ── */}
            <div className={cn(
              "relative z-10 pt-5 sm:pt-6 mt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs print:pt-4 print:mt-4 w-full min-w-0",
              isDark ? "border-slate-800/80" : "border-slate-200"
            )}>
              <div className="space-y-1 text-center sm:text-left print-muted">
                <p className={cn("font-semibold", isDark ? "text-slate-300" : "text-slate-700")}>
                  Thank you for choosing Masdika Cloud Infrastructure.
                </p>
                <p className={cn("text-[11px] leading-relaxed", isDark ? "text-slate-500" : "text-slate-400")}>
                  PT Masdika Teknologi Indonesia • This is a computer-generated official tax invoice and electronic receipt. For corporate inquiries or Faktur Pajak, contact billing@masdika.id.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs",
                    isDark
                      ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                      : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
                  )}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}