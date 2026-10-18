"use client";

import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { Receipt, Trash2, CheckCircle, Clock, XCircle, CreditCard, Link as LinkIcon, Download, Search, Eye, Printer, Globe, Wallet, Database, HardDrive, Cloud, Activity, Music, PlaySquare, FileText, Code2, Server , DollarSign } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { AdminLoader } from "@/components/admin/AdminLoader";

const getServiceIcon = (service: string, isDark: boolean) => {
  if (!service) return <Database className={cn("w-4 h-4", isDark ? "text-indigo-400" : "text-slate-700")} />;
  const s = service.toUpperCase();
  if (s.includes('STORAGE') || s.includes('CDN')) return <HardDrive className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-slate-700")} />;
  if (s.includes('DB') || s.includes('DATABASE')) return <Database className={cn("w-4 h-4", isDark ? "text-emerald-400" : "text-slate-700")} />;
  if (s.includes('BMKG') || s.includes('WEATHER')) return <Cloud className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-slate-700")} />;
  if (s.includes('EARTHQUAKE') || s.includes('QUAKE')) return <Activity className={cn("w-4 h-4", isDark ? "text-rose-400" : "text-slate-700")} />;
  if (s.includes('SPOTIFY') || s.includes('MUSIC')) return <Music className={cn("w-4 h-4", isDark ? "text-green-400" : "text-slate-700")} />;
  if (s.includes('TIKTOK') || s.includes('YOUTUBE') || s.includes('VIDEO')) return <PlaySquare className={cn("w-4 h-4", isDark ? "text-red-400" : "text-slate-700")} />;
  if (s.includes('BLOG') || s.includes('TEXT')) return <FileText className={cn("w-4 h-4", isDark ? "text-orange-400" : "text-slate-700")} />;
  if (s.includes('SHORTENER') || s.includes('URL')) return <LinkIcon className={cn("w-4 h-4", isDark ? "text-indigo-400" : "text-slate-700")} />;
  
  return <Code2 className={cn("w-4 h-4", isDark ? "text-indigo-400" : "text-slate-700")} />;
};
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";

