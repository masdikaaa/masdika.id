"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  HardDrive,
  KeyRound,
  Loader2,
  MemoryStick,
  Network,
  Plus,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  UserCheck,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { Select } from "@/components/ui/Select";
import { formatRupiah } from "@/lib/billing";
import { cn } from "@/lib/utils";

function calculateBandwidthHourlyCost(mbps: number, pricing: Record<string, number>): number {
  const steps = Math.max(0, Math.floor((mbps - 100) / 50));
  const rawRate = Number(pricing.bandwidth);
  const rate = Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : Math.ceil(50000 / 730);
  return steps * rate;
}

interface CreateVpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CatalogData {
  templates: Array<{ id: number; name: string; osType?: string | null; vmid: number }>;
  pricing: Record<string, number>;
  bandwidthOptions: number[];
  nodes: string[];
  hasIpv4Pool: boolean;
  hasIpv6Pool: boolean;
  hasSsdStorage: boolean;
  vpcRouters: Array<{ id: number; name: string }>;
}

interface CustomerVpc {
  id: number;
  name: string;
  cidr: string;
  gateway: string;
  vpsServices?: Array<{ vpcIp: string | null }>;
}

interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  balance: number;
  isBlocked: boolean;
  blockReason?: string | null;
  commitment: {
    totalMonthly: number;
    totalActiveCount: number;
  };
  vpcs: CustomerVpc[];
  reservedIps: Array<{ id: number; ipAddress: string; version: number }>;
}

function generateStrongPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "Msd";
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${result}9`;
}

function suggestNextVpcCidr(existingVpcs: CustomerVpc[]): string {
  const used = new Set(existingVpcs.map((v) => v.cidr));
  for (let i = 10; i <= 250; i++) {
    const candidate = `10.${i}.0.0/24`;
    if (!used.has(candidate)) return candidate;
  }
  return "10.99.0.0/24";
}

export default function CreateVpsModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateVpsModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [customers, setCustomers] = useState<Array<{ id: number; name: string; email: string; balance: number; isSuspended?: boolean }>>([]);
  const [catalog, setCatalog] = useState<CatalogData>({
    templates: [],
    pricing: {},
    bandwidthOptions: [100],
    nodes: ["proxmox"],
    hasIpv4Pool: true,
    hasIpv6Pool: false,
    hasSsdStorage: false,
    vpcRouters: [],
  });

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);

  const [showCreateVpc, setShowCreateVpc] = useState(false);
  const [creatingVpc, setCreatingVpc] = useState(false);
  const [vpcForm, setVpcForm] = useState({
    name: "default-vpc",
    cidr: "10.10.0.0/24",
    routerId: "",
    isNatEnabled: true,
  });

  const [form, setForm] = useState({
    targetNode: "proxmox",
    templateId: "",
    hostname: "",
    username: "",
    rootPassword: "",
    sshKey: "",
    cpuCores: 1,
    ramGb: 1,
    diskGb: 20,
    diskType: "HDD" as "HDD" | "SSD",
    backupGb: 0,
    bandwidthMbps: 100,
    useIpv4: true,
    useIpv6: false,
    reservedIpId: "",
    vpcId: "",
    privateIpAddress: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    const init = async () => {
      setLoadingCatalog(true);
      try {
        const [catalogRes, usersRes] = await Promise.all([
          fetch("/api/admin/vps/create"),
          fetch("/api/admin/users?limit=30"),
        ]);

        if (catalogRes.ok) {
          const data = await catalogRes.json();
          setCatalog({
            templates: data.templates || [],
            pricing: data.pricing || {},
            bandwidthOptions: data.bandwidthOptions?.length ? data.bandwidthOptions : [100],
            nodes: data.nodes?.length ? data.nodes : ["proxmox"],
            hasIpv4Pool: Boolean(data.hasIpv4Pool),
            hasIpv6Pool: Boolean(data.hasIpv6Pool),
            hasSsdStorage: Boolean(data.hasSsdStorage),
            vpcRouters: data.vpcRouters || [],
          });
          setForm((prev) => ({
            ...prev,
            targetNode: data.nodes?.[0] || "proxmox",
            templateId: prev.templateId || (data.templates?.[0] ? String(data.templates[0].id) : ""),
            bandwidthMbps: data.bandwidthOptions?.[0] || 100,
            useIpv4: Boolean(data.hasIpv4Pool),
          }));
          if (data.vpcRouters?.[0]) {
            setVpcForm((prev) => ({ ...prev, routerId: String(data.vpcRouters[0].id) }));
          }
        }

        if (usersRes.ok) {
          const usersJson = await usersRes.json();
          const list = Array.isArray(usersJson?.data) ? usersJson.data : [];
          setCustomers(list);
        }
      } catch (err) {
        console.error("Failed to initialize Create VPS modal:", err);
        toast.error("Failed to load VPS creation catalog");
      } finally {
        setLoadingCatalog(false);
      }
    };

    init();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const q = customerSearch.trim();
    const timer = setTimeout(async () => {
      try {
        const url = q
          ? `/api/admin/users?q=${encodeURIComponent(q)}&limit=30`
          : "/api/admin/users?limit=30";
        const res = await fetch(url);
        if (res.ok) {
          const usersJson = await res.json();
          const list = Array.isArray(usersJson?.data) ? usersJson.data : [];
          setCustomers(list);
        }
      } catch {
        // Keep current list on transient search error
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch, isOpen]);

  const filteredCustomers = customers;

  const loadCustomerDetails = async (params: { customerId?: string; email?: string }) => {
    if (!params.customerId && !params.email?.trim()) return;
    setLoadingCustomer(true);
    try {
      const qs = params.customerId
        ? `customerId=${encodeURIComponent(params.customerId)}`
        : `email=${encodeURIComponent(params.email!.trim())}`;
      const res = await fetch(`/api/admin/vps/create?${qs}`);
      const data = await res.json();
      if (!res.ok) {
        setCustomerProfile(null);
        toast.error(data.error || "Customer not found");
        return;
      }
      if (data.customer) {
        setCustomerProfile(data.customer);
        setSelectedCustomerId(String(data.customer.id));
        setShowCreateVpc(false);
        setVpcForm((prev) => ({
          ...prev,
          cidr: suggestNextVpcCidr(data.customer.vpcs || []),
        }));
        setForm((prev) => ({
          ...prev,
          vpcId: data.customer.vpcs?.[0] ? String(data.customer.vpcs[0].id) : "",
          reservedIpId: "",
          privateIpAddress: "",
        }));
      }
    } catch {
      toast.error("Failed to fetch customer details");
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleLookupSearch = () => {
    const q = customerSearch.trim();
    if (!q) return;
    if (q.includes("@")) {
      loadCustomerDetails({ email: q });
      return;
    }
    if (filteredCustomers.length > 0) {
      const match = filteredCustomers[0];
      setSelectedCustomerId(String(match.id));
      loadCustomerDetails({ customerId: String(match.id) });
      return;
    }
    toast.error("No matching customer found.");
  };

  const handleCreateCustomerVpc = async () => {
    if (!customerProfile) return;
    if (!vpcForm.name.trim() || !vpcForm.cidr.trim()) {
      toast.error("VPC name and CIDR are required.");
      return;
    }
    setCreatingVpc(true);
    const toastId = toast.loading("Creating VPC for customer...");
    try {
      const res = await fetch("/api/admin/vps/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_vpc",
          customerId: customerProfile.id,
          name: vpcForm.name.trim(),
          cidr: vpcForm.cidr.trim(),
          routerId: vpcForm.routerId ? Number(vpcForm.routerId) : undefined,
          isNatEnabled: vpcForm.isNatEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to create VPC", { id: toastId });
        return;
      }
      const newVpc: CustomerVpc = data.vpc;
      setCustomerProfile((prev) =>
        prev ? { ...prev, vpcs: [...prev.vpcs, newVpc] } : prev
      );
      setForm((prev) => ({
        ...prev,
        vpcId: String(newVpc.id),
        privateIpAddress: "",
      }));
      setShowCreateVpc(false);
      toast.success(`VPC "${newVpc.name}" (${newVpc.cidr}) created and selected.`, {
        id: toastId,
      });
    } catch {
      toast.error("Network error while creating VPC.", { id: toastId });
    } finally {
      setCreatingVpc(false);
    }
  };

  const selectedVpc = useMemo(
    () => customerProfile?.vpcs.find((v) => String(v.id) === form.vpcId) || null,
    [customerProfile, form.vpcId]
  );

  const usedVpcIps = useMemo(() => {
    if (!selectedVpc?.vpsServices) return [];
    return selectedVpc.vpsServices.map((s) => s.vpcIp).filter(Boolean) as string[];
  }, [selectedVpc]);

  const pricingSummary = useMemo(() => {
    const p = catalog.pricing;
    const diskPrice =
      form.diskType === "SSD" ? p.diskSsd || p.disk || 0 : p.disk || 0;
    const hourlyRate =
      Math.max(1, form.cpuCores) * (p.vcpu || 0) +
      Math.max(1, form.ramGb) * (p.ram || 0) +
      Math.max(10, form.diskGb) * diskPrice +
      Math.max(0, form.backupGb) * (p.backup || 0) +
      (form.useIpv4 ? p.ipv4 || 0 : 0) +
      (form.useIpv6 ? p.ipv6 || 0 : 0) +
      calculateBandwidthHourlyCost(form.bandwidthMbps, p);

    const newVpsMonthly = Math.round(hourlyRate * 730);
    const currentCommitment = customerProfile?.commitment?.totalMonthly || 0;
    const totalRequiredBalance = currentCommitment + newVpsMonthly;
    const customerBalance = customerProfile?.balance || 0;
    const isBalanceSufficient = Boolean(
      customerProfile && !customerProfile.isBlocked && customerBalance >= totalRequiredBalance
    );
    const shortfall = Math.max(0, totalRequiredBalance - customerBalance);

    return {
      hourlyRate,
      newVpsMonthly,
      currentCommitment,
      totalRequiredBalance,
      customerBalance,
      isBalanceSufficient,
      shortfall,
    };
  }, [catalog.pricing, customerProfile, form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerProfile) {
      toast.error("Please select or look up a customer first.");
      return;
    }
    if (customerProfile.isBlocked) {
      toast.error("Cannot create VPS for a blocked customer.");
      return;
    }
    if (!pricingSummary.isBalanceSufficient) {
      toast.error("Customer balance is insufficient for accumulated services commitment.");
      return;
    }
    if (!form.hostname.trim()) {
      toast.error("Hostname is required.");
      return;
    }
    if (!form.rootPassword) {
      toast.error("Root password is required.");
      return;
    }
    if (!form.templateId) {
      toast.error("Please select an OS template.");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Creating VPS and issuing PAYG invoice...");
    try {
      const res = await fetch("/api/admin/vps/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerProfile.id,
          customerEmail: customerProfile.email,
          targetNode: form.targetNode,
          templateId: Number(form.templateId),
          hostname: form.hostname.trim(),
          username: form.username.trim() || undefined,
          rootPassword: form.rootPassword,
          sshKey: form.sshKey.trim() || undefined,
          cpuCores: form.cpuCores,
          ramGb: form.ramGb,
          diskGb: form.diskGb,
          diskType: form.diskType,
          backupGb: form.backupGb,
          bandwidthMbps: form.bandwidthMbps,
          useIpv4: form.useIpv4,
          useIpv6: form.useIpv6,
          reservedIpId: form.reservedIpId ? Number(form.reservedIpId) : undefined,
          vpcId: form.vpcId ? Number(form.vpcId) : undefined,
          privateIpAddress:
            form.vpcId && form.privateIpAddress.trim()
              ? form.privateIpAddress.trim()
              : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to create VPS.", { id: toastId });
        return;
      }

      toast.success(`VPS queued for ${customerProfile.email} (${data.invoiceNumber})`, {
        id: toastId,
      });
      onSuccess();
      onClose();
    } catch {
      toast.error("Network error while creating VPS.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = cn(
    "w-full border rounded-xl px-3 text-xs outline-none transition-colors focus:border-cyan-500 h-10",
    isDark
      ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
  );

  const selectClass = cn(
    "!h-10 !py-0 !px-3 !text-xs !rounded-xl",
    isDark
      ? "!bg-[#0a0a0c] !border-white/[0.08]"
      : "!bg-slate-50 !border-slate-200"
  );

  const labelClass = cn(
    "block text-[11px] font-semibold uppercase tracking-wider mb-1.5",
    isDark ? "text-zinc-400" : "text-slate-500"
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4">
      <div
        className={cn(
          "border rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden",
          isDark
            ? "bg-[#0c0c0e] border-white/[0.08] text-white"
            : "bg-white border-slate-200 text-slate-900"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-3.5 border-b shrink-0",
            isDark ? "border-white/[0.08]" : "border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
                isDark
                  ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400"
                  : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
                Create VPS for Client
              </h2>
              <p className={cn("text-[11px]", isDark ? "text-zinc-400" : "text-slate-500")}>
                Provision a PAYG Cloud VPS to a customer account with commitment & invoice verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isDark
                ? "text-zinc-400 hover:bg-white/5 hover:text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loadingCatalog ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5">
              <RefreshCw className={cn("w-7 h-7 animate-spin", isDark ? "text-cyan-400" : "text-cyan-600")} />
              <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                Loading Proxmox templates & pricing...
              </p>
            </div>
          ) : (
            <>
              {/* 1. Target Client & Commitment Check */}
              <div
                className={cn(
                  "rounded-xl border p-3.5 sm:p-4 space-y-3",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50/70 border-slate-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  <h3 className="text-xs font-bold uppercase tracking-wider">1. Assign to Customer</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Select Customer</label>
                    <Select
                      className={selectClass}
                      value={selectedCustomerId}
                      onChange={(val) => {
                        setSelectedCustomerId(val);
                        loadCustomerDetails({ customerId: val });
                      }}
                      placeholder={
                        filteredCustomers.length === 0
                          ? "No matching customer"
                          : "Select a customer"
                      }
                      options={filteredCustomers.map((c) => ({
                        value: String(c.id),
                        label: `${c.name || "Unnamed"} (${c.email})`,
                      }))}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Filter Name or Lookup Email</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleLookupSearch();
                          }
                        }}
                        placeholder="Search name or customer@email.com"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={handleLookupSearch}
                        disabled={loadingCustomer || !customerSearch.trim()}
                        className={cn(
                          "px-3.5 h-10 rounded-xl text-xs font-bold border flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50",
                          isDark
                            ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25"
                            : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                        )}
                      >
                        {loadingCustomer ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        Check
                      </button>
                    </div>
                  </div>
                </div>

                {customerProfile && (
                  <div
                    className={cn(
                      "rounded-xl border p-3 space-y-2.5",
                      customerProfile.isBlocked
                        ? "bg-red-500/10 border-red-500/30"
                        : pricingSummary.isBalanceSufficient
                          ? isDark
                            ? "bg-emerald-500/10 border-emerald-500/25"
                            : "bg-emerald-50 border-emerald-200"
                          : "bg-red-500/10 border-red-500/30"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold">{customerProfile.name}</p>
                        <p className={cn("text-[11px]", isDark ? "text-zinc-400" : "text-slate-600")}>
                          {customerProfile.email} (ID #{customerProfile.id})
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Balance: {formatRupiah(customerProfile.balance)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-white/10">
                      <div>
                        <span className={cn("block", isDark ? "text-zinc-400" : "text-slate-500")}>
                          Active Commitment ({customerProfile.commitment.totalActiveCount} services)
                        </span>
                        <span className="font-bold">
                          {formatRupiah(pricingSummary.currentCommitment)}/mo
                        </span>
                      </div>
                      <div>
                        <span className={cn("block", isDark ? "text-zinc-400" : "text-slate-500")}>
                          New VPS Est. (730h)
                        </span>
                        <span className="font-bold text-cyan-400">
                          {formatRupiah(pricingSummary.newVpsMonthly)}/mo
                        </span>
                      </div>
                      <div>
                        <span className={cn("block", isDark ? "text-zinc-400" : "text-slate-500")}>
                          Total Required Balance
                        </span>
                        <span className="font-bold">
                          {formatRupiah(pricingSummary.totalRequiredBalance)}
                        </span>
                      </div>
                    </div>

                    {customerProfile.isBlocked ? (
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Customer account is blocked and cannot receive new VPS deployments.</span>
                      </div>
                    ) : !pricingSummary.isBalanceSufficient ? (
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Insufficient balance: customer needs {formatRupiah(pricingSummary.shortfall)} more to meet the monthly commitment requirement.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Sufficient balance verified. Upfront 1st hour ({formatRupiah(pricingSummary.hourlyRate)}) will be deducted and INV-PAYG invoice will be issued.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Server & Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Proxmox Node</label>
                  <Select
                    className={selectClass}
                    value={form.targetNode}
                    onChange={(val) => setForm((prev) => ({ ...prev, targetNode: val }))}
                    options={catalog.nodes.map((n) => ({ value: n, label: n }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>OS Template</label>
                  <Select
                    className={selectClass}
                    value={form.templateId}
                    onChange={(val) => setForm((prev) => ({ ...prev, templateId: val }))}
                    placeholder="Select OS template"
                    options={catalog.templates.map((t) => ({
                      value: String(t.id),
                      label: `${t.name} (VMID ${t.vmid})`,
                    }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Hostname (FQDN)</label>
                  <input
                    type="text"
                    required
                    value={form.hostname}
                    onChange={(e) => setForm((prev) => ({ ...prev, hostname: e.target.value }))}
                    placeholder="vps.customer.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Username (Optional)</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="root (or Administrator for Windows)"
                    className={inputClass}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={cn(labelClass, "mb-0")}>Root / Admin Password</label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, rootPassword: generateStrongPassword() }))
                      }
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={form.rootPassword}
                      onChange={(e) => setForm((prev) => ({ ...prev, rootPassword: e.target.value }))}
                      placeholder="Min 8 chars (letters & numbers)"
                      className={cn(inputClass, "pr-9")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>SSH Public Key (Optional)</label>
                  <input
                    type="text"
                    value={form.sshKey}
                    onChange={(e) => setForm((prev) => ({ ...prev, sshKey: e.target.value }))}
                    placeholder="ssh-ed25519 AAAA..."
                    className={inputClass}
                  />
                </div>
              </div>

              {/* 3. Compute Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>
                    <Cpu className="w-3 h-3 inline mr-1" /> vCPU
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={form.cpuCores}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, cpuCores: Math.max(1, Number(e.target.value) || 1) }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <MemoryStick className="w-3 h-3 inline mr-1" /> RAM (GB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={128}
                    value={form.ramGb}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, ramGb: Math.max(1, Number(e.target.value) || 1) }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <HardDrive className="w-3 h-3 inline mr-1" /> Disk (GB)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={form.diskGb}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, diskGb: Math.max(10, Number(e.target.value) || 10) }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Disk Type</label>
                  <Select
                    className={selectClass}
                    value={form.diskType}
                    onChange={(val) =>
                      setForm((prev) => ({ ...prev, diskType: val === "SSD" ? "SSD" : "HDD" }))
                    }
                    options={[
                      { value: "HDD", label: "HDD" },
                      ...(catalog.hasSsdStorage ? [{ value: "SSD", label: "SSD" }] : []),
                    ]}
                  />
                </div>
                <div>
                  <label className={labelClass}>Backup (GB)</label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={form.backupGb}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, backupGb: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Bandwidth</label>
                  <Select
                    className={selectClass}
                    value={String(form.bandwidthMbps)}
                    onChange={(val) =>
                      setForm((prev) => ({ ...prev, bandwidthMbps: Number(val) || 100 }))
                    }
                    options={catalog.bandwidthOptions.map((mbps) => ({
                      value: String(mbps),
                      label: mbps >= 1000 ? `${mbps / 1000} Gbps` : `${mbps} Mbps`,
                    }))}
                  />
                </div>
              </div>

              {/* 4. Network, VPC & Private IP */}
              <div
                className={cn(
                  "rounded-xl border p-3.5 sm:p-4 space-y-3",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50/70 border-slate-200"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Network className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Network, VPC & Private IP</h3>
                  </div>
                  {customerProfile && catalog.vpcRouters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCreateVpc((v) => !v)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-colors",
                        isDark
                          ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25"
                          : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                      )}
                    >
                      <Plus className="w-3 h-3" />
                      {showCreateVpc ? "Close VPC Form" : "Create VPC"}
                    </button>
                  )}
                </div>

                {showCreateVpc && customerProfile && (
                  <div
                    className={cn(
                      "rounded-xl border p-3 space-y-2.5",
                      isDark ? "bg-[#0c0c0e] border-cyan-500/25" : "bg-white border-cyan-200"
                    )}
                  >
                    <p className="text-[11px] font-bold text-cyan-400">
                      New VPC for {customerProfile.name}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className={labelClass}>VPC Name</label>
                        <input
                          type="text"
                          value={vpcForm.name}
                          onChange={(e) => setVpcForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="default-vpc"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Private CIDR</label>
                        <input
                          type="text"
                          value={vpcForm.cidr}
                          onChange={(e) => setVpcForm((p) => ({ ...p, cidr: e.target.value }))}
                          placeholder="10.10.0.0/24"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>VPC Router</label>
                        <Select
                          className={selectClass}
                          value={vpcForm.routerId}
                          onChange={(val) => setVpcForm((p) => ({ ...p, routerId: val }))}
                          options={catalog.vpcRouters.map((r) => ({
                            value: String(r.id),
                            label: r.name,
                          }))}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <label className="group flex items-center gap-2 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={vpcForm.isNatEnabled}
                          onChange={(e) =>
                            setVpcForm((p) => ({ ...p, isNatEnabled: e.target.checked }))
                          }
                          className="sr-only"
                        />
                        <span
                          className={cn(
                            "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                            vpcForm.isNatEnabled
                              ? "bg-cyan-500 border-cyan-500"
                              : isDark
                                ? "border-slate-700 bg-[#0a0a0c]"
                                : "border-zinc-300 bg-white"
                          )}
                        >
                          {vpcForm.isNatEnabled && <CheckCircle className="w-3 h-3 text-slate-900" />}
                        </span>
                        <span className={cn("text-[11px]", isDark ? "text-zinc-300" : "text-slate-700")}>
                          Enable Outbound NAT
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={handleCreateCustomerVpc}
                        disabled={creatingVpc}
                        className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {creatingVpc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Save & Attach VPC
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Customer VPC Network</label>
                    <Select
                      className={selectClass}
                      value={form.vpcId}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, vpcId: val, privateIpAddress: "" }))
                      }
                      options={[
                        { value: "", label: "No VPC (Public Network Only)" },
                        ...(customerProfile?.vpcs || []).map((vpc) => ({
                          value: String(vpc.id),
                          label: `${vpc.name} (${vpc.cidr})`,
                        })),
                      ]}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Assign Private IP (Optional)</label>
                    <input
                      type="text"
                      disabled={!form.vpcId}
                      value={form.privateIpAddress}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, privateIpAddress: e.target.value }))
                      }
                      placeholder={
                        selectedVpc
                          ? `Inside ${selectedVpc.cidr} (blank = auto-assign)`
                          : "Select or create a VPC first"
                      }
                      className={cn(inputClass, !form.vpcId && "opacity-50 cursor-not-allowed")}
                    />
                    {selectedVpc && usedVpcIps.length > 0 && (
                      <p className="text-[10px] text-zinc-500 mt-1 truncate">
                        In use: {usedVpcIps.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider mr-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                    <Globe className="w-3 h-3 inline mr-1" /> Public IP:
                  </span>
                  {catalog.hasIpv4Pool && (
                    <label
                      className={cn(
                        "group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none",
                        isDark
                          ? "bg-[#0c0c0e] border-white/[0.08] text-zinc-300"
                          : "bg-white border-slate-200 text-slate-700"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.useIpv4}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, useIpv4: e.target.checked }))
                        }
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                          form.useIpv4
                            ? "bg-cyan-500 border-cyan-500"
                            : isDark
                              ? "border-slate-700 bg-[#0a0a0c] group-hover:border-cyan-400"
                              : "border-zinc-300 bg-white group-hover:border-cyan-600"
                        )}
                      >
                        {form.useIpv4 && <CheckCircle className="w-3 h-3 text-slate-900" />}
                      </span>
                      <span>Public IPv4</span>
                    </label>
                  )}

                  {catalog.hasIpv6Pool && (
                    <label
                      className={cn(
                        "group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none",
                        isDark
                          ? "bg-[#0c0c0e] border-white/[0.08] text-zinc-300"
                          : "bg-white border-slate-200 text-slate-700"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.useIpv6}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, useIpv6: e.target.checked }))
                        }
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                          form.useIpv6
                            ? "bg-cyan-500 border-cyan-500"
                            : isDark
                              ? "border-slate-700 bg-[#0a0a0c] group-hover:border-cyan-400"
                              : "border-zinc-300 bg-white group-hover:border-cyan-600"
                        )}
                      >
                        {form.useIpv6 && <CheckCircle className="w-3 h-3 text-slate-900" />}
                      </span>
                      <span>Public IPv6</span>
                    </label>
                  )}

                  {customerProfile && customerProfile.reservedIps.length > 0 && (
                    <div className="min-w-[200px] flex-1">
                      <Select
                        className={selectClass}
                        value={form.reservedIpId}
                        onChange={(val) => setForm((prev) => ({ ...prev, reservedIpId: val }))}
                        options={[
                          { value: "", label: "No Reserved IP attached" },
                          ...customerProfile.reservedIps.map((ip) => ({
                            value: String(ip.id),
                            label: `${ip.ipAddress} (IPv${ip.version})`,
                          })),
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Footer Summary & Actions */}
          <div
            className={cn(
              "pt-3 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
              isDark ? "border-white/[0.08]" : "border-slate-200"
            )}
          >
            <div className="text-[11px] space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>
                  Hourly PAYG Rate:
                </span>
                <span className="font-bold text-cyan-400">
                  {formatRupiah(pricingSummary.hourlyRate)}/hr
                </span>
                <span className={cn(isDark ? "text-zinc-500" : "text-slate-400")}>•</span>
                <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>
                  Invoice: <code className="font-mono">PAYG_RUNNING</code>
                </span>
              </div>
              <p className={cn(isDark ? "text-zinc-500" : "text-slate-400")}>
                First hour ({formatRupiah(pricingSummary.hourlyRate)}) is billed immediately upon creation.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors",
                  isDark
                    ? "text-zinc-300 hover:text-white hover:bg-white/5"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingCatalog ||
                  !customerProfile ||
                  customerProfile.isBlocked ||
                  !pricingSummary.isBalanceSufficient
                }
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Server className="w-3.5 h-3.5" />
                    Create & Deploy VPS
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
