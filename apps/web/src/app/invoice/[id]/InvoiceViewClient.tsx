'use client';

import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import PrintButton from './PrintButton';
import InvoiceRealtimeClient from './InvoiceRealtimeClient';
import { formatRupiah, getCycleText } from '@/lib/billing';
import { ShieldCheck, Building2 } from 'lucide-react';

export default function InvoiceViewClient({ invoice, isPaid, decryptedName, decryptedEmail }: { invoice: any, isPaid: boolean, decryptedName: string, decryptedEmail: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { margin: 0; size: auto; }
          html, body { background-color: ${isDark ? '#020617' : '#ffffff'} !important; min-height: 100vh !important; }
        }
      `}} />
      <div className={cn('min-h-screen py-6 sm:py-12 print:py-2 font-sans', isDark ? 'bg-[#020617] text-zinc-300 selection:bg-cyan-500/30' : 'bg-slate-50 text-slate-700 selection:bg-cyan-500/30')} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <InvoiceRealtimeClient invoiceNumber={invoice.invoiceNumber || invoice.merchantOrderId} isPaid={isPaid} />
        
        <div className='w-full max-w-4xl mx-auto px-4 sm:px-6 print:px-4'>
          <div className='mb-8 print:hidden'>
            <h1 className={cn('text-2xl font-bold bg-clip-text text-transparent drop-shadow-sm', isDark ? 'bg-gradient-to-br from-cyan-300 to-cyan-500' : 'bg-gradient-to-br from-cyan-500 to-cyan-700')}>Invoice Details</h1>
            <p className={cn('text-sm mt-1', isDark ? 'text-zinc-500' : 'text-slate-500')}>View and download your official invoice.</p>
          </div>

          <div className={cn('relative border rounded-3xl p-6 sm:p-12 print:p-6 shadow-2xl print:shadow-none overflow-hidden group print:break-inside-avoid', isDark ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200')}>
            <div className={cn('absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none print:hidden', isDark ? 'bg-cyan-500/10' : 'bg-cyan-500/5')} />
            <div className={cn('absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none print:hidden', isDark ? 'bg-cyan-500/10' : 'bg-cyan-500/5')} />

            <div className={cn('relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-8 mb-8 print:pb-4 print:mb-4 gap-6', isDark ? 'border-white/10' : 'border-slate-200')}>
              <div className='flex items-center gap-4'>
                <div className='flex items-center justify-center'>
                  <img
                    src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
                    alt="Masdika Logo"
                    className="h-8 w-auto"
                  />
                </div>
              </div>
              <div className='flex flex-col gap-2 w-full md:w-auto mt-6 md:mt-0'>
                <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4'>
                  <span className={cn('shrink-0', isDark ? 'text-zinc-400' : 'text-slate-500')}>Status:</span>
                  <span className={cn('font-bold inline-flex items-center gap-1.5 sm:justify-end', isPaid ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-amber-400' : 'text-amber-600'))}>
                    {isPaid && <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', isDark ? 'bg-emerald-400' : 'bg-emerald-600')} />}
                    {invoice.status}
                  </span>
                </div>
                {invoice.paymentMethod && (
                  <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4'>
                    <span className={cn('shrink-0', isDark ? 'text-zinc-400' : 'text-slate-500')}>Method:</span>
                    <span className={cn('font-semibold sm:text-right', isDark ? 'text-white' : 'text-slate-900')}>{invoice.paymentMethod}</span>
                  </div>
                )}
                {isPaid && invoice.paidAt && (
                  <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4'>
                    <span className={cn('shrink-0', isDark ? 'text-zinc-400' : 'text-slate-500')}>Paid On:</span>
                    <span className={cn('font-semibold sm:text-right', isDark ? 'text-white' : 'text-slate-900')}>{new Date(invoice.paidAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>
            <div className={cn('relative z-10 mb-12 print:mb-4 overflow-x-auto rounded-xl border custom-scrollbar', isDark ? 'border-white/5' : 'border-slate-200')}>
              <table className='w-full text-left text-sm whitespace-nowrap'>
                <thead className={cn('border-b', isDark ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200')}>
                  <tr>
                    <th className={cn('px-4 sm:px-6 print:px-4 py-4 print:py-2 font-semibold uppercase tracking-wider text-xs', isDark ? 'text-zinc-400' : 'text-slate-500')}>Description</th>
                    <th className={cn('px-4 sm:px-6 print:px-4 py-4 print:py-2 font-semibold uppercase tracking-wider text-xs text-right', isDark ? 'text-zinc-400' : 'text-slate-500')}>Amount</th>
                  </tr>
                </thead>
                <tbody className={cn('divide-y', isDark ? 'divide-white/5 bg-white/[0.01]' : 'divide-slate-200 bg-white')}>
                  <tr className={cn('transition-colors', isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50')}>
                    <td className='px-4 sm:px-6 print:px-4 py-6 print:py-4 whitespace-normal min-w-[200px]'>
                      <div className={cn('font-bold text-base mb-1.5', isDark ? 'text-white' : 'text-slate-900')}>
                        {invoice.type === "TOP_UP" ? "Account Balance Top Up"
                          : invoice.type === "VPS" ? ("Cloud VPS Order (Pay-As-You-Go) - " + (invoice.vpsService?.hostname || "New Instance"))
                            : invoice.type === "VPS_UPGRADE" ? ("Cloud VPS Specs Upgrade (Pay-As-You-Go) - " + (invoice.vpsService?.hostname || "Unknown"))
                              : invoice.type === "CUSTOM_SERVICE" ? (invoice.customService?.name || "Custom Service")
                                : invoice.type === "IP_RESERVATION" ? "Reserved IP"
                                  : invoice.type === "SUBSCRIPTION" && invoice.vpsServiceId ? ("PAYG FINAL BILLING - " + (invoice.vpsService?.hostname || "Cloud VPS"))
                                    : invoice.subscription?.plan?.name || "Unknown Item"}
                      </div>
                      <div className={cn('text-xs sm:text-sm leading-relaxed max-w-md', isDark ? 'text-zinc-400' : 'text-slate-600')} style={{ color: 'inherit' }}>
                        {invoice.type === "TOP_UP"
                          ? "Addition to wallet balance for seamless transactions across Masdika services."
                          : invoice.type === "VPS"
                            ? (
                              <>
                                <p style={{ color: 'inherit' }}>{['PAYG_FIRST_HOUR', 'PAYG_RUNNING', 'PAYG_COMPLETED'].includes(invoice.reference || '') ? 'Pay-As-You-Go Cloud VPS usage for this billing cycle.' : 'New Cloud VPS instance deployment and resource allocation.'}</p>
                                {invoice.vpsService ? (
                                  <div className={cn('mt-2 flex flex-col gap-1 text-[11px] font-mono p-2 rounded-md', isDark ? 'text-zinc-500 bg-white/5' : 'text-slate-500 bg-slate-100')}>
                                    <span>• {invoice.vpsService.cpuCores} vCPU</span>
                                    <span>• {invoice.vpsService.ramGb}GB RAM</span>
                                    <span>• {invoice.vpsService.diskGb}GB Disk</span>
                                    {invoice.vpsService.backupGb > 0 && <span>• {invoice.vpsService.backupGb}GB Backup</span>}
                                  </div>
                                ) : invoice.details ? (() => {
                                  try {
                                    const d = JSON.parse(invoice.details);
                                    const hasDetails = d.type === 'PAYG_MONTHLY_USAGE' || d.cpu || d.newCpu || d.ram || d.newRam || d.disk || d.newDisk || d.ipv4Count > 0 || d.addIpv4Count > 0;
                                    if (!hasDetails) return null;
                                    return (
                                      <div className={cn('mt-2 flex flex-col gap-1 text-[11px] font-mono p-2 rounded-md', isDark ? 'text-zinc-500 bg-white/5' : 'text-slate-500 bg-slate-100')}>
                                        {d.type === 'PAYG_MONTHLY_USAGE' && <span>• Monthly Usage Billing</span>}
                                        {(d.cpu || d.newCpu) && <span>• {d.cpu || d.newCpu} vCPU</span>}
                                        {(d.ram || d.newRam) && <span>• {d.ram || d.newRam}GB RAM</span>}
                                        {(d.disk || d.newDisk) && <span>• {d.disk || d.newDisk}GB Disk</span>}
                                        {(d.ipv4Count > 0 || d.addIpv4Count > 0) && <span>• {d.ipv4Count || d.addIpv4Count} IPv4</span>}
                                      </div>
                                    )
                                  } catch (e) { return null; }
                                })() : null}
                              </>
                            )
                            : invoice.type === "VPS_UPGRADE"
                              ? (
                                <>
                                  <p>Upgrade cost for additional VPS resources.</p>
                                  {invoice.details && (() => {
                                    try {
                                      const d = JSON.parse(invoice.details);
                                      const addedCpu = d.addedCpu || 0;
                                      const addedRam = d.addedRam || 0;
                                      const addedDisk = d.addedDisk || 0;
                                      const addedBackup = d.addedBackup || 0;
                                      const addedIpv4 = d.addedIpv4 || d.addIpv4Count || 0;
                                      const addedIpv6 = d.addedIpv6 || d.addIpv6Count || 0;

                                      const hasAddedDetails = addedCpu > 0 || addedRam > 0 || addedDisk > 0 || addedBackup > 0 || addedIpv4 > 0 || addedIpv6 > 0;
                                      const hasNewDetails = d.newCpu || d.newRam || d.newDisk || d.newBackup !== undefined;

                                      if (!hasAddedDetails && !hasNewDetails) return null;

                                      return (
                                        <div className={cn('mt-2 flex flex-col gap-1 text-[11px] font-mono p-2 rounded-md', isDark ? 'text-cyan-500/80 bg-cyan-500/10' : 'text-cyan-700 bg-cyan-50')}>
                                          {addedCpu > 0 ? <span>• +{addedCpu} vCPU</span> : (d.newCpu && !hasAddedDetails) ? <span>• CPU to {d.newCpu} Cores</span> : null}
                                          {addedRam > 0 ? <span>• +{addedRam}GB RAM</span> : (d.newRam && !hasAddedDetails) ? <span>• RAM to {d.newRam}GB</span> : null}
                                          {addedDisk > 0 ? <span>• +{addedDisk}GB Disk</span> : (d.newDisk && !hasAddedDetails) ? <span>• Disk to {d.newDisk}GB</span> : null}
                                          {addedBackup > 0 ? <span>• +{addedBackup}GB Backup</span> : (d.newBackup !== undefined && !hasAddedDetails) ? <span>• Backup to {d.newBackup}GB</span> : null}
                                          {addedIpv4 > 0 && <span>• +{addedIpv4} IPv4</span>}
                                          {addedIpv6 > 0 && <span>• +{addedIpv6} IPv6</span>}
                                        </div>
                                      );
                                    } catch (e) { return null; }
                                  })()}
                                </>
                              )
                              : invoice.type === "CUSTOM_SERVICE"
                                ? 'Manual billing for custom requested service or setup.'
                                : invoice.type === "IP_RESERVATION"
                                  ? (
                                    <>
                                      <p>Reservation for premium IPv4 address.</p>
                                      <div className={cn('mt-2 flex flex-col gap-1 text-[11px] font-mono p-2 rounded-md', isDark ? 'text-zinc-500 bg-white/5' : 'text-slate-500 bg-slate-100')}>
                                        <span>• IP: {invoice.details ? (() => { try { return JSON.parse(invoice.details).ipAddress; } catch (e) { return 'Unknown'; } })() : 'Unknown'}</span>
                                      </div>
                                    </>
                                  )
                                  : invoice.type === "SUBSCRIPTION" && invoice.vpsServiceId
                                    ? (
                                      <>
                                        <p>Final usage settlement for Pay-As-You-Go Cloud VPS.</p>
                                        {invoice.details && (() => {
                                          try {
                                            const d = JSON.parse(invoice.details);
                                            if (Array.isArray(d) && d[0]?.name) {
                                              return (
                                                <div className={cn('mt-2 flex flex-col gap-1 text-[11px] font-mono p-2 rounded-md', isDark ? 'text-zinc-500 bg-white/5' : 'text-slate-500 bg-slate-100')}>
                                                  <span>• {d[0].name}</span>
                                                </div>
                                              )
                                            }
                                          } catch (e) { }
                                          return null;
                                        })()}
                                      </>
                                    )
                                    : (
                                      <>
                                        <p>Subscription for {invoice.subscription?.plan?.service?.replace('_', ' ')} ({getCycleText(invoice.subscription?.cycle || '1_MONTH')}).</p>
                                        {invoice.subscription?.plan?.limits && (() => {
                                          try {
                                            const limits = typeof invoice.subscription.plan.limits === 'string'
                                              ? JSON.parse(invoice.subscription.plan.limits)
                                              : invoice.subscription.plan.limits;

                                            return (
                                              <div className={cn('mt-2 flex flex-col gap-1 text-[11px] font-mono p-2 rounded-md', isDark ? 'text-zinc-500 bg-white/5' : 'text-slate-500 bg-slate-100')}>
                                                {limits.storageGB !== undefined && <span>• {limits.storageGB} GB Storage</span>}
                                                {limits.transferGB !== undefined && <span>• {limits.transferGB} GB Bandwidth</span>}
                                                {limits.requests !== undefined && <span>• {limits.requests.toString().toUpperCase()} Requests</span>}
                                                {limits.links !== undefined && <span>• {limits.links.toString().toUpperCase()} Links</span>}
                                              </div>
                                            );
                                          } catch (e) {
                                            return <p className={cn('mt-2 text-[11px] font-mono p-2 rounded-md', isDark ? 'text-zinc-500 bg-white/5' : 'text-slate-500 bg-slate-100')}>Includes premium access as per plan.</p>;
                                          }
                                        })()}
                                      </>
                                    )}
                      </div>
                    </td>
                    <td className={cn('px-4 sm:px-6 print:px-4 py-6 print:py-4 text-right font-bold text-base sm:text-lg align-top', isDark ? 'text-white' : 'text-slate-900')}>
                      {formatRupiah(invoice.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className='relative z-10 flex flex-col items-end pt-2 print:pt-0'>
              <div className={cn('w-full sm:w-80 p-6 print:p-4 rounded-2xl border space-y-4 print:space-y-2', isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200')}>
                <div className='flex justify-between items-center text-sm'>
                  <span className={cn(isDark ? 'text-zinc-400' : 'text-slate-500')}>Subtotal</span>
                  <span className={cn('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{formatRupiah(invoice.subtotal ?? invoice.amount)}</span>
                </div>
                <div className={cn('flex justify-between items-center text-sm pb-4 border-b', isDark ? 'border-white/10' : 'border-slate-200')}>
                  <span className={cn(isDark ? 'text-zinc-400' : 'text-slate-500')}>Tax / Fee ({invoice.taxRate ?? 0}%)</span>
                  <span className={cn('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{formatRupiah(invoice.taxAmount ?? 0)}</span>
                </div>
                <div className='flex justify-between items-end pt-2'>
                  <span className={cn('text-sm font-bold uppercase tracking-wider', isDark ? 'text-zinc-300' : 'text-slate-700')}>Total</span>
                  <span className={cn('text-2xl sm:text-3xl font-black', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
                    {formatRupiah(invoice.amount)}
                  </span>
                </div>
              </div>
            </div>

            <div className={cn('mt-12 pt-8 print:mt-6 print:pt-4 border-t relative z-10', isDark ? 'border-white/10' : 'border-slate-200')}>
              <p className={cn('text-sm font-medium text-center', isDark ? 'text-zinc-500' : 'text-slate-500')}>Thank you for choosing Masdika Cloud.</p>
              <p className={cn('text-xs mt-1 text-center', isDark ? 'text-zinc-600' : 'text-slate-400')}>If you have any questions about this invoice, please contact support.</p>
              <div className='flex justify-center mt-6 print:hidden'>
                <PrintButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}