export default function AdminInvoicesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/admin/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<any>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useUrlString<string>("searchQuery", "");

  // Filtering
  const filteredInvoices = invoices.filter((inv) => {
    const term = searchQuery.toLowerCase();
    const invoiceId = (inv.invoiceNumber || inv.merchantOrderId || "").toLowerCase();
    const customerName = (inv.user?.name || "").toLowerCase();
    const customerEmail = (inv.user?.email || "").toLowerCase();
    const planTitle = (inv.plan?.title || "").toLowerCase();

    return invoiceId.includes(term) || customerName.includes(term) || customerEmail.includes(term) || planTitle.includes(term);
  });

  // Pagination
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    fetchInvoices();
  }, []);


  const handleValidateInvoice = async (id: number) => {
    const toastId = toast.loading("Validating payment...");
    try {
      const res = await fetch(`/api/admin/invoices/${id}/validate`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Payment manually validated!", { id: toastId });
        fetchInvoices();
      } else {
        toast.error(data.error || "Failed to validate payment", { id: toastId });
      }
    } catch (err) {
      toast.error("Internal error", { id: toastId });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return;
    setIsBulkDeleting(true);
    const toastId = toast.loading(`Deleting ${selectedInvoices.length} invoices...`);
    let successCount = 0;
    
    for (const id of selectedInvoices) {
      try {
        const res = await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      } catch (e) {
        // ignore
      }
    }
    
    toast.success(`Successfully deleted ${successCount} invoices`, { id: toastId });
    setSelectedInvoices([]);
    setShowBulkDeleteModal(false);
    setIsBulkDeleting(false);
    fetchInvoices();
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(i => i.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")}><CheckCircle className="w-3 h-3" /> Paid</span>;
      case 'PENDING':
        return <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200")}><Clock className="w-3 h-3" /> Pending</span>;
      case 'FAILED':
      case 'CANCELED':
        return <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", isDark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-700 border-red-200")}><XCircle className="w-3 h-3" /> {status}</span>;
      default:
        return <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", isDark ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-slate-100 text-slate-600 border-slate-200")}>{status}</span>;
    }
  };

  const handlePrint = () => {
    if (!selectedInvoiceDetails) return;
    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;
    
    windowPrint.document.write(`
      <html>
        <head>
          <title>Invoice - ${selectedInvoiceDetails.invoiceNumber || selectedInvoiceDetails.merchantOrderId}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; line-height: 1.5; }
            .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 28px; font-weight: bold; color: #0f172a; }
            .subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .box { padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
            .label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.5px; }
            .value { font-size: 14px; font-weight: 500; color: #0f172a; }
            .value-lg { font-size: 20px; font-weight: bold; color: #0f172a; }
            .flex-between { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .section-title { font-size: 14px; font-weight: bold; margin-bottom: 12px; margin-top: 32px; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; color: #334155; }
            .text-right { text-align: right; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .status-paid { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef9c3; color: #854d0e; }
            .status-failed { background: #fee2e2; color: #991b1b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">INVOICE</div>
              <div class="subtitle">#${selectedInvoiceDetails.invoiceNumber || selectedInvoiceDetails.merchantOrderId}</div>
            </div>
            <div class="text-right">
              <div class="subtitle">Date: ${new Date(selectedInvoiceDetails.createdAt).toLocaleDateString('id-ID')}</div>
            </div>
          </div>
          
          <div class="grid">
            <div class="box">
              <div class="label">Status</div>
              <div class="status-badge ${selectedInvoiceDetails.status === 'PAID' ? 'status-paid' : selectedInvoiceDetails.status === 'PENDING' ? 'status-pending' : 'status-failed'}">
                ${selectedInvoiceDetails.status}
              </div>
            </div>
            <div class="box">
              <div class="label">Total Amount</div>
              <div class="value-lg">${formatRupiah(selectedInvoiceDetails.amount)}</div>
            </div>
          </div>

          <div class="section-title">Customer Information</div>
          <div class="box">
            <div class="flex-between">
              <span class="label">Name</span>
              <span class="value">${selectedInvoiceDetails.user?.name || '-'}</span>
            </div>
            <div class="flex-between">
              <span class="label">Email</span>
              <span class="value">${selectedInvoiceDetails.user?.email || '-'}</span>
            </div>
          </div>

          <div class="section-title">Payment Details</div>
          <div class="box">
            <div class="flex-between">
              <span class="label">Method</span>
              <span class="value">${selectedInvoiceDetails.paymentMethod || '-'}</span>
            </div>
            <div class="flex-between">
              <span class="label">Reference</span>
              <span class="value" style="word-break: break-all; max-width: 70%; text-align: right;">${selectedInvoiceDetails.reference || '-'}</span>
            </div>
            <div class="flex-between">
              <span class="label">Created At</span>
              <span class="value">${new Date(selectedInvoiceDetails.createdAt).toLocaleString('id-ID')}</span>
            </div>
            ${selectedInvoiceDetails.paidAt ? `
            <div class="flex-between">
              <span class="label">Paid At</span>
              <span class="value">${new Date(selectedInvoiceDetails.paidAt).toLocaleString('id-ID')}</span>
            </div>
            ` : ''}
          </div>

          <div class="section-title">Order Items</div>
          <div class="box">
            <div class="value" style="margin-bottom: 12px; font-weight: 600;">
              ${selectedInvoiceDetails.type === 'TOP_UP' ? 'Account Top Up (Saldo)' : 
                (selectedInvoiceDetails.type === 'VPS' || selectedInvoiceDetails.type === 'VPS_UPGRADE' ? 
                  `${selectedInvoiceDetails.vpsService?.hostname || (['PAYG_FIRST_HOUR', 'PAYG_RUNNING', 'PAYG_COMPLETED'].includes(selectedInvoiceDetails.reference) ? 'Cloud VPS (PAYG)' : 'Cloud VPS')} (${selectedInvoiceDetails.type === 'VPS_UPGRADE' ? 'Upgrade' : 'Order'})` :
                  (selectedInvoiceDetails.subscription?.plan?.name || '-')
                )
              }
            </div>
            <div style="font-family: monospace; font-size: 13px; color: #475569; background: #f1f5f9; padding: 12px; border-radius: 6px;">
              ${(() => {
                if (selectedInvoiceDetails.type === 'VPS' || selectedInvoiceDetails.type === 'VPS_UPGRADE') {
                  if (selectedInvoiceDetails.details) {
                    try {
                      const d = JSON.parse(selectedInvoiceDetails.details);
                      let str = '';
                      
                      if (selectedInvoiceDetails.type === 'VPS_UPGRADE') {
                        const addedCpu = d.addedCpu || 0;
                        const addedRam = d.addedRam || 0;
                        const addedDisk = d.addedDisk || 0;
                        const addedBackup = d.addedBackup || 0;
                        const addedIpv4 = d.addedIpv4 || d.addIpv4Count || 0;
                        const addedIpv6 = d.addedIpv6 || d.addIpv6Count || 0;
                        
                        const hasAdded = addedCpu > 0 || addedRam > 0 || addedDisk > 0 || addedBackup > 0 || addedIpv4 > 0 || addedIpv6 > 0;
                        
                        if (addedCpu > 0) str += `CPU: +${addedCpu} Cores<br/>`;
                        else if (d.newCpu && !hasAdded) str += `CPU: ${d.newCpu} Cores<br/>`;
                        
                        if (addedRam > 0) str += `RAM: +${addedRam} GB<br/>`;
                        else if (d.newRam && !hasAdded) str += `RAM: ${d.newRam} GB<br/>`;
                        
                        if (addedDisk > 0) str += `Disk: +${addedDisk} GB<br/>`;
                        else if (d.newDisk && !hasAdded) str += `Disk: ${d.newDisk} GB<br/>`;
                        
                        if (addedBackup > 0) str += `Backup: +${addedBackup} GB<br/>`;
                        else if (d.newBackup !== undefined && !hasAdded) str += `Backup: ${d.newBackup} GB<br/>`;
                        
                        if (addedIpv4 > 0) str += `IPv4: +${addedIpv4}<br/>`;
                        if (addedIpv6 > 0) str += `IPv6: +${addedIpv6}<br/>`;
                      } else {
                        if (d.type === 'PAYG_MONTHLY_USAGE') str += 'Monthly Usage Bill<br/>';
                        if (d.newCpu || d.cpu) str += `CPU: ${d.newCpu || d.cpu} Cores<br/>`;
                        if (d.newRam || d.ram) str += `RAM: ${d.newRam || d.ram} GB<br/>`;
                        if (d.newDisk || d.disk) str += `Disk: ${d.newDisk || d.disk} GB<br/>`;
                        if (d.newBackup !== undefined) str += `Backup: ${d.newBackup} GB<br/>`;
                        if (d.ipv4Count > 0) str += `IPv4: ${d.ipv4Count}<br/>`;
                        if (d.ipv6Count > 0) str += `IPv6: ${d.ipv6Count}<br/>`;
                      }
                      
                      return str || '-';
                    } catch(e) { return selectedInvoiceDetails.details; }
                  }
                }
                return '-';
              })()}
            </div>
          </div>
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };

  if (loading) {
    return <AdminLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Invoices</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage customer orders and billing history.</p>
        </div>
      </div>

      <div className={cn("glass-card border rounded-[32px] overflow-hidden relative z-10", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
        <div className={cn("p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto flex-1">
            <h2 className={cn("text-lg font-semibold shrink-0", isDark ? "text-white" : "text-slate-900")}>All Invoices</h2>
            <div className="w-full sm:max-w-xs relative">
              <Search className={cn("w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-slate-400")} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={cn("w-full border rounded-xl pl-10 pr-4 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            {selectedInvoices.length > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                disabled={isBulkDeleting}
                className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 font-semibold py-2 px-4 rounded-xl transition-all disabled:opacity-50 text-sm text-white"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedInvoices.length})
              </button>
            )}
            <div className={cn("bg-white/5 px-4 py-2 rounded-xl border whitespace-nowrap flex items-center justify-center h-[36px]", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Total: </span>
              <span className={cn("font-semibold ml-1", isDark ? "text-white" : "text-slate-900")}>{filteredInvoices.length}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase", isDark ? "text-zinc-300" : "text-slate-600")}>
              <tr>
                <th scope="col" className="px-6 py-4 w-12 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 border rounded flex items-center justify-center transition-colors mx-auto ${
                      filteredInvoices.length > 0 && selectedInvoices.length === filteredInvoices.length
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'border-zinc-500 hover:border-zinc-400'
                    }`}
                  >
                    {filteredInvoices.length > 0 && selectedInvoices.length === filteredInvoices.length && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                </th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Invoice ID</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Customer</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Plan</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Amount</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Method</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Status</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right whitespace-nowrap">Date</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                        <Receipt className={cn("w-10 h-10 opacity-50", isDark ? "text-cyan-400" : "text-cyan-700")} />
                      </div>
                      <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Invoices Found</h3>
                      <p className={cn(isDark ? "text-zinc-500" : "text-slate-500")}>There are no invoices matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <tr key={invoice.id} className={cn("transition-colors group", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50", selectedInvoices.includes(invoice.id) ? (isDark ? "bg-cyan-500/5" : "bg-cyan-50") : "")}>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => toggleSelect(invoice.id)}
                        className={`w-5 h-5 border rounded flex items-center justify-center transition-colors mx-auto ${
                          selectedInvoices.includes(invoice.id)
                            ? 'bg-cyan-500 border-cyan-500'
                            : 'border-zinc-500 group-hover:border-zinc-400'
                        }`}
                      >
                        {selectedInvoices.includes(invoice.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Receipt className={cn("w-4 h-4", isDark ? "text-emerald-500" : "text-emerald-700")} />
                        <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{invoice.invoiceNumber || invoice.merchantOrderId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{invoice.user?.name}</div>
                      <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>{invoice.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.type === 'TOP_UP' ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Wallet className={cn("w-4 h-4 shrink-0", isDark ? "text-emerald-400" : "text-emerald-700")} />
                            <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>Account Top Up</span>
                          </div>
                          <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>Saldo</span>
                        </div>
                      ) : invoice.type === 'VPS' || invoice.type === 'VPS_UPGRADE' ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Server className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>{invoice.vpsService?.hostname ? `${invoice.type === 'VPS_UPGRADE' ? 'VPS Upgrade' : 'Cloud VPS'} - ${invoice.vpsService.hostname}` : (['PAYG_FIRST_HOUR', 'PAYG_RUNNING', 'PAYG_COMPLETED'].includes(invoice.reference) ? 'Cloud VPS (PAYG)' : 'Cloud VPS Order')}</span>
                          </div>
                          <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Pay-As-You-Go
                          </span>
                          {(invoice.type === 'VPS_UPGRADE' || invoice.type === 'VPS') && invoice.details && (() => {
                            try {
                              const d = JSON.parse(invoice.details);
                              const hasDetails = d.type === 'PAYG_MONTHLY_USAGE' || d.newCpu || d.cpu || d.newRam || d.ram || d.newDisk || d.disk || d.newBackup !== undefined;
                              if (!hasDetails) return null;
                              return (
                                <div className={cn("ml-[24px] mt-1.5 flex flex-wrap gap-1.5 text-[10px] font-mono bg-cyan-500/10 px-2 py-1.5 rounded-lg border border-cyan-500/20 w-fit", isDark ? "text-cyan-400" : "text-cyan-700")}>
                                  {d.type === 'PAYG_MONTHLY_USAGE' && <span>Monthly Usage</span>}
                                  {(d.newCpu || d.cpu) && <span>CPU: {d.newCpu || d.cpu} Cores</span>}
                                  {(d.newRam || d.ram) && <span>RAM: {d.newRam || d.ram}GB</span>}
                                  {(d.newDisk || d.disk) && <span>Disk: {d.newDisk || d.disk}GB</span>}
                                  {d.newBackup !== undefined && <span>Backup: {d.newBackup}GB</span>}
                                </div>
                              )
                            } catch (e) { return null; }
                          })()}
                        </div>
                      ) : invoice.type === 'CUSTOM_SERVICE' ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Receipt className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>{invoice.customService?.name || 'Custom Service'}</span>
                          </div>
                          <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>Manual Billing</span>
                        </div>
                      ) : invoice.type === 'IP_RESERVATION' ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Globe className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            <span className={cn("truncate font-bold font-mono", isDark ? "text-white" : "text-slate-900")}>
                              {invoice.details ? (() => { try { return JSON.parse(invoice.details).ipAddress; } catch(e) { return 'Reserved IP'; } })() : 'Reserved IP'}
                            </span>
                          </div>
                          <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>Reserved IP</span>
                        </div>
                      ) : invoice.type === 'SUBSCRIPTION' && invoice.vpsServiceId ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Server className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>{invoice.vpsService?.hostname || 'Cloud VPS'}</span>
                          </div>
                          <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>PAYG FINAL BILLING</span>
                          {invoice.details && (() => {
                            try {
                              const d = JSON.parse(invoice.details);
                              if (Array.isArray(d) && d[0]?.name) {
                                return (
                                  <div className={cn("ml-[24px] mt-1.5 flex flex-wrap gap-1.5 text-[10px] font-mono bg-cyan-500/10 px-2 py-1.5 rounded-lg border border-cyan-500/20 w-fit", isDark ? "text-cyan-400" : "text-cyan-700")}>
                                    <span>{d[0].name}</span>
                                  </div>
                                )
                              }
                            } catch(e) {}
                            return null;
                          })()}
                        </div>
                      ) : invoice.subscription ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <div className="shrink-0">{getServiceIcon(invoice.subscription?.plan?.service, isDark)}</div>
                            <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>{`${invoice.subscription?.plan?.service?.replace('_', ' ')} - ${invoice.subscription?.plan?.name}`}</span>
                          </div>
                          <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Cycle: {invoice.subscription?.cycle}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Database className={cn("w-4 h-4 shrink-0", isDark ? "text-zinc-500" : "text-slate-400")} />
                            <span className={cn("italic", isDark ? "text-zinc-500" : "text-slate-400")}>Plan Data Unavailable</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className={cn("px-6 py-4 font-medium whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>
                      {formatRupiah(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CreditCard className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-slate-500")} />
                        <span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>{invoice.paymentMethod || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {new Date(invoice.createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status === 'PENDING' && (
                          <button
                            onClick={() => handleValidateInvoice(invoice.id)}
                            className={cn("px-3 py-1.5 text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20", isDark ? "text-emerald-400" : "text-emerald-700")}
                          >
                            Mark as Paid
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedInvoiceDetails(invoice)}
                          className={cn("p-1.5 hover:bg-cyan-500/10 rounded-lg transition-colors border border-transparent hover:border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={cn("p-4 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoiceDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={cn("w-full max-w-2xl rounded-3xl border flex flex-col max-h-[90vh] shadow-2xl", isDark ? "bg-[#0f172a] border-cyan-500/20" : "bg-white border-slate-200")}>
            <div className={cn("p-6 border-b flex justify-between items-center", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <div>
                <h3 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Receipt className={cn("w-5 h-5", isDark ? "text-cyan-500" : "text-cyan-700")} />
                  Invoice Details
                </h3>
                <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>{selectedInvoiceDetails.invoiceNumber || selectedInvoiceDetails.merchantOrderId}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className={cn("p-2 rounded-xl transition-colors border border-transparent", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
                  title="Print Invoice"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedInvoiceDetails(null)}
                  className={cn("p-2 rounded-xl transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Status & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className={cn("p-4 rounded-2xl border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-slate-50 border-slate-200")}>
                  <div className={cn("text-sm mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Status</div>
                  <div>{getStatusBadge(selectedInvoiceDetails.status)}</div>
                </div>
                <div className={cn("p-4 rounded-2xl border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-slate-50 border-slate-200")}>
                  <div className={cn("text-sm mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Total Amount</div>
                  <div className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(selectedInvoiceDetails.amount)}</div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <h4 className={cn("text-sm font-semibold uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>Customer Information</h4>
                <div className={cn("p-4 rounded-2xl border space-y-2 text-sm", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-slate-50 border-slate-200")}>
                  <div className="flex justify-between">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Name</span>
                    <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{selectedInvoiceDetails.user?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Email</span>
                    <span className={cn(isDark ? "text-white" : "text-slate-900")}>{selectedInvoiceDetails.user?.email || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="space-y-3">
                <h4 className={cn("text-sm font-semibold uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>Payment Details</h4>
                <div className={cn("p-4 rounded-2xl border space-y-2 text-sm", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-slate-50 border-slate-200")}>
                  <div className="flex justify-between">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Method</span>
                    <span className={cn(isDark ? "text-white" : "text-slate-900")}>{selectedInvoiceDetails.paymentMethod || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Reference</span>
                    <span className={cn("font-mono text-xs break-all text-right max-w-[60%]", isDark ? "text-white" : "text-slate-900")}>{selectedInvoiceDetails.reference || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Created At</span>
                    <span className={cn(isDark ? "text-white" : "text-slate-900")}>
                      {new Date(selectedInvoiceDetails.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  {selectedInvoiceDetails.paidAt && (
                    <div className="flex justify-between">
                      <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Paid At</span>
                      <span className={cn("", isDark ? "text-emerald-400" : "text-emerald-700")}>
                        {new Date(selectedInvoiceDetails.paidAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Details */}
              <div className="space-y-3">
                <h4 className={cn("text-sm font-semibold uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>Order Items</h4>
                <div className={cn("p-4 rounded-2xl border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                  <div className={cn("flex justify-between font-medium mb-2 pb-2 border-b text-sm", isDark ? "text-white border-white/5" : "text-slate-900 border-slate-200")}>
                    <span>Description</span>
                  </div>
                  <div className="space-y-1 text-sm pt-2">
                    {selectedInvoiceDetails.type === 'TOP_UP' ? (
                      <div className={cn(isDark ? "text-white" : "text-slate-900")}>Account Top Up (Saldo)</div>
                    ) : selectedInvoiceDetails.type === 'VPS' || selectedInvoiceDetails.type === 'VPS_UPGRADE' ? (
                      <>
                        <div className={cn(isDark ? "text-white" : "text-slate-900")}>
                          {selectedInvoiceDetails.vpsService?.hostname || (['PAYG_FIRST_HOUR', 'PAYG_RUNNING', 'PAYG_COMPLETED'].includes(selectedInvoiceDetails.reference) ? 'Cloud VPS (PAYG)' : 'Cloud VPS')} 
                          {' '}({selectedInvoiceDetails.type === 'VPS_UPGRADE' ? 'Upgrade' : 'Order'})
                        </div>
                        {selectedInvoiceDetails.details && (() => {
                          try {
                            const d = JSON.parse(selectedInvoiceDetails.details);
                            if (selectedInvoiceDetails.type === 'VPS_UPGRADE') {
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
                                 <div className={cn("text-xs mt-2 space-y-1 font-mono p-3 rounded-lg border", isDark ? "text-zinc-400 border-white/5" : "text-slate-500 border-slate-200")}>
                                   {addedCpu > 0 ? <div>- CPU: +{addedCpu} Cores</div> : (d.newCpu && !hasAddedDetails) ? <div>- CPU: {d.newCpu} Cores</div> : null}
                                   {addedRam > 0 ? <div>- RAM: +{addedRam} GB</div> : (d.newRam && !hasAddedDetails) ? <div>- RAM: {d.newRam} GB</div> : null}
                                   {addedDisk > 0 ? <div>- Disk: +{addedDisk} GB</div> : (d.newDisk && !hasAddedDetails) ? <div>- Disk: {d.newDisk} GB</div> : null}
                                   {addedBackup > 0 ? <div>- Backup: +{addedBackup} GB</div> : (d.newBackup !== undefined && !hasAddedDetails) ? <div>- Backup: {d.newBackup} GB</div> : null}
                                   {addedIpv4 > 0 && <div>- IPv4: +{addedIpv4}</div>}
                                   {addedIpv6 > 0 && <div>- IPv6: +{addedIpv6}</div>}
                                 </div>
                               );
                            } else {
                               const hasDetails = d.type === 'PAYG_MONTHLY_USAGE' || d.newCpu || d.cpu || d.newRam || d.ram || d.newDisk || d.disk || d.newBackup !== undefined || d.ipv4Count > 0 || d.ipv6Count > 0;
                               if (!hasDetails) return null;
                               return (
                                 <div className={cn("text-xs mt-2 space-y-1 font-mono p-3 rounded-lg border", isDark ? "text-zinc-400 border-white/5" : "text-slate-500 border-slate-200")}>
                                   {d.type === 'PAYG_MONTHLY_USAGE' && <div>- Monthly Usage Bill</div>}
                                   {(d.newCpu || d.cpu) && <div>- CPU: {d.newCpu || d.cpu} Cores</div>}
                                   {(d.newRam || d.ram) && <div>- RAM: {d.newRam || d.ram} GB</div>}
                                   {(d.newDisk || d.disk) && <div>- Disk: {d.newDisk || d.disk} GB</div>}
                                   {d.newBackup !== undefined && <div>- Backup: {d.newBackup} GB</div>}
                                   {(d.ipv4Count > 0) && <div>- IPv4: {d.ipv4Count}</div>}
                                   {(d.ipv6Count > 0) && <div>- IPv6: {d.ipv6Count}</div>}
                                 </div>
                               );
                            }
                          } catch (e) { return <div className={cn("text-xs mt-1 break-words", isDark ? "text-zinc-500" : "text-slate-500")}>{selectedInvoiceDetails.details}</div>; }
                        })()}
                      </>
                    ) : (
                      <>
                        <div className={cn(isDark ? "text-white" : "text-slate-900")}>{selectedInvoiceDetails.subscription?.plan?.name || '-'}</div>
                        <div className={cn("text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>{selectedInvoiceDetails.subscription?.plan?.service?.replace('_', ' ') || '-'}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
            </div>
            
            <div className={cn("p-6 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <button
                onClick={() => setSelectedInvoiceDetails(null)}
                className={cn("w-full py-3 font-bold rounded-xl transition-colors border", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Invoices"
        description={`Are you sure you want to permanently delete ${selectedInvoices.length} selected invoice(s)? This action cannot be undone.`}
        confirmText="Delete Invoices"
        variant="danger"
        isLoading={isBulkDeleting}
      />
    </div>
  );
}
