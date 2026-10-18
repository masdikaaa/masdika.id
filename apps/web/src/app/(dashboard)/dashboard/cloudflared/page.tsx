"use client";

import { useUrlTab } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Network, ArrowRight, ArrowLeft, ChevronLeft, Globe, CheckCircle2, Copy, ChevronDown, Save,
  ShieldAlert, ExternalLink, Trash2, Plus, RefreshCw, AlertTriangle,
  Activity, Server, XCircle, Pencil, Link, Info
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/Select";

type Step = 1 | 2 | 3;
type OS = "windows" | "debian" | "redhat" | "docker";
type ServiceType = "http" | "https";
type ActiveTab = "domains" | "tunnels";
type TunnelTab = "overview" | "routes";

interface Domain {
  id: number;
  cfZoneId: string;
  domain: string;
  nameServers: string[];
  status: string;
  createdAt: string;
}

interface Tunnel {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  connections: any[];
  connsActiveAt: string | null;
}

const MAX_TUNNELS = 3;
const MAX_DOMAINS = 5;

const ConnectorInstructions = ({ isDark, 
  selectedOS,
  setSelectedOS,
  tunnelToken,
  copyToClipboard,
  onRefreshToken,
  isRefreshingToken,
  selectedArch,
  setSelectedArch,
}: {
  selectedOS: OS;
  setSelectedOS: (os: OS) => void;
  tunnelToken: string;
  copyToClipboard: (t: string) => void;
  onRefreshToken: () => void;
  isRefreshingToken: boolean;
  selectedArch: string;
  setSelectedArch: (arch: string) => void;
  isDark: boolean;
}) => {
  const CodeBox = ({ code, prefix = "$" }: { code: string; prefix?: string }) => (
    <div className={cn("relative rounded-xl p-4 flex items-start justify-between gap-4 font-mono text-sm group border shadow-inner", isDark ? "bg-[#0a1624] border-white/10" : "bg-slate-50 border-slate-200")}>
      <div className={cn("overflow-x-auto whitespace-pre pb-2 leading-relaxed custom-scrollbar", isDark ? "text-zinc-300" : "text-slate-700 font-semibold")}>
        {prefix && <span className="text-yellow-500 mr-3">{prefix}</span>}{code}
      </div>
      <button onClick={() => copyToClipboard(code)}
        className={cn("p-2 rounded-lg transition-colors shrink-0", isDark ? "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900")}>
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-8 text-left">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col justify-end space-y-2 h-full">
            <label className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>Select your device&apos;s operating system</label>
            <Select
              value={selectedOS}
              onChange={(val) => setSelectedOS(val.toString() as OS)}
              options={[
                { value: "debian", label: "Debian" },
                { value: "windows", label: "Windows" },
                { value: "redhat", label: "Red Hat" },
                { value: "docker", label: "Docker" }
              ]}
              className={cn("w-full border rounded-lg px-4 py-2 text-sm cursor-pointer", isDark ? "bg-black/40 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm")}
            />
          </div>
          <div className="flex flex-col justify-end space-y-2 h-full">
            <label className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>Choose an architecture</label>
            <Select
              value={selectedArch}
              onChange={(val) => setSelectedArch(val.toString())}
              options={[
                { value: "64-bit", label: "64-bit" },
                { value: "32-bit", label: "32-bit" },
                { value: "arm64-bit", label: "arm64-bit" },
                { value: "arm32-bit", label: "arm32-bit" }
              ]}
              className={cn("w-full border rounded-lg px-4 py-2 text-sm cursor-pointer", isDark ? "bg-black/40 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {selectedOS === "windows" && (
          <div className={cn("space-y-4 text-sm", isDark ? "text-zinc-300" : "text-slate-500")}>
            <div className="space-y-1">
              <p>1. Download</p>
              <a href={`https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-${selectedArch.includes('32') ? '386' : 'amd64'}.msi`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-block break-all">
                https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-{selectedArch.includes('32') ? '386' : 'amd64'}.msi
              </a>
            </div>
            <p>2. Run the installer.</p>
            <p>3. Open Command Prompt as Administrator.</p>
            <p>4. Run the following command:</p>
            <CodeBox code={`cloudflared.exe service install ${tunnelToken}`} />
          </div>
        )}

        {selectedOS === "debian" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>If you don&apos;t have cloudflared installed on your machine:</p>
              <CodeBox code={`# Add cloudflare gpg key\nsudo mkdir -p --mode=0755 /usr/share/keyrings\ncurl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | sudo tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null\n\n# Add this repo to your apt repositories\necho 'deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list\n\n# install cloudflared\nsudo apt-get update && sudo apt-get install cloudflared`} />
            </div>
            <div className="space-y-3">
              <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>After you have installed cloudflared on your machine, you can install a service to automatically run your tunnel whenever your machine starts:</p>
              <CodeBox code={`sudo cloudflared service install ${tunnelToken}`} />
            </div>
            <div className="space-y-3">
              <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>OR run the tunnel manually in your current terminal session only:</p>
              <CodeBox code={`cloudflared tunnel run --token ${tunnelToken}`} />
            </div>
          </div>
        )}

        {selectedOS === "redhat" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>If you don&apos;t have cloudflared installed on your machine:</p>
              <CodeBox code={`# Add cloudflared.repo to /etc/yum.repos.d/\ncurl -fsSl https://pkg.cloudflare.com/cloudflared.repo | sudo tee /etc/yum.repos.d/cloudflared.repo\n\n#update repo\nsudo yum update\n\n# install cloudflared\nsudo yum install cloudflared`} />
            </div>
            <div className="space-y-3">
              <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>After you have installed cloudflared on your machine, you can install a service to automatically run your tunnel whenever your machine starts:</p>
              <CodeBox code={`sudo cloudflared service install ${tunnelToken}`} />
            </div>
            <div className="space-y-3">
              <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>OR run the tunnel manually in your current terminal session only:</p>
              <CodeBox code={`cloudflared tunnel run --token ${tunnelToken}`} />
            </div>
          </div>
        )}

        {selectedOS === "docker" && (
          <div className="space-y-3">
            <CodeBox code={`docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token ${tunnelToken}`} />
          </div>
        )}
      </div>



      <div className="pt-8 space-y-4">
        <h4 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>Refresh token</h4>
        <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>You may need to generate a new token for security reasons.</p>
        
        <div className={cn("border rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-start gap-3 sm:gap-3.5 transition-all shadow-sm", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
          <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
          <div className="space-y-1 flex-1 min-w-0">
            <p className={cn("font-medium text-xs sm:text-sm", isDark ? "text-cyan-400" : "text-cyan-900")}>Security Notice:</p>
            <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-cyan-200/90" : "text-slate-600")}>
              This action will invalidate the previous token. Note that this will prevent new connections made with the old token, but it won&apos;t close existing connections.
            </p>
          </div>
        </div>

        <button 
          onClick={onRefreshToken}
          disabled={isRefreshingToken}
          className="px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold text-sm rounded-lg transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshingToken && "animate-spin")} />
          {isRefreshingToken ? "Refreshing..." : "Refresh token"}
        </button>
      </div>
    </div>
  );
};

export default function CloudflaredPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  // Tabs
  const fetchDomains = async () => {
    setDomainsLoading(true);
    try {
      const res = await fetch("/api/tunnels/domains");
      const data = await res.json();
      if (res.ok) setDomains(data.domains || []);
    } catch { /* ignore */ }
    finally { setDomainsLoading(false); }
  };

  const fetchTunnels = async () => {
    setTunnelsLoading(true);
    try {
      const res = await fetch("/api/tunnels/list");
      const data = await res.json();
      if (res.ok) setTunnels(data.tunnels || []);
    } catch { /* ignore */ }
    finally { setTunnelsLoading(false); }
  };

  const [activeTab, setActiveTab] = useUrlTab<ActiveTab>("domains");

  // Domain state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState("");
  const [addDomainLoading, setAddDomainLoading] = useState(false);
  const [newlyAddedDomain, setNewlyAddedDomain] = useState<Domain | null>(null);
  const [deleteDomainModal, setDeleteDomainModal] = useState<Domain | null>(null);
  const [deleteDomainLoading, setDeleteDomainLoading] = useState(false);
  const [checkingDomainId, setCheckingDomainId] = useState<number | null>(null);

  // Tunnel state
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [tunnelsLoading, setTunnelsLoading] = useState(true);
  const [deleteTunnelModal, setDeleteTunnelModal] = useState<Tunnel | null>(null);
  const [deleteTunnelLoading, setDeleteTunnelLoading] = useState(false);

  // Create tunnel flow
  const [showCreateTunnel, setShowCreateTunnel] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [tunnelName, setTunnelName] = useState("");
  const [tunnelToken, setTunnelToken] = useState("");
  const [tunnelId, setTunnelId] = useState("");
  const [selectedOS, setSelectedOS] = useState<OS>("debian");
  const [selectedArch, setSelectedArch] = useState("64-bit");
  const [selectedDomainId, setSelectedDomainId] = useState<number | "">("");
  const [subdomain, setSubdomain] = useState("");
  const [path, setPath] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("http");
  const [serviceUrl, setServiceUrl] = useState("");
  const [noTlsVerify, setNoTlsVerify] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditModeRoute, setIsEditModeRoute] = useState(false);
  const [editingTunnelId, setEditingTunnelId] = useState<string | null>(null);
  const [existingIngress, setExistingIngress] = useState<any[]>([]);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);

  // View Tunnel Details State
  const [viewingTunnel, setViewingTunnel] = useState<Tunnel | null>(null);
  const [activeTunnelTab, setActiveTunnelTab] = useState<TunnelTab>("overview");
  const [showAddConnector, setShowAddConnector] = useState(false);
  const [userVpsCount, setUserVpsCount] = useState(1);

  const isHttps = serviceType === "https";
  const selectedDomain = domains.find(d => d.id === selectedDomainId);
  const fullHostname = selectedDomain
    ? (subdomain ? `${subdomain}.${selectedDomain.domain}` : selectedDomain.domain)
    : "";

  useEffect(() => {
    fetchDomains();
    fetchTunnels();
  }, []);

  // ==================== DOMAIN FUNCTIONS ====================

  const handleAddDomain = async () => {
    if (!newDomainName.trim()) {
      toast.error("Please enter a domain name");
      return;
    }
    setAddDomainLoading(true);
    try {
      const res = await fetch("/api/tunnels/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomainName.trim().toLowerCase() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Domain added to Cloudflare!");
        setNewlyAddedDomain(data.domain);
        setNewDomainName("");
        setShowAddDomain(false);
        fetchDomains();
      } else {
        toast.error(data.error || "Failed to add domain");
      }
    } catch {
      toast.error("Failed to add domain");
    } finally {
      setAddDomainLoading(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!deleteDomainModal) return;
    setDeleteDomainLoading(true);
    try {
      const res = await fetch(`/api/tunnels/domains/${deleteDomainModal.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Domain removed!");
        setDeleteDomainModal(null);
        fetchDomains();
      } else {
        toast.error(data.error || "Failed to remove domain");
      }
    } catch {
      toast.error("Failed to remove domain");
    } finally {
      setDeleteDomainLoading(false);
    }
  };

  const handleCheckNameserver = async (domain: Domain) => {
    setCheckingDomainId(domain.id);
    try {
      const res = await fetch(`/api/tunnels/domains/${domain.id}/check`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.status === "active") {
          toast.success(data.message);
          fetchDomains();
        } else {
          toast.info(data.message);
        }
      } else {
        toast.error(data.error || "Failed to check domain");
      }
    } catch {
      toast.error("Failed to check domain");
    } finally {
      setCheckingDomainId(null);
    }
  };

  // ==================== TUNNEL FUNCTIONS ====================

  const handleDeleteTunnel = async () => {
    if (!deleteTunnelModal) return;
    setDeleteTunnelLoading(true);
    try {
      const res = await fetch(`/api/tunnels/${deleteTunnelModal.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Tunnel deleted!");
        setDeleteTunnelModal(null);
        fetchTunnels();
      } else {
        toast.error(data.error || "Failed to delete tunnel");
      }
    } catch {
      toast.error("Failed to delete tunnel");
    } finally {
      setDeleteTunnelLoading(false);
    }
  };

  const handleSaveTunnel = async () => {
    if (!tunnelName) { toast.error("Please enter a tunnel name"); return; }
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        // Rename existing tunnel
        const res = await fetch(`/api/tunnels/${tunnelId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tunnelName })
        });
        const data = await res.json();
        if (res.ok) {
          toast.success("Tunnel renamed successfully!");
          fetchTunnels();
          setCurrentStep(2);
        } else {
          toast.error(data.error || "Failed to rename tunnel");
        }
      } else {
        // Create new tunnel
        const res = await fetch("/api/tunnels/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tunnelName })
        });
        const data = await res.json();
        if (res.ok) {
          setTunnelToken(data.token);
          setTunnelId(data.tunnelId);
          toast.success("Tunnel created successfully!");
          fetchTunnels();
          setCurrentStep(2);
        } else {
          toast.error(data.error || "Failed to create tunnel");
        }
      }
    } catch {
      toast.error(isEditMode ? "Failed to rename tunnel" : "Failed to create tunnel");
    }
    finally { setIsSubmitting(false); }
  };

  const handleSaveRoute = async () => {
    if (!selectedDomainId) { toast.error("Please select a domain"); return; }
    if (!serviceType) { toast.error("Please select a service type"); return; }
    if (!serviceUrl) { toast.error("Please enter a service URL"); return; }
    if (isHttps && !noTlsVerify) { toast.error("You must check 'No TLS Verify' when using HTTPS"); return; }
    if (!tunnelId) { toast.error("Missing Tunnel ID"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tunnels/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tunnelId, tunnelName, domainId: selectedDomainId, subdomain, path,
          serviceType, serviceUrl, noTlsVerify: isHttps ? noTlsVerify : undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(isEditModeRoute ? "Route updated successfully!" : "Route configured successfully!");
        
        if (editingTunnelId) {
          const tunnel = tunnels.find(t => t.id === editingTunnelId);
          resetCreateForm();
          if (tunnel) {
            handleEditTunnel(tunnel).then(() => {
              setActiveTunnelTab("routes");
            });
          }
        } else {
          resetCreateForm();
          fetchTunnels();
        }
        setShowCreateTunnel(false);
      } else {
        toast.error(data.error || "Failed to configure route");
      }
    } catch { toast.error("Failed to configure route"); }
    finally { setIsSubmitting(false); }
  };

  const resetCreateForm = () => {
    setCurrentStep(1);
    setTunnelName(""); setTunnelToken(""); setTunnelId("");
    setSelectedDomainId(""); setSubdomain(""); setPath("");
    setServiceType("http"); setServiceUrl(""); setNoTlsVerify(false);
    setIsEditMode(false); setIsEditModeRoute(false); setExistingIngress([]);
  };

  const handleEditTunnel = async (tunnel: Tunnel) => {
    setEditingTunnelId(tunnel.id);
    try {
      const res = await fetch(`/api/tunnels/${tunnel.id}`);
      const data = await res.json();
      if (res.ok) {
        setTunnelId(data.tunnelId);
        setTunnelName(data.name);
        setTunnelToken(data.token);
        setExistingIngress(data.ingress || []);
        setUserVpsCount(data.vpsCount || 1);
        setIsEditMode(true);
        setViewingTunnel({
          ...tunnel,
        });
        setActiveTunnelTab("overview");
      } else {
        toast.error(data.error || "Failed to load tunnel info");
        setEditingTunnelId(null);
      }
    } catch {
      toast.error("Failed to load tunnel info");
      setEditingTunnelId(null);
    }
  };

  const handleEditRoute = (rule: any) => {
    // Match the longest domain that ends with the hostname
    const matchedDomain = domains
      .filter(d => rule.hostname === d.domain || rule.hostname.endsWith(`.${d.domain}`))
      .sort((a, b) => b.domain.length - a.domain.length)[0];
    
    if (matchedDomain) {
      setSelectedDomainId(matchedDomain.id);
      if (rule.hostname === matchedDomain.domain) {
        setSubdomain("");
      } else {
        const sub = rule.hostname.slice(0, rule.hostname.length - matchedDomain.domain.length - 1);
        setSubdomain(sub);
      }
    } else {
      toast.error("Domain not found in your account");
    }
    
    setPath(rule.path || "");
    
    if (rule.service) {
      const parts = rule.service.split('://');
      if (parts.length >= 2) {
        setServiceType((parts[0] as ServiceType) || "http");
        setServiceUrl(parts.slice(1).join('://') || "");
      }
    }
    if (rule.originRequest?.noTLSVerify) {
      setNoTlsVerify(true);
    } else {
      setNoTlsVerify(false);
    }
    
    
    setShowCreateTunnel(true);
    setViewingTunnel(null);
    setIsEditModeRoute(true);
    setCurrentStep(3);
  };

  const handleDeleteRoute = async (rule: any) => {
    if (!confirm(`Are you sure you want to delete the route for ${rule.hostname}?`)) return;
    
    const deletePromise = fetch(`/api/tunnels/route?tunnelId=${tunnelId}&hostname=${rule.hostname}&path=${encodeURIComponent(rule.path || "")}`, {
      method: "DELETE"
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete route");
      
      // Refresh ingress rules
      const refreshRes = await fetch(`/api/tunnels/${editingTunnelId || viewingTunnel?.id}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setExistingIngress(refreshData.ingress || []);
      }
      return data;
    });

    toast.promise(deletePromise, {
      loading: "Deleting route...",
      success: "Route deleted successfully",
      error: (err) => err.message
    });
  };

  // ==================== HELPERS ====================
  const handleRefreshToken = async () => {
    if (!tunnelId) return;
    setIsRefreshingToken(true);
    try {
      const res = await fetch(`/api/tunnels/${tunnelId}/token`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setTunnelToken(data.token);
        toast.success("Token refreshed successfully.");
      } else {
        toast.error(data.error || "Failed to refresh token");
      }
    } catch (e) {
      toast.error("An error occurred while refreshing the token");
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getInstallScript = () => {
    switch (selectedOS) {
      case "windows":
        return `cloudflared.exe service install ${tunnelToken}`;
      case "debian":
        return `wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb; sudo dpkg -i cloudflared-linux-amd64.deb; sudo cloudflared service install ${tunnelToken}`;
      case "redhat":
        return `wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm; sudo rpm -ivh cloudflared-linux-x86_64.rpm; sudo cloudflared service install ${tunnelToken}`;
      case "docker":
        return `docker run -d --restart always cloudflare/cloudflared:latest tunnel --no-autoupdate run --token ${tunnelToken}`;
      default:
        return `cloudflared service install ${tunnelToken}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active": return isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "healthy": return isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "pending": return isDark ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-yellow-50 text-yellow-700 border-yellow-300";
      default: return isDark ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-slate-100 text-slate-500 border-slate-200";
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

  // ==================== RENDER ====================
  if (viewingTunnel) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-300">
        {/* Back Button */}
        <div className="flex items-center mb-4">
          <button onClick={() => { setViewingTunnel(null); setIsEditMode(false); setEditingTunnelId(null); fetchTunnels(); }}
            className={cn(
              "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border shadow-sm",
              isDark 
                ? "text-zinc-400 hover:text-white bg-[#0b1322] hover:bg-[#111c33] border-slate-800 hover:border-cyan-500/40" 
                : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200"
            )}>
            <ChevronLeft className="w-4 h-4" /> Back to tunnel list
          </button>
        </div>

        {/* Top Info Cards */}
        <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-2xl border", isDark ? "glass border-white/5" : "bg-white border-slate-200 shadow-sm")}>
          <div>
            <p className={cn("text-sm mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Tunnel name</p>
            <div className="flex items-center gap-2">
              <span className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-900")}>{tunnelName}</span>
              <button onClick={() => { setShowCreateTunnel(true); setViewingTunnel(null); setCurrentStep(1); }} className="text-xs text-cyan-400 hover:text-cyan-300">Edit</button>
            </div>
          </div>
          <div>
            <p className={cn("text-sm mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Status</p>
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border inline-block mt-1",
              viewingTunnel.connections?.length > 0 ? (isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200") : getStatusColor(viewingTunnel.status))}>
              {viewingTunnel.connections?.length > 0 ? "Healthy" : (viewingTunnel.status || "Inactive")}
            </span>
          </div>
          <div>
            <p className={cn("text-sm mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Tunnel type</p>
            <p className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>cloudflared</p>
          </div>
          <div className="min-w-0">
            <p className={cn("text-sm mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Tunnel ID</p>
            <div className={cn("flex items-center gap-2 text-sm font-mono group cursor-pointer", isDark ? "text-white" : "text-slate-900")} onClick={() => copyToClipboard(tunnelId)}>
              <span className="truncate">{tunnelId}</span>
              <Copy className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={cn("flex gap-1 border-b overflow-x-auto custom-scrollbar", isDark ? "border-white/10" : "border-slate-200")}>
          {(["overview", "routes"] as TunnelTab[]).map(t => (
            <button key={t} onClick={() => setActiveTunnelTab(t)}
              className={cn("px-6 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2",
                activeTunnelTab === t ? "text-cyan-400 border-cyan-400 bg-cyan-500/5" : "text-zinc-400 border-transparent hover:text-white hover:bg-white/5")}>
              {t === "overview" ? "Overview" : "Public Hostname Routes"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTunnelTab === "overview" && (() => {
          // Group connections by client_id (connector) to match Cloudflare's UI
          // Each connection entry from CF API is a single colo connection with fields:
          // id, client_id, colo_name, origin_ip, client_version, _arch, _hostname, etc.
          const groupedConnectors = (() => {
            if (!viewingTunnel.connections || viewingTunnel.connections.length === 0) return [];
            const map = new Map<string, any>();
            for (const conn of viewingTunnel.connections) {
              const key = conn.client_id || conn.id;
              if (!map.has(key)) {
                // If conn is a connector object, origin_ip is inside conns array
                const originIp = conn.origin_ip || (conn.conns && conn.conns.length > 0 ? conn.conns[0].origin_ip : "-");
                
                map.set(key, {
                  connectorId: key,
                  hostname: conn._hostname || "-", // We'll keep the column but it might be empty if CF doesn't provide it
                  dataCenters: new Set<string>(),
                  originIp: originIp || "-",
                  version: conn.client_version || conn.version || "-",
                  platform: conn._arch || conn.arch || conn.platform || "-",
                });
              }
              const entry = map.get(key)!;
              // Each connection entry has its own colo_name — strip trailing digits (SIN11 → sin)
              if (conn.colo_name) {
                entry.dataCenters.add(conn.colo_name.replace(/\d+$/, '').toLowerCase());
              }
              // Also check nested conns array (some API versions)
              if (conn.conns) {
                for (const c of conn.conns) {
                  if (c.colo_name) entry.dataCenters.add(c.colo_name.replace(/\d+$/, '').toLowerCase());
                }
              }
            }
            return Array.from(map.values()).map(e => ({
              ...e,
              dataCenters: Array.from(e.dataCenters).join(", ") || "-",
            }));
          })();

          const activeConnectors = groupedConnectors.length;
          const canAddConnector = activeConnectors < userVpsCount;

          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Connectors</h2>
                  <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Review established connections between Cloudflare's network and your infrastructure.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchTunnels}
                    disabled={tunnelsLoading}
                    className={cn("p-2 rounded-xl border transition-all disabled:opacity-50",
                      isDark ? "border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white bg-black/20" : "border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 bg-white")}
                    title="Refresh connectors"
                  >
                    <RefreshCw className={cn("w-4 h-4", tunnelsLoading && "animate-spin")} />
                  </button>
                  <button
                    onClick={() => {
                      if (canAddConnector) setShowAddConnector(true);
                      else toast.error(`Connector limit reached. You can only run ${userVpsCount} connector(s) with your ${userVpsCount} active VPS.`);
                    }}
                    className={cn("px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-2",
                      canAddConnector ? "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm" : "bg-white/5 text-zinc-500 border border-white/5 cursor-not-allowed")}
                    title={!canAddConnector ? `Limit reached: ${userVpsCount} VPS = ${userVpsCount} connector(s)` : ""}
                  >
                    Add a connector
                  </button>
                </div>
              </div>

              {groupedConnectors.length === 0 ? (
                <div className={cn("rounded-2xl p-8 text-center mt-6 border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-slate-50 border-slate-200")}>
                  <Server className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-zinc-600" : "text-slate-900")} />
                  <h3 className={cn("text-lg font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Connectors Found</h3>
                  <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>You haven't installed any connectors for this tunnel yet.</p>
                  <button onClick={() => setShowAddConnector(true)} className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold text-sm rounded-lg transition-all shadow-sm">Add a connector</button>
                </div>
              ) : (
                <div className={cn("rounded-2xl overflow-hidden mt-6 shadow-sm border", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max text-sm">
                      <thead>
                        <tr className={cn("border-b font-medium", isDark ? "border-white/5 bg-black/20 text-zinc-400" : "border-slate-200 bg-slate-100 text-slate-500")}>
                          <th className="py-4 px-6">Connector ID</th>
                          <th className="py-4 px-4">Data centers</th>
                          <th className="py-4 px-4">Origin IP</th>
                          <th className="py-4 px-4">Version</th>
                          <th className="py-4 px-4">Platform</th>
                          <th className="py-4 pr-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {groupedConnectors.map((conn) => (
                          <tr key={conn.connectorId} className={cn("transition-colors", isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50")}>
                            <td className="py-4 px-6 font-mono text-cyan-400 cursor-pointer" onClick={() => copyToClipboard(conn.connectorId)}>
                              <div className="flex items-center gap-1.5 group">
                                {conn.connectorId.substring(0, 8)}...
                                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </td>
                            <td className={cn("py-4 px-4", isDark ? "text-zinc-300" : "text-slate-500")}>{conn.dataCenters}</td>
                            <td className={cn("py-4 px-4 font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>{conn.originIp}</td>
                            <td className={cn("py-4 px-4", isDark ? "text-zinc-300" : "text-slate-500")}>{conn.version}</td>
                            <td className={cn("py-4 px-4", isDark ? "text-zinc-300" : "text-slate-500")}>{conn.platform}</td>
                            <td className="py-4 pr-6 text-green-400 font-medium">Connected</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeTunnelTab === "routes" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Public Hostname Routes</h2>
                <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Routes traffic from a public hostname to a local service.</p>
              </div>
              <button onClick={() => { setShowCreateTunnel(true); setViewingTunnel(null); setCurrentStep(3); }}
                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 shadow-sm">
                Add a route
              </button>
            </div>

            {existingIngress.length === 0 ? (
              <div className={cn("rounded-2xl p-8 text-center mt-6 border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-slate-50 border-slate-200")}>
                <Globe className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-zinc-600" : "text-slate-900")} />
                <h3 className={cn("text-lg font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Routes Configured</h3>
                <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>This tunnel has no public hostname routes.</p>
                <button onClick={() => { setShowCreateTunnel(true); setViewingTunnel(null); setCurrentStep(3); }} className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold text-sm rounded-lg transition-all shadow-sm">Add a route</button>
              </div>
            ) : (
              <div className={cn("rounded-2xl overflow-hidden mt-6 shadow-sm border", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
                <table className="w-full text-left border-collapse text-sm min-w-max">
                  <thead>
                    <tr className={cn("border-b", isDark ? "border-white/5 bg-black/20 text-zinc-400" : "border-slate-200 bg-slate-100 text-slate-500")}>
                      <th className="py-4 px-6 font-medium">Public Hostname</th>
                      <th className="py-4 px-6 font-medium">Local Service</th>
                      <th className="py-4 px-6 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {existingIngress.map((rule, i) => (
                      <tr key={i} className={cn("transition-colors", isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50")}>
                        <td className="py-4 px-6 text-cyan-400 font-mono">
                          {rule.hostname}{rule.path || ""}
                        </td>
                        <td className={cn("py-4 px-6 font-mono", isDark ? "text-zinc-300" : "text-slate-500")}>
                          {rule.service}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEditRoute(rule)} className={cn("p-2 rounded-lg transition-colors", isDark ? "hover:bg-white/10 text-zinc-400 hover:text-cyan-400" : "hover:bg-slate-200 text-slate-500 hover:text-cyan-600")} title="Edit route">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteRoute(rule)} className={cn("p-2 rounded-lg transition-colors", isDark ? "hover:bg-white/10 text-zinc-400 hover:text-red-400" : "hover:bg-slate-200 text-slate-500 hover:text-red-600")} title="Delete route">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Add Connector Slide-over Modal */}
        {showAddConnector && (
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/60  animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setShowAddConnector(false)}></div>
            <div className={cn("relative w-full max-w-md h-full shadow-2xl border-l flex flex-col animate-in slide-in-from-right-full duration-300", isDark ? "bg-[#0f172a] border-white/10" : "bg-white border-slate-200")}>
              <div className={cn("p-6 border-b flex items-center justify-between", isDark ? "border-white/10" : "border-slate-200")}>
                <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Install and run a connector</h3>
                <button onClick={() => setShowAddConnector(false)} className={cn("p-2 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-white bg-white/5" : "text-slate-500 hover:text-slate-900 bg-slate-100")}><XCircle className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <ConnectorInstructions isDark={isDark}
                  selectedOS={selectedOS}
                  setSelectedOS={(os) => setSelectedOS(os)}
                  tunnelToken={tunnelToken}
                  copyToClipboard={copyToClipboard}
                  onRefreshToken={handleRefreshToken}
                  isRefreshingToken={isRefreshingToken}
                  selectedArch={selectedArch}
                  setSelectedArch={setSelectedArch}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className={cn("relative overflow-hidden rounded-3xl  border p-6 md:p-8 group shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
              <Network className="w-3 h-3" /> Secure Connections
            </div>
            <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Cloudflared <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Tunnels</span>
            </h1>
            <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Add your domains, create tunnels, and securely expose your local services to the internet.</p>
          </div>
          <button onClick={() => { fetchDomains(); fetchTunnels(); }}
            className={cn("p-2.5 md:p-3  rounded-2xl border transition-colors shrink-0 self-start", isDark ? "bg-[#011627]/80 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm")}
            title="Refresh">
            <RefreshCw className={cn("w-4 h-4", (domainsLoading || tunnelsLoading) && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={cn("flex items-center gap-1 border rounded-xl p-1", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
        <button onClick={() => setActiveTab("domains")}
          className={cn("flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "domains" ? (isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-white text-cyan-700 border border-cyan-200 shadow-sm") : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50")
          )}>
          <Globe className="w-4 h-4" /> Domains
          <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full">{domains.length}</span>
        </button>
        <button onClick={() => setActiveTab("tunnels")}
          className={cn("flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "tunnels" ? (isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-white text-cyan-700 border border-cyan-200 shadow-sm") : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50")
          )}>
          <Network className="w-4 h-4" /> Tunnels
          <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full">{tunnels.length}</span>
        </button>
      </div>

      {/* ==================== DOMAINS TAB ==================== */}
      {activeTab === "domains" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* NS Info for Newly Added Domain */}
          {newlyAddedDomain && (
            <div className={cn("rounded-xl p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 relative border", isDark ? "bg-[#0b162c] border-cyan-500/30 shadow-sm" : "bg-white border-slate-200/90 shadow-sm")}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-slate-100 border-slate-200")}>
                    <Info className={cn("w-5 h-5", isDark ? "text-cyan-500" : "text-cyan-600")} />
                  </div>
                  <div>
                    <h3 className={cn("text-[15px] font-bold mb-0.5", isDark ? "text-white" : "text-slate-900")}>Domain Added: {newlyAddedDomain.domain}</h3>
                    <p className={cn("text-[13px]", isDark ? "text-zinc-400" : "text-slate-500")}>Update your nameservers at your domain registrar to activate.</p>
                  </div>
                </div>
                <button onClick={() => setNewlyAddedDomain(null)} className={cn("transition-colors p-1", isDark ? "text-zinc-400 hover:text-white" : "text-slate-400 hover:text-slate-600")}>
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <h4 className={cn("text-[13px] font-bold", isDark ? "text-cyan-400" : "text-slate-800")}>Point your domain&apos;s nameservers to:</h4>
                <div className="space-y-2">
                  {newlyAddedDomain.nameServers.map((ns, i) => (
                    <div key={i} className={cn("flex items-center justify-between border rounded-lg px-4 py-3 font-mono text-[13px]", isDark ? "bg-black/40 border-cyan-500/20" : "bg-slate-50 border-slate-200")}>
                      <span className={cn(isDark ? "text-cyan-400" : "text-cyan-700 font-semibold")}>{ns}</span>
                      <button onClick={() => copyToClipboard(ns)} className={cn("p-1.5 rounded-md transition-colors border", isDark ? "border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-500 hover:text-cyan-400" : "border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900")}>
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className={cn("text-[11px] pt-2", isDark ? "text-zinc-500" : "text-slate-500")}>It may take up to 24 hours for nameserver changes to propagate. Status will change to &quot;Active&quot; once complete.</p>
              </div>
            </div>
          )}

          {/* Domain Actions Bar */}
          <div className="flex items-center justify-between">
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
              <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{domains.length}</span> / {MAX_DOMAINS} domains
            </p>
            {domains.length < MAX_DOMAINS && (
              <button
                onClick={() => {
                  if (userVpsCount === 0) {
                    toast.error("Smart System: You must order and have an active VPS first to add a Domain.");
                    return;
                  }
                  setShowAddDomain(!showAddDomain);
                }}
                className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all", userVpsCount === 0 ? (isDark ? "bg-white/10 text-zinc-500 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed") : "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm")}>
                <Plus className="w-4 h-4" /> Add Domain
              </button>
            )}
          </div>

          {/* Add Domain Form */}
          {showAddDomain && (
            <div className={cn("glass p-6 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4 duration-300", isDark ? "border-white/5" : "border-slate-200")}>
              <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-slate-900")}>Add a new domain</h3>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Enter your root domain name. After adding, you&apos;ll need to update your nameservers at your registrar.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Globe className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", isDark ? "text-zinc-500" : "text-slate-500")} />
                  <input type="text" value={newDomainName} onChange={(e) => setNewDomainName(e.target.value)}
                    placeholder="example.com"
                    onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                    className={cn("w-full border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all", isDark ? "bg-black/40 border-white/10 text-white placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm")} />
                </div>
                <button onClick={handleAddDomain} disabled={!newDomainName.trim() || addDomainLoading}
                  className="px-5 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm">
                  {addDomainLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {addDomainLoading ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          )}

          {/* Domain List */}
          {domainsLoading ? (
            <div className="min-h-[20vh] flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : domains.length === 0 ? (
            <div className={cn("border rounded-3xl p-12 text-center shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
              <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-slate-100")}>
                <Globe className={cn("w-10 h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-500")} />
              </div>
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Domains Added</h3>
              <p className={cn("max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>Add your first domain to get started. You&apos;ll need to point your domain&apos;s nameservers to Cloudflare.</p>
              <button
                onClick={() => {
                  if (userVpsCount === 0) {
                    toast.error("Smart System: You must order and have an active VPS first to add a Domain.");
                    return;
                  }
                  setShowAddDomain(true);
                }}
                className={cn("px-5 py-2.5 rounded-lg font-semibold text-sm transition-all inline-flex items-center gap-2", userVpsCount === 0 ? (isDark ? "bg-white/10 text-zinc-500 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed") : "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm")}>
                <Plus className="w-4 h-4" /> Add First Domain
              </button>
            </div>
          ) : (
            <div className={cn("border rounded-2xl shadow-sm overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className={cn("border-b text-xs font-semibold uppercase tracking-wider", isDark ? "border-white/5 bg-black/10 text-zinc-400" : "border-slate-200 bg-slate-100 text-slate-500")}>
                      <th className="py-4 pl-6 pr-4 font-medium">Domain</th>
                      <th className="py-4 px-4 font-medium">Status</th>
                      <th className="py-4 px-4 font-medium">Nameservers</th>
                      <th className="py-4 px-4 font-medium">Added</th>
                      <th className="py-4 pl-4 pr-6 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {domains.map((d) => (
                      <tr key={d.id} className={cn("transition-colors", isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50")}>
                        <td className="py-4 pl-6 pr-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 bg-blue-500/10 rounded-xl flex items-center justify-center">
                              <Globe className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{d.domain}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 align-middle">
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border", getStatusColor(d.status))}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 align-middle">
                          <div className="space-y-1">
                            {d.nameServers.map((ns, i) => (
                              <div key={i} onClick={() => copyToClipboard(ns)}
                                className={cn("text-xs font-mono hover:text-cyan-400 cursor-pointer transition-colors flex items-center gap-1 group/ns", isDark ? "text-zinc-400" : "text-slate-500")}>
                                {ns} <Copy className="w-3 h-3 opacity-0 group-hover/ns:opacity-100 transition-opacity" />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={cn("py-4 px-4 align-middle text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>{formatDate(d.createdAt)}</td>
                        <td className="py-4 pl-4 pr-6 align-middle text-right">
                          <div className="flex items-center justify-end gap-2">
                            {d.status !== "active" && d.status !== "healthy" && (
                              <button onClick={() => handleCheckNameserver(d)} disabled={checkingDomainId === d.id}
                                className={cn("p-2 rounded-lg transition-colors border shadow-sm", isDark ? "bg-white/5 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20 text-zinc-400 hover:text-cyan-400" : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800")} title="Check Nameserver">
                                <RefreshCw className={cn("w-4 h-4", checkingDomainId === d.id && "animate-spin")} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (tunnels.length > 0) {
                                  toast.error("Smart System: You must delete all tunnels before you can remove a domain.");
                                  return;
                                }
                                setDeleteDomainModal(d);
                              }}
                              className={cn("p-2 rounded-lg transition-colors border",
                                tunnels.length > 0
                                  ? "bg-white/5 text-zinc-500 border-white/5 cursor-not-allowed"
                                  : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20")}
                              title={tunnels.length > 0 ? "Delete all tunnels first" : "Remove Domain"}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TUNNELS TAB ==================== */}
      {activeTab === "tunnels" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* No domains warning */}
          {domains.length === 0 && !domainsLoading && (
            <div className={cn("border rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-start gap-3 sm:gap-3.5 transition-all shadow-sm", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
              <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              <div className="space-y-1 flex-1 min-w-0">
                <p className={cn("font-medium text-xs sm:text-sm", isDark ? "text-cyan-400" : "text-cyan-900")}>Note: Add a domain first.</p>
                <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-cyan-200/90" : "text-slate-600")}>You need at least one domain before creating tunnels. <button onClick={() => setActiveTab("domains")} className={cn("underline transition-colors font-medium", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-700")}>Go to Domains tab</button></p>
              </div>
            </div>
          )}

          {/* Tunnel Actions Bar */}
          {!showCreateTunnel && (
            <div className="flex items-center justify-between">
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{tunnels.length}</span> / {MAX_TUNNELS} tunnels
              </p>
              {domains.length > 0 && tunnels.length < MAX_TUNNELS && (
                <button
                  onClick={() => {
                    if (userVpsCount === 0) {
                      toast.error("Smart System: You must order and have an active VPS first to create a Cloudflare Tunnel.");
                      return;
                    }
                    resetCreateForm(); setShowCreateTunnel(true);
                  }}
                  className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all", userVpsCount === 0 ? (isDark ? "bg-white/10 text-zinc-500 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed") : "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm")}>
                  <Plus className="w-4 h-4" /> Create Tunnel
                </button>
              )}
              {showCreateTunnel && (
                <button onClick={() => { resetCreateForm(); setShowCreateTunnel(false); }}
                  className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all border", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm")}>
                  Back to List
                </button>
              )}
            </div>
          )}

          {/* Tunnel List */}
          {!showCreateTunnel && (
            <>
              {tunnelsLoading ? (
                <div className="min-h-[20vh] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
              ) : tunnels.length === 0 ? (
                <div className={cn("border rounded-3xl p-12 text-center shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                  <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-slate-100")}>
                    <Network className={cn("w-10 h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-500")} />
                  </div>
                  <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Tunnels Yet</h3>
                  <p className={cn("max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {domains.length === 0
                      ? "Add a domain first, then create your first tunnel."
                      : "Create your first Cloudflare Tunnel to securely expose your local services."}
                  </p>
                  {domains.length > 0 && (
                    <button
                      onClick={() => {
                        if (userVpsCount === 0) {
                          toast.error("Smart System: You must order and have an active VPS first to create a Cloudflare Tunnel.");
                          return;
                        }
                        resetCreateForm(); setShowCreateTunnel(true);
                      }}
                      className={cn("px-5 py-2.5 rounded-lg font-semibold text-sm transition-all inline-flex items-center gap-2", userVpsCount === 0 ? (isDark ? "bg-white/10 text-zinc-500 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed") : "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm")}>
                      <Plus className="w-4 h-4" /> Create Tunnel
                    </button>
                  )}
                </div>
              ) : (
                <div className={cn("border rounded-2xl shadow-sm overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className={cn("border-b text-xs font-semibold uppercase tracking-wider", isDark ? "border-white/5 bg-black/10 text-zinc-400" : "border-slate-200 bg-slate-100 text-slate-500")}>
                          <th className="py-4 pl-6 pr-4 font-medium">Tunnel Name</th>
                          <th className="py-4 px-4 font-medium">Status</th>
                          <th className="py-4 px-4 font-medium">Connections</th>
                          <th className="py-4 px-4 font-medium">Created</th>
                          <th className="py-4 px-4 font-medium">Tunnel ID</th>
                          <th className="py-4 pl-4 pr-6 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {tunnels.map((t) => (
                          <tr key={t.id} className={cn("transition-colors", isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50")}>
                            <td className="py-4 pl-6 pr-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 shrink-0 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                                  <Network className="w-5 h-5 text-cyan-400" />
                                </div>
                                <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{t.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 align-middle">
                              <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border",
                                t.connections?.length > 0 ? (isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200") : getStatusColor(t.status))}>
                                {t.connections?.length > 0 ? "Active" : (t.status || "Inactive")}
                              </span>
                            </td>
                            <td className="py-4 px-4 align-middle">
                              <div className={cn("flex items-center gap-2 text-sm", isDark ? "text-zinc-300" : "text-slate-500")}>
                                <Activity className={cn("w-3.5 h-3.5", isDark ? "text-zinc-500" : "text-slate-500")} />
                                {t.connections?.length || 0}
                              </div>
                            </td>
                            <td className={cn("py-4 px-4 align-middle text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>{formatDate(t.createdAt)}</td>
                            <td className="py-4 px-4 align-middle">
                              <div onClick={() => copyToClipboard(t.id)}
                                className={cn("text-xs hover:text-cyan-400 font-mono cursor-pointer transition-colors flex items-center gap-1.5 group/id max-w-[200px]", isDark ? "text-zinc-500" : "text-slate-500")} title={t.id}>
                                <span className="truncate">{t.id}</span>
                                <Copy className="w-3 h-3 opacity-0 group-hover/id:opacity-100 transition-opacity shrink-0" />
                              </div>
                            </td>
                            <td className="py-4 pl-4 pr-6 align-middle text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditTunnel(t)} disabled={editingTunnelId !== null}
                                  className={cn("p-2 rounded-lg transition-colors border shadow-sm", isDark ? "bg-white/5 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20 text-zinc-400 hover:text-cyan-400" : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800")} title="Edit / Manage">
                                  {editingTunnelId === t.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setDeleteTunnelModal(t)}
                                  className={cn("p-2 rounded-lg transition-colors border shadow-sm", isDark ? "bg-white/5 hover:bg-red-500/10 border-transparent hover:border-red-500/20 text-zinc-400 hover:text-red-400" : "bg-white hover:bg-red-50 border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600")} title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ==================== CREATE TUNNEL FLOW ==================== */}
          {showCreateTunnel && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Back button */}
              <div className="flex items-center">
                <button onClick={() => { resetCreateForm(); setShowCreateTunnel(false); }}
                  className={cn(
                    "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border shadow-sm",
                    isDark 
                      ? "text-zinc-400 hover:text-white bg-[#0b1322] hover:bg-[#111c33] border-slate-800 hover:border-cyan-500/40" 
                      : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200"
                  )}>
                  <ChevronLeft className="w-4 h-4" /> Back to tunnel list
                </button>
              </div>

              {/* Progress Steps */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm font-medium">
                {[
                  { step: 1 as Step, label: "Name your tunnel" },
                  { step: 2 as Step, label: "Install connector" },
                  { step: 3 as Step, label: "Route tunnel" },
                ].map(({ step, label }, i) => {
                  const isDisabled = isEditMode ? false : currentStep < step;
                  const isClickable = isEditMode ? true : currentStep > step;
                  return (
                    <div key={step} className="flex items-center gap-2 sm:gap-4">
                      {i > 0 && <ArrowRight className={cn("w-4 h-4 hidden sm:block", isDark ? "text-zinc-600" : "text-slate-400")} />}
                      <button onClick={() => isClickable && setCurrentStep(step)} disabled={isDisabled}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm",
                          currentStep === step ? (isDark ? "bg-[#0b162c] text-cyan-400 border border-cyan-500 ring-1 ring-cyan-500/30 font-bold" : "bg-white text-cyan-900 border border-cyan-600 ring-2 ring-cyan-600/20 font-bold") : (isDark ? "text-zinc-500 border border-transparent" : "text-slate-500 border border-transparent"),
                          isClickable && (isDark ? "cursor-pointer hover:text-zinc-300 hover:bg-white/5" : "cursor-pointer hover:text-slate-800 hover:bg-slate-100"))}>
                        <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border text-xs",
                          currentStep === step ? (isDark ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "bg-cyan-600 text-white border-transparent") : (isDark ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200 text-slate-500"))}>{step}</span>
                        {label}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Step 1: Name */}
              {currentStep === 1 && (
                <div className={cn("glass p-6 sm:p-8 rounded-2xl border space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500", isDark ? "border-white/5" : "border-slate-200")}>
                  <div>
                    <h2 className={cn("text-xl font-semibold mb-2", isDark ? "text-white" : "text-slate-900")}>Name your tunnel</h2>
                    <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Use a descriptive name based on the network you want to connect.</p>
                  </div>
                  <div className="space-y-3">
                    <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-500")}>Tunnel name</label>
                    <input type="text" value={tunnelName} onChange={(e) => setTunnelName(e.target.value)}
                      placeholder="e.g. My-Local-Network"
                      className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all", isDark ? "bg-black/40 border-white/10 text-white placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm")} />
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={handleSaveTunnel} disabled={!tunnelName || isSubmitting}
                      className="px-5 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm">
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> {isEditMode ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          {isEditMode ? "Update name" : "Save tunnel"} <Save className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Install */}
              {currentStep === 2 && (
                <div className={cn("glass p-6 sm:p-8 rounded-2xl border space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500", isDark ? "border-white/5" : "border-slate-200")}>
                  <div>
                    <h2 className={cn("text-xl font-semibold mb-6", isDark ? "text-white" : "text-slate-900")}>Install and run a connector</h2>
                    <p className={cn("text-sm mb-8", isDark ? "text-zinc-400" : "text-slate-500")}>To connect your tunnel to Cloudflare, copy-paste one of the following commands into a terminal window. Remotely managed tunnels require that you install cloudflared 2022.03.04 or later.</p>
                    <ConnectorInstructions isDark={isDark}
                      selectedOS={selectedOS}
                      setSelectedOS={(os) => setSelectedOS(os)}
                      tunnelToken={tunnelToken}
                      copyToClipboard={copyToClipboard}
                      onRefreshToken={handleRefreshToken}
                      isRefreshingToken={isRefreshingToken}
                      selectedArch={selectedArch}
                      setSelectedArch={setSelectedArch}
                    />
                  </div>
                  <div className={cn("flex justify-between pt-4 border-t", isDark ? "border-white/5" : "border-slate-200")}>
                    <button onClick={() => setCurrentStep(1)} className={cn("px-6 py-3 font-semibold rounded-xl transition-all", isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700")}>Back</button>
                    <button onClick={() => setCurrentStep(3)} className={cn("px-6 py-3 bg-[#00B4D8] hover:bg-[#00cceb] font-bold rounded-xl transition-all shadow-sm flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                      Next: Route Tunnel <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Route */}
              {currentStep === 3 && (
                <div className={cn("glass p-6 sm:p-8 rounded-2xl border space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500", isDark ? "border-white/5" : "border-slate-200")}>
                  <div>
                    <h2 className={cn("text-xl font-semibold mb-2", isDark ? "text-white" : "text-slate-900")}>
                      {isEditModeRoute ? "Edit Route" : `Route tunnel: ${tunnelName}`}
                    </h2>
                    <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                      {isEditModeRoute ? "Update your public hostname route configuration." : "Publish a local application to the Internet. DNS will be automatically configured."}
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Hostname Section */}
                    <div className="space-y-4">
                      <h3 className={cn("text-lg font-medium", isDark ? "text-white" : "text-slate-900")}>Hostname</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-500")}>Subdomain <span className={cn("text-xs font-normal", isDark ? "text-zinc-500" : "text-slate-500")}>(Optional)</span></label>
                          <input type="text" value={subdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="www"
                            className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all", isDark ? "bg-black/40 border-white/10 text-white placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm")} />
                        </div>
                        <div className="space-y-3">
                          <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-500")}>Domain *</label>
                          <div className="relative">
                            <Select
                              value={selectedDomainId}
                              onChange={(val) => setSelectedDomainId(Number(val) || "")}
                              options={[
                                ...domains.filter(d => d.status === "active").map(d => ({ value: d.id, label: d.domain })),
                                ...domains.filter(d => d.status !== "active").map(d => ({ value: d.id, label: `${d.domain} (NS pending)`, disabled: true }))
                              ]}
                              placeholder="Select domain..."
                              className={cn("w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer", isDark ? "bg-black/40 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm")}
                            />
                          </div>
                        </div>
                      </div>
                      {fullHostname && (
                        <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Full hostname: <strong className="text-cyan-400">{fullHostname}</strong></p>
                      )}
                    </div>

                    {/* Path */}
                    <div className="space-y-3">
                      <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-500")}>Path <span className={cn("text-xs font-normal", isDark ? "text-zinc-500" : "text-slate-500")}>(Optional)</span></label>
                      <input type="text" value={path} onChange={(e) => setPath(e.target.value)} placeholder="e.g. /api"
                        className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all", isDark ? "bg-black/40 border-white/10 text-white placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm")} />
                    </div>

                    {/* Service Settings */}
                    <div className={cn("space-y-4 pt-4 border-t", isDark ? "border-white/5" : "border-slate-200")}>
                      <h3 className={cn("text-lg font-medium", isDark ? "text-white" : "text-slate-900")}>Service</h3>
                      <div className="grid md:grid-cols-[1fr_2fr] gap-4">
                        <div className="space-y-3">
                          <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-500")}>Type *</label>
                          <div className="relative">
                            <Select
                              value={serviceType}
                              onChange={(val) => setServiceType(val.toString() as ServiceType)}
                              options={[
                                { value: "http", label: "HTTP" },
                                { value: "https", label: "HTTPS" }
                              ]}
                              placeholder="Select Type..."
                              className={cn("w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer uppercase", isDark ? "bg-black/40 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm")}
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-500")}>URL *</label>
                          <div className={cn("flex border rounded-xl focus-within:ring-2 focus-within:ring-cyan-500/50 transition-all overflow-hidden", isDark ? "bg-black/40 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
                            <div className={cn("px-4 flex items-center bg-white/5 border-r text-sm font-mono uppercase shrink-0", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}>
                              {serviceType}://
                            </div>
                            <input type="text" value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)}
                              placeholder="localhost:8080"
                              className={cn("w-full bg-transparent px-4 py-3 text-sm focus:outline-none font-mono", isDark ? "text-white placeholder:text-zinc-600" : "text-slate-900 placeholder:text-slate-400")} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* HTTPS TLS */}
                    {isHttps && (
                      <div className={cn("space-y-4 pt-4 border-t", isDark ? "border-white/5" : "border-slate-200")}>
                        <div className="flex items-center gap-2 cursor-pointer group">
                          <h3 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>Origin request and connection settings</h3>
                          <ChevronDown className={cn("w-4 h-4 transition-colors", isDark ? "text-zinc-400 group-hover:text-white" : "text-slate-400 group-hover:text-slate-900")} />
                        </div>

                        <div className={cn("rounded-xl overflow-hidden border", isDark ? "bg-black/30 border-white/5 shadow-inner" : "bg-slate-50 border-slate-200")}>
                          <div className="p-5 flex items-center justify-between gap-6 hover:bg-slate-800/30 transition-colors">
                            <div className="pr-4">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>No TLS Verify</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full uppercase tracking-wider">
                                  Required for Local IPs
                                </span>
                              </div>
                              <span className={cn("text-xs block leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                                Disables TLS verification of the certificate presented by your origin. Will allow any certificate from the origin to be accepted.
                              </span>
                            </div>

                            {/* Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input type="checkbox" className="sr-only peer" checked={noTlsVerify} onChange={(e) => setNoTlsVerify(e.target.checked)} />
                              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 shadow-inner"></div>
                              <span className={cn("ml-3 text-sm font-bold w-6", noTlsVerify ? "text-cyan-400" : "text-zinc-500")}>
                                {noTlsVerify ? 'On' : 'Off'}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={cn("flex justify-between pt-6 border-t", isDark ? "border-white/5" : "border-slate-200")}>
                    <button onClick={() => {
                      if (isEditMode) {
                        const tunnel = tunnels.find(t => t.id === editingTunnelId);
                        if (tunnel) {
                          // Manually restore view
                          handleEditTunnel(tunnel).then(() => {
                            setActiveTunnelTab("routes");
                          });
                        } else {
                          resetCreateForm();
                          setShowCreateTunnel(false);
                        }
                        setIsEditModeRoute(false);
                      } else {
                        setCurrentStep(2);
                      }
                    }} className={cn("px-4 py-2.5 font-medium text-sm rounded-lg transition-all border", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}>
                      {isEditMode ? "Cancel" : "Back"}
                    </button>
                    <button onClick={handleSaveRoute} disabled={isSubmitting}
                      className="px-5 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm">
                      {isSubmitting ? "Saving..." : (isEditModeRoute ? "Save" : "Add Route")} 
                      {!isEditModeRoute && !isSubmitting && <Plus className="w-4 h-4" />}
                      {isEditModeRoute && !isSubmitting && <Save className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Existing Routes Display */}
                  {isEditMode && !isEditModeRoute && existingIngress.length > 0 && (
                    <div className={cn("mt-8 pt-6 border-t space-y-4", isDark ? "border-white/5" : "border-slate-200")}>
                      <h3 className={cn("text-lg font-medium flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                        <Link className="w-5 h-5 text-cyan-400" />
                        Existing Routes
                      </h3>
                      <div className={cn("rounded-xl overflow-hidden border", isDark ? "bg-black/30 border-white/10" : "bg-slate-50 border-slate-200")}>
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className={cn("border-b", isDark ? "border-white/5 bg-black/40 text-zinc-400" : "border-slate-200 bg-slate-100 text-slate-500")}>
                              <th className="py-3 px-4 font-medium">Public Hostname</th>
                              <th className="py-3 px-4 font-medium">Local Service</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {existingIngress.map((rule, i) => (
                              <tr key={i} className={cn("transition-colors", isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50")}>
                                <td className="py-3 px-4 text-cyan-400 font-mono">
                                  {rule.hostname}{rule.path || ""}
                                </td>
                                <td className={cn("py-3 px-4 font-mono", isDark ? "text-zinc-300" : "text-slate-500")}>
                                  {rule.service}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== DELETE DOMAIN MODAL ==================== */}
      {deleteDomainModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className={cn("border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200", isDark ? "bg-[#0f172a] border-white/10" : "bg-white border-slate-200")}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Remove Domain</h3>
                <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>This will remove the domain from Cloudflare.</p>
              </div>
            </div>
            <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
              Are you sure you want to remove <strong className={cn(isDark ? "text-white" : "text-slate-900")}>{deleteDomainModal.domain}</strong>? All DNS records for this domain in Cloudflare will be deleted.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteDomainModal(null)} disabled={deleteDomainLoading}
                className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors", isDark ? "text-zinc-300 bg-white/5 hover:bg-white/10" : "text-slate-600 bg-slate-100 hover:bg-slate-200")}>Cancel</button>
              <button onClick={handleDeleteDomain} disabled={deleteDomainLoading}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center gap-2">
                {deleteDomainLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleteDomainLoading ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE TUNNEL MODAL ==================== */}
      {deleteTunnelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className={cn("border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200", isDark ? "bg-[#0f172a] border-white/10" : "bg-white border-slate-200")}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Delete Tunnel</h3>
                <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>This action cannot be undone.</p>
              </div>
            </div>
            <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
              Are you sure you want to delete tunnel <strong className={cn(isDark ? "text-white" : "text-slate-900")}>{deleteTunnelModal.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteTunnelModal(null)} disabled={deleteTunnelLoading}
                className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors", isDark ? "text-zinc-300 bg-white/5 hover:bg-white/10" : "text-slate-600 bg-slate-100 hover:bg-slate-200")}>Cancel</button>
              <button onClick={handleDeleteTunnel} disabled={deleteTunnelLoading}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center gap-2">
                {deleteTunnelLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleteTunnelLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}