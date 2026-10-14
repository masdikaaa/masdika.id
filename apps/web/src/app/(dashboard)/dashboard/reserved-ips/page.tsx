"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Network, Plus, Calculator, Trash2, CheckCircle, RefreshCw, AlertTriangle, ShieldCheck, Server, Check, Link2, Globe, Copy, Info } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ReservedIpsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const [ips, setIps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [ipToRelease, setIpToRelease] = useState<any>(null);
  const [isReleasing, setIsReleasing] = useState(false);

  const [showAttachModal, setShowAttachModal] = useState(false);
  const [ipToAttach, setIpToAttach] = useState<any>(null);
  const [vpsList, setVpsList] = useState<any[]>([]);
  const [selectedVpsId, setSelectedVpsId] = useState<string>("");
  const [isAttaching, setIsAttaching] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("IP address copied to clipboard!");
  };

  const [selectedIps, setSelectedIps] = useState<number[]>([]);
  const [showBulkReleaseModal, setShowBulkReleaseModal] = useState(false);
  const [isBulkReleasing, setIsBulkReleasing] = useState(false);

  const toggleSelectIp = (id: number) => {
    setSelectedIps(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIps.length === ips.length) {
      setSelectedIps([]);
    } else {
      setSelectedIps(ips.map(ip => ip.id));
    }
  };

  const handleBulkRelease = async () => {
    setIsBulkReleasing(true);
    try {
      await Promise.all(selectedIps.map(id =>
        fetch(`/api/user/reserved-ips/${id}`, { method: 'DELETE' })
      ));
      toast.success(`${selectedIps.length} IPs released successfully!`);
      setShowBulkReleaseModal(false);
      setSelectedIps([]);
      fetchData();
    } catch (error) {
      toast.error("Internal server error during bulk release");
    } finally {
      setIsBulkReleasing(false);
    }
  };

  const fetchData = async () => {
    try {
      const [ipsRes, pricingRes] = await Promise.all([
        fetch('/api/user/reserved-ips'),
        fetch('/api/user/pricing')
      ]);

      if (ipsRes.ok) {
        setIps(await ipsRes.json());
      }

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        const p: Record<string, number> = {};
        pricingData.forEach((item: any) => p[item.key] = item.pricePerHour);
        setPricing(p);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAttachModal = async (ip: any) => {
    setIpToAttach(ip);
    setShowAttachModal(true);
    setSelectedVpsId("");
    try {
      const res = await fetch('/api/user/vps');
      if (res.ok) {
        const data = await res.json();
        setVpsList(data.filter((v: any) => v.status !== 'TERMINATED' && v.status !== 'SUSPENDED'));
      }
    } catch (err) {
      toast.error("Failed to fetch VPS list");
    }
  };

  const handleAttach = async () => {
    if (!ipToAttach || !selectedVpsId) return;
    setIsAttaching(true);
    try {
      const res = await fetch(`/api/user/reserved-ips/${ipToAttach.id}/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vpsId: parseInt(selectedVpsId) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to attach IP");

      toast.success(data.message, { duration: 8000 });
      setShowAttachModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAttaching(false);
    }
  };

  const handleOpenReleaseModal = (ip: any) => {
    setIpToRelease(ip);
    setShowReleaseModal(true);
  };

  const handleRelease = async () => {
    if (!ipToRelease) return;
    setIsReleasing(true);
    try {
      const res = await fetch(`/api/user/reserved-ips/${ipToRelease.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("IP released successfully!");
        setShowReleaseModal(false);
        fetchData();
      } else {
        toast.error(data.error || "Failed to release IP");
      }
    } catch (error) {
      toast.error("Internal server error");
    } finally {
      setIsReleasing(false);
      setIpToRelease(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className={cn("relative overflow-hidden rounded-3xl border p-6 md:p-8 group", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
              <Network className="w-3 h-3" />
              Network Infrastructure
            </div>
            <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Reserved <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>IPs</span>
            </h1>
            <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>
              Reserve static IPv4 and IPv6 addresses to use with your Cloud VPS or Managed K3s deployments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {ips.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className={cn("bg-white/5 hover:bg-white/10 border font-medium text-sm px-4 py-3 rounded-2xl flex items-center gap-2 transition-all hover:border-white/20", isDark ? "border-white/10 text-zinc-300" : "border-slate-200 text-slate-500")}
              >
                <div className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-all ${selectedIps.length === ips.length && ips.length > 0
                  ? 'bg-cyan-500 text-[#0f172a]'
                  : 'bg-[#060b14] border border-slate-800 text-transparent'
                  }`}>
                  <CheckCircle className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="hidden sm:inline">Select All</span>
              </button>
            )}
            {selectedIps.length > 0 && (
              <button
                onClick={() => setShowBulkReleaseModal(true)}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium text-sm px-4 py-3 rounded-2xl flex items-center gap-2 transition-all hover:border-red-500/40"
              >
                <Trash2 className="w-4 h-4" />
                Release ({selectedIps.length})
              </button>
            )}
            <Link
              href="/dashboard/reserved-ips/new"
              className={cn("px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-all shadow-md hover:-translate-y-0.5 inline-flex items-center justify-center gap-2", "")}
            >
              <Plus className="w-4 h-4" />
              Reserve New IP
            </Link>
          </div>
        </div>
      </div>

      {ips.length === 0 ? (
        <div className={cn("border rounded-3xl p-12 text-center", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-slate-50")}>
            <Network className={cn("w-10 h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-400")} />
          </div>
          <h4 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Reserved IPs</h4>
          <p className={cn("text-sm max-w-md mx-auto mb-8 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            You don't have any reserved IP addresses yet. Reserve an IP to ensure it's always yours and ready to be attached to your services.
          </p>
          <Link
            href="/dashboard/reserved-ips/new"
            className={cn("px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-all shadow-md hover:-translate-y-0.5 inline-flex items-center justify-center gap-2", "")}
          >
            Reserve Your First IP
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ips.map(ip => (
            <div key={ip.id} className={cn("border rounded-xl p-5 transition-all relative", isDark ? "bg-[#0b1322] border-slate-800/80 hover:border-slate-700 shadow-md" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm")}>
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => toggleSelectIp(ip.id)}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all ${selectedIps.includes(ip.id)
                    ? 'bg-cyan-500 text-[#0f172a]'
                    : 'bg-[#060b14] border border-slate-800 text-transparent'
                    }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${ip.isAttached ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-1.5 pt-0.5 w-full">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("inline-flex items-center justify-center p-1 rounded bg-zinc-800 border border-zinc-700", isDark ? "text-zinc-400" : "text-slate-500")} title="Local IP">
                          <Network className="w-3.5 h-3.5" />
                        </span>
                        <h3 className={cn("text-[15px] font-mono font-bold leading-none", isDark ? "text-white" : "text-slate-900")}>{ip.ipAddress}</h3>
                        <button onClick={() => handleCopy(ip.ipAddress)} className={cn("transition-colors", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900")} title="Copy Local IP">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {ip.publicIp && (
                        <>
                          <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center p-1 rounded bg-cyan-900/30 text-cyan-500 border border-cyan-800/50" title="Public IP">
                              <Globe className="w-3.5 h-3.5" />
                            </span>
                            <h3 className="text-[15px] font-mono font-bold text-cyan-400 leading-none">{ip.publicIp}</h3>
                            <button onClick={() => handleCopy(ip.publicIp)} className="text-cyan-600 hover:text-cyan-300 transition-colors" title="Copy Public IP">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={cn("font-medium w-16", isDark ? "text-zinc-500" : "text-slate-500")}>Status:</span>
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${ip.isAttached ? 'bg-cyan-500' : 'bg-zinc-500'}`} />
                          <span className={ip.isAttached ? "text-cyan-400" : "text-zinc-400"}>
                            {ip.isAttached ? "Attached" : "Unattached"}
                          </span>
                        </div>
                      </div>
                      
                      {ip.isAttached && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className={cn("font-medium w-16", isDark ? "text-zinc-500" : "text-slate-500")}>Service:</span>
                          <span className={cn("font-medium truncate max-w-[200px] px-2 py-0.5 bg-white/5 rounded border", isDark ? "text-white border-white/10" : "text-slate-900 border-slate-200")}>
                            {ip.vps?.hostname || ip.vps?.name || 'Service'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn("space-y-2 mb-4 rounded-lg p-3 border", isDark ? "bg-black/20 border-white/5" : "bg-slate-50/50 border-slate-200")}>
                <div className="flex justify-between text-sm">
                  <span className={cn("", isDark ? "text-zinc-400" : "text-slate-500")}>Accumulated Cost</span>
                  <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>
                    {formatRupiah(ip.accumulatedCost)}
                  </span>
                </div>
                <div className={cn("pt-2 mt-2 border-t", isDark ? "border-white/5" : "border-slate-200")}>
                  <p className={cn("text-[11px] leading-relaxed", isDark ? "text-zinc-500" : "text-slate-500")}>
                    {ip.isAttached ? (
                      <>This IP is currently attached. Its billing is now <strong className={cn("", isDark ? "text-zinc-400" : "text-slate-500")}>merged into the VPS invoice</strong>. The standalone invoice is paused.</>
                    ) : (
                      <>Billed via standalone invoice. If attached to a VPS, its cost will <strong className={cn("", isDark ? "text-zinc-400" : "text-slate-500")}>merge into the VPS invoice</strong> automatically.</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {!ip.isAttached && (
                  <>
                    <button
                      onClick={() => handleOpenAttachModal(ip)}
                      className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      Attach VPS
                    </button>
                    <button
                      onClick={() => router.push('/dashboard/checkout')}
                      className="flex-1 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      Deploy New
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleOpenReleaseModal(ip)}
                  className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Release IP
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        onConfirm={handleRelease}
        title="Release IP Address"
        description={`Are you sure you want to release the IP address ${ipToRelease?.ipAddress}? You will lose this IP permanently.`}
        confirmText="Release IP"
        cancelText="Cancel"
        variant="danger"
        isLoading={isReleasing}
      />

      <ConfirmModal
        isOpen={showBulkReleaseModal}
        onClose={() => setShowBulkReleaseModal(false)}
        onConfirm={handleBulkRelease}
        title={`Release ${selectedIps.length} IP Addresses`}
        description={`Are you sure you want to release the ${selectedIps.length} selected IP addresses? You will lose these IPs permanently.`}
        confirmText={`Release ${selectedIps.length} IPs`}
        cancelText="Cancel"
        variant="danger"
        isLoading={isBulkReleasing}
      />

      {showAttachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={cn("border rounded-2xl p-6 max-w-md w-full shadow-md relative", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Attach Reserved IP</h3>
            <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
              Attach <strong className={cn("", isDark ? "text-white" : "text-slate-900")}>{ipToAttach?.ipAddress}</strong> to an existing VPS. This will replace the current primary public IP of the VPS.
            </p>

            <div className="mb-6">
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-500")}>Select VPS</label>
              <Select
                value={selectedVpsId}
                onChange={(val) => setSelectedVpsId(val)}
                options={vpsList.map(vps => ({
                  value: vps.id.toString(),
                  label: `${vps.hostname || vps.name} (IP: ${vps.assignedIps?.[0]?.publicIp || vps.assignedIps?.[0]?.ipAddress || vps.vpcIp || 'None'})`
                }))}
                placeholder="-- Choose a VPS --"
                className="w-full py-3 px-4 text-sm rounded-xl"
              />
            </div>

            <div className={cn("border p-4 rounded-xl mb-6 flex items-start gap-3 text-sm", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
              <Info className={cn("w-5 h-5 flex-shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              <div>
                <p className={cn("font-medium mb-1", isDark ? "text-cyan-400" : "text-cyan-900")}>Important Notice:</p>
                <p className="text-xs leading-relaxed">
                  After attaching, you must <strong>Reboot</strong> your VPS from the dashboard to apply the new network configuration.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAttachModal(false)}
                className={cn("px-4 py-2 text-sm font-medium hover:text-white transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                disabled={isAttaching}
              >
                Cancel
              </button>
              <button
                onClick={handleAttach}
                disabled={!selectedVpsId || isAttaching}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-[#0f172a] font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAttaching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Attach IP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}