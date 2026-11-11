"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Server, HardDrive, Cpu, MemoryStick, Network, Activity, ShieldCheck, ArrowRight, Shield, XCircle, CheckCircle, Clock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { formatRupiah } from "@/lib/billing";
import { motion } from "framer-motion";
import { RefreshCw, Plus, Settings2, Receipt, Disc, DatabaseBackup, ListChecks, ChevronLeft, ChevronRight, CreditCard, Building2, Wallet, Store, QrCode, Sliders, Rocket, Loader2, Plug, MapPin, AlertTriangle, Info, Sparkles, KeyRound, ExternalLink, Check } from "lucide-react";
import { Select } from "@/components/ui/Select";
import Link from "next/link";
import { SiUbuntu, SiDebian, SiRockylinux, SiCentos, SiAlpinelinux, SiFedora, SiKubernetes } from "react-icons/si";
import { EnterpriseInfraSidebarCard, IntelCpuBadge, NetworkInfraBadge, IntelLogo } from "@/components/EnterpriseInfraBadges";
import { VPS_APPS, APP_CATEGORIES, AppCategory, VpsAppDefinition, getAppById, getAppByName, matchTemplateForApp } from "@/lib/vps-apps";
import { VpsAppInstallationMonitor } from "@/components/VpsAppInstallationMonitor";
import { Pagination } from "@/components/ui/Pagination";

const getOsIcon = (name: string, isDark: boolean = false) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('ubuntu')) return <SiUbuntu className="w-5 h-5 text-[#E95420]" />;
  if (lowerName.includes('debian')) return <SiDebian className="w-5 h-5 text-[#A81D33]" />;
  if (lowerName.includes('windows')) return <img referrerPolicy="no-referrer" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg" alt="Windows" className="w-5 h-5" loading="lazy" decoding="async" />;
  if (lowerName.includes('alma')) return <img referrerPolicy="no-referrer" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg" alt="AlmaLinux" className="w-5 h-5" loading="lazy" decoding="async" />;
  if (lowerName.includes('rocky')) return <SiRockylinux className="w-5 h-5 text-[#10B981]" />;
  if (lowerName.includes('centos')) return <SiCentos className="w-5 h-5 text-[#262577]" />;
  if (lowerName.includes('alpine')) return <img referrerPolicy="no-referrer" src="https://www.vectorlogo.zone/logos/alpinelinux/alpinelinux-icon.svg" alt="Alpine Linux" className="w-5 h-5" loading="lazy" decoding="async" />;
  if (lowerName.includes('fedora')) return <SiFedora className="w-5 h-5 text-[#51A2DA]" />;
  if (lowerName.includes('freebsd')) return <img referrerPolicy="no-referrer" src="https://cdn.simpleicons.org/freebsd/AB2B28" alt="FreeBSD" className="w-5 h-5" loading="lazy" decoding="async" />;
  if (lowerName.includes('mikrotik') || lowerName.includes('chr')) {
    return <img referrerPolicy="no-referrer" src="https://cdn.worldvectorlogo.com/logos/mikrotik.svg" alt="MikroTik" className="w-5 h-5" loading="lazy" decoding="async" />;
  }
  return <HardDrive className="w-5 h-5 text-zinc-400" />;
};

interface VpsCheckoutFlowProps {
  serviceType?: string;
  onServiceChange?: (service: string) => void;
}

const VpcIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="11" />
    <polyline points="9 6 12 3 15 6" />
    <polyline points="9 18 12 21 15 18" />
    <polyline points="6 9 3 12 6 15" />
    <polyline points="18 9 21 12 18 15" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

const getUsableIpRange = (cidr: string, gateway: string) => {
  try {
    const [base, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr);
    const parts = base.split('.').map(Number);
    const baseNum = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    const totalHosts = Math.pow(2, 32 - prefix);
    const networkAddr = baseNum;
    const broadcastAddr = baseNum + totalHosts - 1;
    const gatewayNum = gateway ? (gateway.split('.').map(Number).reduce((acc, v) => (acc << 8) | v, 0) >>> 0) : 0;
    const candidates = [];
    for (let i = networkAddr + 1; i < broadcastAddr; i++) {
      if (i !== gatewayNum) candidates.push(i);
    }
    const toIp = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
    return candidates.length > 0
      ? { first: toIp(candidates[0]), last: toIp(candidates[candidates.length - 1]), count: candidates.length }
      : null;
  } catch { return null; }
};

const ipToNum = (ip: string) => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
};

type CidrValidationResult = {
  error: string | null;
  suggestion?: string;
};

const validateCidr = (cidr: string): CidrValidationResult => {
  if (!cidr) return { error: null };
  
  let suggestion = "10.10.10.0/24";
  try {
    let ipPart = cidr.split('/')[0] || "";
    let prefixPart = cidr.split('/')[1];
    let prefix = parseInt(prefixPart);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) prefix = 24;
    
    let parts = ipPart.split('.').map(p => p.trim() === "" ? 0 : parseInt(p));
    parts = parts.map(p => isNaN(p) ? 0 : p);
    while (parts.length < 4) parts.push(0);
    
    if (parts[0] !== 10 && parts[0] !== 172 && parts[0] !== 192) {
      if (ipPart.startsWith("17")) parts = [172, 16, 0, 0];
      else if (ipPart.startsWith("19")) parts = [192, 168, 0, 0];
      else parts = [10, 0, 0, 0];
    } else {
      if (parts[0] === 172 && (parts[1] < 16 || parts[1] > 31)) parts[1] = 16;
      if (parts[0] === 192 && parts[1] !== 168) parts[1] = 168;
    }
    
    const ipNum = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const networkNum = (ipNum & mask) >>> 0;
    const toIp = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
    
    suggestion = `${toIp(networkNum)}/${prefix}`;
  } catch {}

  if (!cidr.includes('/')) return { error: "Invalid format. Expected IP/Prefix", suggestion };
  
  const [base, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return { error: "Invalid prefix length (0-32)", suggestion };
  
  const parts = base.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN) || parts.some(p => p < 0 || p > 255)) {
    return { error: "Invalid IP address format", suggestion };
  }
  
  const isPrivate = (parts[0] === 10) || 
                    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || 
                    (parts[0] === 192 && parts[1] === 168);
  if (!isPrivate) return { error: "Must be a private IP range (RFC 1918)", suggestion };

  const ipNum = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const networkNum = (ipNum & mask) >>> 0;
  
  if (ipNum !== networkNum) {
    return { error: `Must be a network address`, suggestion };
  }
  
  return { error: null };
};

export default function VpsCheckoutFlow({ serviceType = "VPS", onServiceChange }: VpsCheckoutFlowProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const clusterId = searchParams.get("cluster_id") || searchParams.get("clusterId");
  const isAddWorkerNode = serviceType === "KUBERNETES" && action === "add_node" && !!clusterId;

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedOsFamily, setSelectedOsFamily] = useState<string | null>(null);

  // 1-Click Apps State (initialized immediately from URL query params or APP_CATALOG service)
  const initialAppQuery = searchParams.get("app") || searchParams.get("appId");
  const isAppCatalogService = serviceType === "APP_CATALOG";
  const initialApp = initialAppQuery 
    ? (getAppById(initialAppQuery) || getAppByName(initialAppQuery))
    : (isAppCatalogService ? VPS_APPS[0] : null);

  const [imageMode, setImageMode] = useState<"os" | "apps">(initialApp || isAppCatalogService ? "apps" : "os");
  const [selectedAppCategory, setSelectedAppCategory] = useState<AppCategory>("All Apps");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(initialApp ? initialApp.id : null);
  const [selectedAppVersion, setSelectedAppVersion] = useState<string | null>(initialApp ? (initialApp.versions[0]?.appVersion || initialApp.appVersion) : null);
  const [appConfig, setAppConfig] = useState<Record<string, any>>(() => {
    const initCfg: Record<string, any> = {};
    if (initialApp?.configFields) {
      initialApp.configFields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          initCfg[field.key] = field.defaultValue;
        }
      });
    }
    return initCfg;
  });
  const [showAppPasswords, setShowAppPasswords] = useState<Record<string, boolean>>({});
  const [installedVpsId, setInstalledVpsId] = useState<number | null>(null);
  const [showAppInstallationModal, setShowAppInstallationModal] = useState<boolean>(false);
  const APPS_PER_PAGE = 6;
  const [appPage, setAppPage] = useState(() => {
    if (!initialApp) return 1;
    const idx = VPS_APPS.findIndex(a => a.id === initialApp.id);
    return idx >= 0 ? Math.floor(idx / 6) + 1 : 1;
  });

  const [plans, setPlans] = useState<any[]>([]);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [isDisabled, setIsDisabled] = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Kubernetes
  const K3S_VERSIONS = [
    { id: "v1.36", name: "Kubernetes v1.36 (Stable)" },
    { id: "v1.35", name: "Kubernetes v1.35 (Stable)" },
    { id: "v1.34", name: "Kubernetes v1.34 (Stable)" },
    { id: "v1.33", name: "Kubernetes v1.33 (Stable)" },
    { id: "v1.32", name: "Kubernetes v1.32 (Stable)" },
    { id: "v1.31", name: "Kubernetes v1.31 (Stable)" }
  ];
  const [kubernetesVersion, setKubernetesVersion] = useState("v1.31");

  // Order State
  const [hostname, setHostname] = useState("");
  const [username, setUsername] = useState("");

  const isWindows = Boolean(
    selectedOsFamily?.toLowerCase().includes("windows") ||
    templates.find(t => t.id === selectedTemplate)?.name.toLowerCase().includes("windows")
  );

  useEffect(() => {
    if (isWindows) {
      setUsername("Administrator");
    }
  }, [isWindows]);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [sshKey, setSshKey] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Global Saved SSH Keys
  interface SavedSshKey {
    id: number;
    name: string;
    publicKey: string;
    fingerprint: string | null;
    keyType: string | null;
  }
  const [userSavedKeys, setUserSavedKeys] = useState<SavedSshKey[]>([]);
  const [selectedSavedKeyId, setSelectedSavedKeyId] = useState<number | null>(null);
  const [isLoadingSavedKeys, setIsLoadingSavedKeys] = useState(false);
  const [sshKeyMode, setSshKeyMode] = useState<'saved' | 'custom'>('saved');

  useEffect(() => {
    const fetchSavedSshKeys = async () => {
      try {
        setIsLoadingSavedKeys(true);
        const res = await fetch("/api/user/ssh-keys");
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.keys)) {
          setUserSavedKeys(data.keys);
          if (data.keys.length > 0) {
            setSshKeyMode('saved');
          } else {
            setSshKeyMode('custom');
          }
        }
      } catch {
        // silent fallback
      } finally {
        setIsLoadingSavedKeys(false);
      }
    };
    fetchSavedSshKeys();
  }, []);

  const handleSelectSavedKey = (key: SavedSshKey) => {
    if (selectedSavedKeyId === key.id) {
      setSelectedSavedKeyId(null);
      setSshKey("");
    } else {
      setSelectedSavedKeyId(key.id);
      setSshKey(key.publicKey);
    }
  };

  // Firewall State
  const [firewallRules, setFirewallRules] = useState({
    ssh: { enabled: true, source: "anywhere", customIp: "" },
    http: { enabled: false, source: "anywhere", customIp: "" },
    https: { enabled: false, source: "anywhere", customIp: "" }
  });
  const [clientIp, setClientIp] = useState("");

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then(res => res.json())
      .then(data => setClientIp(data.ip))
      .catch(console.error);
  }, []);

  // Resource Sliders - initialized with app's minimum requirements if requested via URL
  const initialMinCpu = initialApp?.minSpecs?.cpu || 1;
  const initialMinRam = initialApp?.minSpecs?.ram || 1;
  const initialMinDisk = initialApp?.minSpecs?.disk || 20;

  const [cpuCores, setCpuCores] = useState(() => {
    const paramVal = parseInt(searchParams.get("cpu") || "0");
    return Math.max(initialMinCpu, paramVal || 1);
  });
  const [ramGb, setRamGb] = useState(() => {
    const paramVal = parseInt(searchParams.get("ram") || "0");
    return Math.max(initialMinRam, paramVal || 1);
  });
  const [diskGb, setDiskGb] = useState(() => {
    const paramVal = parseInt(searchParams.get("disk") || "0");
    return Math.max(initialMinDisk, paramVal || 20);
  });
  const [diskType, setDiskType] = useState<"HDD" | "SSD">((searchParams.get("diskType") as "HDD" | "SSD") || "HDD");
  const [backupGb, setBackupGb] = useState(0);
  const [bandwidthMbps, setBandwidthMbps] = useState(parseInt(searchParams.get("bandwidth") || searchParams.get("bandwidthMbps") || "100"));
  const [bandwidthOptions, setBandwidthOptions] = useState<number[]>([100, 150, 200, 250, 300]);

  const [maxSpecs, setMaxSpecs] = useState({ cpu: 32, ram: 128, diskHdd: 1000, diskSsd: 500, backup: 500 });

  // Dedicated switch handler to ensure minimum disk requirement is strictly preserved when switching between SSD and HDD
  const handleSwitchDiskType = (newType: "HDD" | "SSD") => {
    setDiskType(newType);
    const activeApp = imageMode === "apps" && selectedAppId ? getAppById(selectedAppId) : null;
    const requiredMinDisk = activeApp?.minSpecs ? Math.max(20, activeApp.minSpecs.disk) : 20;
    const targetMax = newType === "SSD" ? maxSpecs.diskSsd : maxSpecs.diskHdd;
    setDiskGb(prev => {
      const ensured = Math.max(requiredMinDisk, prev);
      return Math.min(ensured, targetMax);
    });
  };

  useEffect(() => {
    const maxDisk = diskType === "SSD" ? maxSpecs.diskSsd : maxSpecs.diskHdd;
    const activeApp = imageMode === "apps" && selectedAppId ? getAppById(selectedAppId) : null;
    const requiredMinDisk = activeApp?.minSpecs ? Math.max(20, activeApp.minSpecs.disk) : 20;
    setDiskGb(prev => {
      if (prev < requiredMinDisk) return requiredMinDisk;
      if (prev > maxDisk) return Math.max(requiredMinDisk, maxDisk);
      return prev;
    });
  }, [diskType, maxSpecs, imageMode, selectedAppId]);

  // Networking
  const [ipv4Count, setIpv4Count] = useState(0);
  const [ipv6Count, setIpv6Count] = useState(0);
  const [hasIpv4Pool, setHasIpv4Pool] = useState(true);
  const [hasIpv6Pool, setHasIpv6Pool] = useState(true);

  // Reserved IPs
  const [reservedIps, setReservedIps] = useState<any[]>([]);
  const [useReservedIp, setUseReservedIp] = useState(false);
  const [selectedReservedIpId, setSelectedReservedIpId] = useState<number | null>(null);

  // VPCs
  const [vpcs, setVpcs] = useState<any[]>([]);
  const [useVpc, setUseVpc] = useState(true);
  const [selectedVpcId, setSelectedVpcId] = useState<number | null>(null);
  const [privateIpAddress, setPrivateIpAddress] = useState("");
  const [isCreatingVpc, setIsCreatingVpc] = useState(false);
  const [newVpcName, setNewVpcName] = useState("");
  const [newVpcCidr, setNewVpcCidr] = useState("");
  const [newVpcDescription, setNewVpcDescription] = useState("");
  const [newVpcNatEnabled, setNewVpcNatEnabled] = useState(false);
  const [isSubmittingVpc, setIsSubmittingVpc] = useState(false);

  // Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>("BALANCE");
  const [paymentMethodPage, setPaymentMethodPage] = useState(1);
  const [plansPage, setPlansPage] = useState(1);
  const [balance, setBalance] = useState(0);

  // Proxmox Nodes
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("");

  const selectApp = (app: VpsAppDefinition) => {
    setSelectedAppId(app.id);
    setSelectedAppVersion(app.versions[0]?.appVersion || app.appVersion);
    const initialConfig: Record<string, any> = {};
    if (app.configFields) {
      app.configFields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          initialConfig[field.key] = field.defaultValue;
        }
      });
    }
    setAppConfig(initialConfig);

    // Auto-adjust VPS specs to satisfy the application's official requirements and prevent OOM kills
    let autoAdjusted = false;
    if (app.minSpecs) {
      if (cpuCores < app.minSpecs.cpu) {
        setCpuCores(app.minSpecs.cpu);
        autoAdjusted = true;
      }
      if (ramGb < app.minSpecs.ram) {
        setRamGb(app.minSpecs.ram);
        autoAdjusted = true;
      }
      if (diskGb < app.minSpecs.disk) {
        setDiskGb(app.minSpecs.disk);
        autoAdjusted = true;
      }
    }

    // Automatically switch base OS template matching the app's supported OS
    const matchedName = matchTemplateForApp(app, templates);
    const matchedTpl = matchedName ? templates.find((t: any) => t.name === matchedName) : null;
    if (matchedTpl) {
      const lowerName = matchedTpl.name.toLowerCase();
      const family = lowerName.includes("alma") ? "AlmaLinux" :
        lowerName.includes("ubuntu") ? "Ubuntu" :
        lowerName.includes("debian") ? "Debian" :
        lowerName.includes("rocky") ? "Rocky Linux" : "Linux";
      setSelectedOsFamily(family);
      setSelectedTemplate(matchedTpl.id);
    }

    if (ipv4Count < 1) {
      setIpv4Count(1);
    }
    if (useReservedIp) {
      setUseReservedIp(false);
    }

    if (autoAdjusted && app.minSpecs) {
      toast.info(`Server specs auto-adjusted to meet ${app.name} requirements (${app.minSpecs.cpu} vCPU, ${app.minSpecs.ram} GB RAM, ${app.minSpecs.disk} GB Disk).`);
    }
  };

  const fetchOrderData = async () => {
    try {
      const clusterQuery = isAddWorkerNode ? `&cluster_id=${clusterId}` : "";
      const res = await fetch(`/api/user/vps/order-data?t=${Date.now()}${clusterQuery}`);
      const data = await res.json();

      const nodesRes = await fetch("/api/user/proxmox/nodes");
      const nodesData = await nodesRes.json();
      if (nodesData.success && nodesData.nodes && nodesData.nodes.length > 0) {
        setNodes(nodesData.nodes);
        setSelectedNode(nodesData.nodes[0].node); // Auto-select the first node
      }

      const pmRes = await fetch("/api/public/payment-methods");
      const pmData = await pmRes.json();
      const pms = pmData.success ? pmData.data : [];

      const billingRes = await fetch("/api/user/billing");
      const billingData = await billingRes.json();
      if (billingData.success) {
        setBalance(billingData.data.balance || 0);
        if (billingData.data.balance > 0) {
          pms.unshift({ code: 'BALANCE', name: 'Account Balance', type: 'WALLET', fee: 0, isActive: true });
        }
      }
      setPaymentMethods(pms);

      if (!data.error) {
        setTemplates(data.templates);
        setPlans(data.plans || []);
        setPricing(data.pricing);
        if (data.bandwidthOptions && Array.isArray(data.bandwidthOptions)) {
          setBandwidthOptions(data.bandwidthOptions);
        }
        setHasIpv4Pool(data.hasIpv4Pool);
        setHasIpv6Pool(data.hasIpv6Pool);

        if (serviceType === "KUBERNETES") {
          setIsDisabled(!data.k3sEnabled);
        } else {
          setIsDisabled(!data.vpsEnabled);
        }

        if (data.plans && data.plans.length > 0) {
          setSelectedPlanId(data.plans[0].id);
        }

        if (!data.hasIpv4Pool) setIpv4Count(0);
        if (!data.hasIpv6Pool) setIpv6Count(0);

        if (data.reservedIps && data.reservedIps.length > 0) {
          setReservedIps(data.reservedIps);
          setUseReservedIp(false); // Default to allocating new IP
          setSelectedReservedIpId(data.reservedIps[0].id);
        }

        if (data.vpcs && data.vpcs.length > 0) {
          setVpcs(data.vpcs);
          setUseVpc(true); // Mandatory VPC
          setSelectedVpcId(data.vpcs[0].id);
        }

        if (data.maxSpecs) setMaxSpecs(data.maxSpecs);
        if (data.templates && data.templates.length > 0) {
          const debian13 = data.templates.find((t: any) => t.name.toLowerCase() === "debian-13")
            || data.templates.find((t: any) => t.name.toLowerCase().includes("debian-13"))
            || data.templates.find((t: any) => t.name.toLowerCase().includes("debian"));

          if (serviceType === "KUBERNETES") {
            const chosen = debian13 || data.templates[0];
            setSelectedOsFamily(chosen.name.split('-')[0]);
            setSelectedTemplate(chosen.id);
          } else {
            const firstTpl = data.templates[0];
            const firstFamily = firstTpl.name.split('-')[0];
            setSelectedOsFamily(firstFamily);
            setSelectedTemplate(firstTpl.id);
          }

          // Check if an application was requested via query parameter (e.g. ?app=wordpress or ?appId=aapanel) or if service is APP_CATALOG
          const urlApp = searchParams.get("app") || searchParams.get("appId");
          if (serviceType === "APP_CATALOG" || urlApp) {
            const matchedApp = (urlApp ? getAppById(urlApp) || getAppByName(urlApp) : null) || VPS_APPS[0];
            if (matchedApp) {
              setImageMode("apps");
              setSelectedAppCategory("All Apps");
              selectApp(matchedApp);
            }
          }
        }
        if (data.plans && data.plans.length > 0) {
          setSelectedPlanId(data.plans[0].id);
        }
      } else {
        toast.error("Failed to load order data");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
  }, []);

  // When app query parameter changes or templates load, ensure requested app is selected
  useEffect(() => {
    const urlApp = searchParams.get("app") || searchParams.get("appId");
    if (urlApp && templates.length > 0) {
      const matchedApp = getAppById(urlApp) || getAppByName(urlApp);
      if (matchedApp) {
        setImageMode("apps");
        selectApp(matchedApp);
      }
    }
  }, [searchParams, templates]);

  // Synchronize base OS template whenever 1-Click App or templates load
  useEffect(() => {
    if (imageMode === "apps" && selectedAppId && templates.length > 0) {
      const app = getAppById(selectedAppId);
      if (app) {
        const matchedName = matchTemplateForApp(app, templates);
        const tpl = matchedName ? templates.find((t: any) => t.name === matchedName) : null;
        if (tpl && selectedTemplate !== tpl.id) {
          const lowerName = tpl.name.toLowerCase();
          const family = lowerName.includes("alma") ? "AlmaLinux" :
            lowerName.includes("ubuntu") ? "Ubuntu" :
            lowerName.includes("debian") ? "Debian" :
            lowerName.includes("rocky") ? "Rocky Linux" : "Linux";
          setSelectedOsFamily(family);
          setSelectedTemplate(tpl.id);
        }
      }
    }
  }, [imageMode, selectedAppId, templates, selectedTemplate]);

  // When ordering Kubernetes, always ensure Debian-13 is locked as the template
  useEffect(() => {
    if (serviceType === "KUBERNETES" && templates.length > 0) {
      const debian13 = templates.find((t: any) => t.name.toLowerCase() === "debian-13")
        || templates.find((t: any) => t.name.toLowerCase().includes("debian-13"))
        || templates.find((t: any) => t.name.toLowerCase().includes("debian"));
      if (debian13 && selectedTemplate !== debian13.id) {
        setSelectedOsFamily(debian13.name.split('-')[0]);
        setSelectedTemplate(debian13.id);
      }
    }
  }, [serviceType, templates, selectedTemplate]);

  // Synchronize imageMode and app selection when serviceType prop changes (e.g. user toggles between Cloud VPS and App Catalog in parent checkout page)
  useEffect(() => {
    if (serviceType === "APP_CATALOG") {
      setImageMode("apps");
      setSelectedAppCategory("All Apps");
      const urlApp = searchParams.get("app") || searchParams.get("appId");
      const targetApp = (urlApp ? getAppById(urlApp) || getAppByName(urlApp) : null) || (selectedAppId ? getAppById(selectedAppId) : null) || VPS_APPS[0];
      if (targetApp) {
        selectApp(targetApp);
      }
    } else if (serviceType === "VPS") {
      const urlApp = searchParams.get("app") || searchParams.get("appId");
      if (!urlApp) {
        setImageMode("os");
        setSelectedAppId(null);
        setSelectedAppVersion(null);
      }
    }
  }, [serviceType]);

  const calculateHourlyPrice = () => {
    let total = 0;
    total += cpuCores * (pricing.vcpu || 0);
    total += ramGb * (pricing.ram || 0);
    const currentDiskPrice = diskType === "SSD" ? (pricing.diskSsd || pricing.disk || 0) : (pricing.disk || 0);
    total += diskGb * currentDiskPrice;
    if (backupGb > 0) total += backupGb * (pricing.backup || 0);

    if (!useReservedIp) {
      if (ipv4Count > 0) total += ipv4Count * (pricing.ipv4 || 0);
      if (ipv6Count > 0) total += ipv6Count * (pricing.ipv6 || 0);
    }

    // Bandwidth rate: 100 Mbps is free, 50k / 50 Mbps / mo above 100 Mbps
    const bandwidthExtra = Math.max(0, bandwidthMbps - 100);
    const bandwidthSteps = Math.floor(bandwidthExtra / 50);
    const bandwidthRatePerHour = pricing.bandwidth !== undefined ? pricing.bandwidth : Math.ceil(50000 / 730);
    total += bandwidthSteps * bandwidthRatePerHour;

    return total;
  };

  const calculateMonthlyPrice = () => {
    // Approx 730 hours in a month
    return calculateHourlyPrice() * 730;
  };

  // Password validation
  const validatePassword = (pass: string, confirm: string) => {
    if (!pass) return "";
    if (pass.length < 8) return "Password must be at least 8 characters long";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "Password must contain at least one symbol";
    if (confirm && pass !== confirm) return "Passwords do not match";
    return "";
  };

  useEffect(() => {
    if (password || passwordConfirm) {
      setPasswordError(validatePassword(password, passwordConfirm));
    } else {
      setPasswordError("");
    }
  }, [password, passwordConfirm]);

  const handleCreateVpcInline = async () => {
    if (!newVpcName || !newVpcCidr) {
      toast.error("VPC Name and CIDR are required");
      return;
    }
    const cidrErr = validateCidr(newVpcCidr).error;
    if (cidrErr) {
      toast.error(cidrErr);
      return;
    }
    
    setIsSubmittingVpc(true);
    try {
      const res = await fetch("/api/dashboard/vpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newVpcName, description: newVpcDescription, cidr: newVpcCidr, isNatEnabled: newVpcNatEnabled })
      });
      
      if (res.ok) {
        toast.success("VPC Created successfully");
        const fetchRes = await fetch("/api/user/vps/order-data");
        if (fetchRes.ok) {
           const data = await fetchRes.json();
           if (data.vpcs) {
             setVpcs(data.vpcs);
             const newVpc = data.vpcs.find((v: any) => v.name === newVpcName);
             if (newVpc) setSelectedVpcId(newVpc.id);
           }
        }
        setIsCreatingVpc(false);
        setNewVpcName("");
        setNewVpcCidr("");
        setNewVpcDescription("");
        setNewVpcNatEnabled(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create VPC");
      }
    } catch (e) {
      toast.error("Error creating VPC");
    } finally {
      setIsSubmittingVpc(false);
    }
  };

  const handleOrder = async () => {
    const is1ClickApp = imageMode === "apps" && Boolean(selectedAppId);
    if (!hostname || !username || (!is1ClickApp && selectedTemplate === null) || !password) {
      const missing = [];
      if (!hostname) missing.push("Hostname");
      if (!username) missing.push("Username");
      if (!is1ClickApp && selectedTemplate === null) missing.push("OS Template");
      if (!password) missing.push("Password");
      toast.error(`Please complete required field(s): ${missing.join(", ")} in Section 9.`);
      return;
    }

    if (hostname.length < 5) {
      toast.error("Hostname must be at least 5 characters long");
      return;
    }

    const fqdnRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!fqdnRegex.test(hostname)) {
      toast.error("Hostname must be a valid FQDN (e.g. server.example.com)");
      return;
    }

    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (password !== passwordConfirm) {
      toast.error("Passwords do not match");
      return;
    }

    if (!termsAccepted) {
      toast.error("You must agree to the Terms of Service to deploy a server.");
      return;
    }


    if (useReservedIp && !selectedReservedIpId) {
      toast.error("Please select a Reserved IP to attach.");
      return;
    }

    if (serviceType === "KUBERNETES" && !useReservedIp && ipv4Count === 0) {
      toast.error("A Public IPv4 address is strictly required for Kubernetes deployment.");
      return;
    }

    if (selectedAppId && !useReservedIp && ipv4Count === 0) {
      toast.error("A Public IPv4 address is strictly required to deploy 1-Click Applications.");
      return;
    }

    if (useVpc) {
      if (!isCreatingVpc && !selectedVpcId) {
        toast.error("Please select a VPC Network");
        return;
      }
      if (!privateIpAddress.trim()) {
        toast.error("Private IP Address is required when attaching to a VPC");
        return;
      }
      
      if (!isCreatingVpc && selectedVpcId) {
        const currentVpc = vpcs.find(v => v.id === selectedVpcId);
        if (currentVpc) {
          if (privateIpAddress.trim() === currentVpc.gateway) {
            toast.error("The entered IP is reserved for the VPC Gateway.");
            return;
          }
          const isIpUsed = currentVpc.vpsServices?.some((v: any) => v.vpcIp === privateIpAddress.trim());
          if (isIpUsed) {
            toast.error("The entered IP is already in use by another VM in this VPC.");
            return;
          }
          const ipRange = getUsableIpRange(currentVpc.cidr, currentVpc.gateway || '');
          if (ipRange) {
            const ipNum = ipToNum(privateIpAddress.trim());
            const firstNum = ipToNum(ipRange.first);
            const lastNum = ipToNum(ipRange.last);
            if (ipNum < firstNum || ipNum > lastNum) {
              toast.error(`Private IP must be within the valid range: ${ipRange.first} - ${ipRange.last}`);
              return;
            }
          }
        }
      }
    }

    const processedFirewallRules = {
      ssh: { ...firewallRules.ssh, source: firewallRules.ssh.source === 'myip' ? `${clientIp}/32` : firewallRules.ssh.source },
      http: { ...firewallRules.http, source: firewallRules.http.source === 'myip' ? `${clientIp}/32` : firewallRules.http.source },
      https: { ...firewallRules.https, source: firewallRules.https.source === 'myip' ? `${clientIp}/32` : firewallRules.https.source },
    };

    setIsSubmitting(true);
    // Force React to paint the loading state before the heavy network request blocks it
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const is1ClickApp = imageMode === "apps" && Boolean(selectedAppId);
      const res = await fetch("/api/user/vps/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostname,
          username: isWindows ? "Administrator" : username,
          rootPassword: password,
          sshKey: sshKey,
          templateId: selectedTemplate || undefined,
          billingMode: "PAYG",
          planId: selectedPlanId,
          cpuCores,
          ramGb,
          diskGb,
          diskType,
          backupGb,
          bandwidthMbps,
          useIpv4: useReservedIp ? false : (ipv4Count > 0),
          useIpv6: useReservedIp ? false : (ipv6Count > 0),
          reservedIpId: useReservedIp ? selectedReservedIpId : undefined,
          isKubernetes: serviceType === "KUBERNETES",
          kubernetesVersion: isAddWorkerNode ? undefined : kubernetesVersion,
          action: isAddWorkerNode ? action : undefined,
          kubernetesClusterId: isAddWorkerNode ? clusterId : undefined,
          vpcId: useVpc ? selectedVpcId : undefined,
          privateIpAddress: useVpc ? privateIpAddress : undefined,
          firewallRules: processedFirewallRules,
          targetNode: selectedNode,
          paymentMethodCode: "BALANCE",
          appId: is1ClickApp ? selectedAppId : undefined,
          appVersion: is1ClickApp ? (selectedAppVersion || undefined) : undefined,
          appConfig: is1ClickApp ? appConfig : undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.paymentUrl) {
        toast.success("Order created! Redirecting to payment...");
        window.location.href = data.paymentUrl;
      } else if (res.ok && data.success) {
        toast.success("Server deployment started!");
        if (data.k3sClusterId) {
          router.push(`/dashboard/k3s/${data.k3sClusterId}`);
        } else if (is1ClickApp) {
          // Open Live 1-Click App Installation Monitor modal so customer can track until finished
          setInstalledVpsId(data.vpsId);
          setShowAppInstallationModal(true);
          setIsSubmitting(false);
        } else {
          router.push(`/dashboard/vps/${data.vpsId}`);
        }
      } else {
        toast.error(data.error || "Failed to create order");
        setIsSubmitting(false);
      }
    } catch (error) {
      toast.error("An error occurred during order submission");
      setIsSubmitting(false);
    }
  };

  const handleGenerateSSHKey = async () => {
    try {
      setIsGeneratingKey(true);
      const res = await fetch("/api/generate-ssh-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: hostname || "vps", username: username || "root" })
      });
      const data = await res.json();

      if (res.ok) {
        setSshKey(data.publicKey);
        setSshKeyMode('custom');
        setSelectedSavedKeyId(null);

        // Auto download the private key
        const blob = new Blob([data.privateKey], { type: 'application/x-pem-file' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${serviceType === "KUBERNETES" ? 'k3s' : 'vps'}-${hostname || 'key'}.pem`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("SSH Key Pair generated! Private key (.pem) has been downloaded.");
      } else {
        toast.error(data.error || "Failed to generate key");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-zinc-400">Loading order configuration...</div>;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const maxBackupAllowed = maxSpecs.backup || 500;

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full max-w-full min-w-0">
        {/* Configuration Pane */}
        <div className="xl:col-span-2 space-y-6 w-full max-w-full min-w-0">

          {/* OS Templates & 1-Click Applications - Only for regular VPS (Kubernetes is locked to Debian 13) */}
          {serviceType !== "KUBERNETES" && (
            <motion.div
              id="step-os-apps-selection"
              variants={itemVariants}
              className={cn("rounded-2xl p-5 sm:p-6 border relative z-20 w-full max-w-full min-w-0 overflow-visible", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h2 className={cn("text-base sm:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  {imageMode === "apps" ? (
                    <Rocket className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                  )}
                  1. Operating System & 1-Click Applications
                </h2>

                {/* Mode Selector Tabs */}
                <div className={cn("flex items-center gap-1.5 p-1 rounded-xl border self-start sm:self-auto", isDark ? "bg-black/30 border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                  <button
                    type="button"
                    onClick={() => {
                      setImageMode("os");
                      setSelectedAppId(null);
                      setSelectedAppVersion(null);
                      onServiceChange?.("VPS");
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      imageMode === "os"
                        ? "bg-cyan-400 text-slate-950 shadow-xs"
                        : isDark
                          ? "text-zinc-400 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    OS Images
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageMode("apps");
                      setSelectedAppCategory("All Apps");
                      if (!selectedAppId && VPS_APPS.length > 0) {
                        selectApp(VPS_APPS[0]);
                      }
                      onServiceChange?.("APP_CATALOG");
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      imageMode === "apps"
                        ? "bg-cyan-400 text-slate-950 shadow-xs"
                        : isDark
                          ? "text-zinc-400 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    1-Click Apps
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                      imageMode === "apps" ? "bg-slate-950/20 text-slate-950" : "bg-cyan-500/20 text-cyan-400"
                    )}>
                      {VPS_APPS.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* MODE 1: STANDARD OS IMAGES */}
              {imageMode === "os" && (
                <>
                  {templates.length === 0 ? (
                    <div className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>No templates available. Please contact support.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>Distribution / OS Family</label>
                        <Select
                          value={selectedOsFamily || ""}
                          onChange={(val) => {
                            const fam = val.toString();
                            setSelectedOsFamily(fam);
                            const firstVersion = templates.find(t => t.name.startsWith(fam + "-")) || templates.find(t => t.name.startsWith(fam));
                            if (firstVersion) setSelectedTemplate(firstVersion.id);
                            if (fam.toLowerCase().includes("windows")) {
                              setUsername("Administrator");
                            } else if (username === "Administrator") {
                              setUsername("");
                            }
                          }}
                          options={Array.from(new Set(templates.map(t => t.name.split('-')[0]))).map(fam => ({ 
                            value: fam, 
                            label: (
                              <div className="flex items-center gap-3">
                                {getOsIcon(fam, isDark)}
                                <span>{fam}</span>
                              </div>
                            ) 
                          }))}
                          placeholder="Select Image..."
                          className={cn("w-full border rounded-xl px-4 py-3 text-sm font-semibold", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>Release Version</label>
                        <Select
                          value={selectedTemplate || ""}
                          onChange={(val) => setSelectedTemplate(Number(val))}
                          options={templates
                            .filter(t => t.name.startsWith((selectedOsFamily || "") + "-") || t.name === selectedOsFamily)
                            .map(tpl => {
                              const parts = tpl.name.split('-');
                              const version = parts.slice(1).join('-') || 'Default';
                              return {
                                value: tpl.id, 
                                label: version
                              };
                            })
                          }
                          placeholder="Select Version..."
                          className={cn("w-full border rounded-xl px-4 py-3 text-sm font-semibold", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MODE 2: 1-CLICK APPLICATIONS MARKETPLACE */}
              {imageMode === "apps" && (() => {
                const filteredAppsByCategory = VPS_APPS.filter((app) => {
                  if (selectedAppCategory === "All Apps") return true;
                  return app.category === selectedAppCategory;
                });
                const totalAppPages = Math.ceil(filteredAppsByCategory.length / APPS_PER_PAGE);
                const paginatedCheckoutApps = filteredAppsByCategory.slice((appPage - 1) * APPS_PER_PAGE, appPage * APPS_PER_PAGE);

                return (
                  <div className="space-y-4">
                    {/* Category Pills Header */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                      {APP_CATEGORIES.map((cat) => {
                        const isActive = selectedAppCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setSelectedAppCategory(cat);
                              setAppPage(1);
                            }}
                            className={cn(
                              "px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border cursor-pointer",
                              isActive
                                ? "bg-cyan-400 border-cyan-400 text-slate-950 font-black shadow-xs ring-1 ring-cyan-300/50"
                                : isDark
                                  ? "bg-[#111115] border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/20"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                            )}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    {/* App Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {paginatedCheckoutApps.map((app) => {
                        const isSelected = selectedAppId === app.id;
                        return (
                          <div
                            key={app.id}
                            onClick={() => selectApp(app)}
                            className={cn(
                              "relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group",
                              isSelected
                                ? isDark
                                  ? "bg-cyan-950/20 border-cyan-500 ring-1 ring-cyan-500/50 shadow-md"
                                  : "bg-cyan-50/50 border-cyan-500 ring-1 ring-cyan-500/40 shadow-sm"
                                : isDark
                                  ? "bg-white/[0.02] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.04]"
                                  : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white"
                            )}
                          >
                            {/* Card Top: Official Logo + Uppercase Name + Selected Badge */}
                            <div>
                              <div className="flex items-start justify-between gap-2.5 mb-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center p-2 shrink-0 border transition-colors",
                                    isDark ? "bg-[#050507] border-white/10" : "bg-white border-slate-200 shadow-2xs"
                                  )}>
                                    <img
                                      referrerPolicy="no-referrer"
                                      src={app.icon}
                                      alt={app.name}
                                      className={cn(
                                        "w-full h-full object-contain",
                                        app.id === "mikrotik-chr" && "dark:brightness-0 dark:invert"
                                      )}
                                      loading="lazy"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <span className={cn(
                                      "text-xs font-black block uppercase tracking-wide truncate",
                                      isSelected
                                        ? "text-cyan-400"
                                        : isDark ? "text-white" : "text-slate-900"
                                    )}>
                                      {app.name}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-medium block">
                                      {app.category}
                                    </span>
                                  </div>
                                </div>

                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                                    <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </div>
                                ) : (
                                  <div className={cn(
                                    "w-5 h-5 rounded-full border shrink-0 transition-colors",
                                    isDark ? "border-white/10 group-hover:border-white/30" : "border-slate-300 group-hover:border-slate-400"
                                  )} />
                                )}
                              </div>

                              <p className={cn("text-[11px] leading-relaxed line-clamp-2 mb-3", isDark ? "text-zinc-400" : "text-slate-600")}>
                                {app.description}
                              </p>
                            </div>

                            {/* Card Bottom: Version Selector Dropdown */}
                            <div className="pt-2 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0" }}>
                              <div className={cn(
                                "px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between",
                                isDark ? "bg-[#050507] border-white/10 text-zinc-300" : "bg-white border-slate-200 text-slate-700"
                              )}>
                                <span className="truncate">{app.versions[0]?.label || `${app.name} - ${app.osBase}`}</span>
                                <span className="text-[10px] font-mono text-cyan-400 shrink-0 ml-1">
                                  {app.isWebAccess === false
                                    ? (app.accessType === "database" ? `DB :${app.defaultPort}` : "CLI / SSH")
                                    : `:${app.defaultPort}`}
                                </span>
                              </div>
                              {app.minSpecs && (
                                <div className="flex items-center justify-between text-[10px] font-mono mt-1 px-0.5">
                                  <span className="text-zinc-500">Min: {app.minSpecs.cpu}C / {app.minSpecs.ram}GB</span>
                                  <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{app.estimatedTime}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* App Pagination Controls */}
                    {totalAppPages > 1 && (
                      <div className={cn(
                        "flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-1 border-t",
                        isDark ? "border-white/[0.08]" : "border-slate-200"
                      )}>
                        <span className={cn("text-xs font-mono font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                          Showing {(appPage - 1) * APPS_PER_PAGE + 1} - {Math.min(appPage * APPS_PER_PAGE, filteredAppsByCategory.length)} of {filteredAppsByCategory.length} Apps
                        </span>
                        <Pagination currentPage={appPage} totalPages={totalAppPages} onPageChange={setAppPage} />
                      </div>
                    )}

                    {/* 1-Click App Custom Configuration Fields */}
                    {selectedAppId && (() => {
                      const activeApp = getAppById(selectedAppId);
                      if (!activeApp?.configFields || activeApp.configFields.length === 0) return null;
                      return (
                        <div className={cn(
                          "mt-5 p-5 sm:p-6 rounded-2xl border transition-all space-y-5",
                          isDark ? "bg-[#0b0c10] border-white/10" : "bg-slate-50/90 border-slate-200"
                        )}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.08]">
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center p-2 shrink-0 border shadow-xs",
                                isDark ? "bg-[#050507] border-white/10" : "bg-white border-slate-200"
                              )}>
                                <img
                                  referrerPolicy="no-referrer"
                                  src={activeApp.icon}
                                  alt={activeApp.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h4 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                                    {activeApp.name} Configuration
                                  </h4>
                                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 font-bold uppercase tracking-wide whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 shadow-xs">
                                    <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                                    Automated Setup
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                                  Administrator credentials and environment settings automatically provisioned during installation.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeApp.configFields.map((field) => {
                              const isPassword = field.type === "password";
                              const isShown = showAppPasswords[field.key];
                              return (
                                <div key={field.key} className={field.key === "siteTitle" || field.key === "domain" ? "sm:col-span-2" : ""}>
                                  <label className={cn("block text-xs font-semibold mb-1.5", isDark ? "text-zinc-300" : "text-slate-700")}>
                                    {field.label}
                                    {field.required === false && !field.label.toLowerCase().includes("optional") && (
                                      <span className="text-[10px] text-zinc-500 font-normal ml-1.5">(Optional)</span>
                                    )}
                                  </label>
                                  <div className="relative">
                                    <input
                                      type={isPassword ? (isShown ? "text" : "password") : field.type}
                                      value={appConfig[field.key] ?? (field.defaultValue ?? "")}
                                      onChange={(e) => setAppConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                      placeholder={field.placeholder}
                                      className={cn(
                                        "w-full border rounded-xl px-3.5 py-2.5 text-xs font-medium outline-hidden transition-all",
                                        isPassword && "pr-10",
                                        isDark
                                          ? "bg-[#14151c] border-white/10 text-white placeholder-zinc-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                                          : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                      )}
                                    />
                                    {isPassword && (
                                      <button
                                        type="button"
                                        onClick={() => setShowAppPasswords((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                                        title={isShown ? "Hide password" : "Show password"}
                                      >
                                        {isShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                    )}
                                  </div>
                                  {field.description && (
                                    <span className="text-[10px] text-zinc-500 mt-1 block">
                                      {field.description}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Informational Banner */}
                    {selectedAppId && (() => {
                      const activeApp = getAppById(selectedAppId);
                      if (!activeApp) return null;
                      return (
                        <div className={cn(
                          "p-3.5 rounded-xl border text-xs flex items-start gap-2.5 mt-4",
                          isDark ? "bg-cyan-950/20 border-cyan-800/40 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-900"
                        )}>
                          <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                          <div className="space-y-1">
                            <div>
                              <strong>{activeApp.name}</strong> will be automatically installed on <strong>{activeApp.osBase}</strong> via Cloud-Init.
                              {" "}
                              {activeApp.isWebAccess === false ? (
                                <span className="text-amber-400 font-medium">
                                  Note: {activeApp.accessNote || "No web browser required. Operated directly via SSH terminal or remote client."}
                                </span>
                              ) : (
                                "A dedicated Public IPv4 address is attached to enable web panel access and remote client connectivity."
                              )}
                            </div>
                            {activeApp.minSpecs && (
                              <div className="text-[11px] opacity-90 flex items-center gap-2 flex-wrap pt-0.5">
                                <span className="font-semibold text-cyan-400">Official Minimum Requirements:</span>
                                <span>{activeApp.minSpecs.cpu} vCPU Cores</span>
                                <span>•</span>
                                <span>{activeApp.minSpecs.ram} GB RAM</span>
                                <span>•</span>
                                <span>{activeApp.minSpecs.disk} GB Disk</span>
                                <span>•</span>
                                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Est: {activeApp.estimatedTime}</span>
                                </span>
                                <span className="text-emerald-400 font-medium">(Auto-enforced to prevent OOM kills)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {serviceType === "KUBERNETES" && !isAddWorkerNode && (
            <motion.div variants={itemVariants} className={cn("rounded-2xl p-5 sm:p-6 border relative z-[50] w-full max-w-full min-w-0 overflow-visible", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
              <h2 className={cn("text-base sm:text-lg font-bold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Server className="w-4 h-4 text-cyan-400" />
                1. Kubernetes Control Plane Version
              </h2>
              <div className="relative z-[50]">
                <Select
                  value={kubernetesVersion}
                  onChange={(val) => setKubernetesVersion(val)}
                  options={K3S_VERSIONS.map(v => ({ 
                    value: v.id, 
                    label: (
                      <div className="flex items-center gap-3">
                        <SiKubernetes className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                        <span>{v.name}</span>
                      </div>
                    ) 
                  }))}
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm font-semibold", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                />
              </div>
            </motion.div>
          )}

          {nodes.length > 0 && (
            <motion.div variants={itemVariants} className={cn("rounded-2xl p-5 sm:p-6 border relative z-[40] w-full max-w-full min-w-0 overflow-visible", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
              <h2 className={cn("text-base sm:text-lg font-bold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <MapPin className="w-4 h-4 text-cyan-400" />
                2. Datacenter Region
              </h2>
              <div className="relative z-[40]">
                <Select
                  value={selectedNode}
                  onChange={(val) => setSelectedNode(val.toString())}
                  options={nodes.map((node: any) => ({
                    value: node.node,
                    label: nodes.length > 1 
                      ? `${node.regionName || "Region"} - Node ${node.node} (${node.status})`
                      : `${node.regionName || node.node} (${node.status})`
                  }))}
                  placeholder="Select Region..."
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm font-semibold transition-colors", isDark ? "bg-[#111115] border-white/[0.08] hover:border-white/[0.15] text-white" : "bg-white border-slate-200 hover:border-cyan-400 text-slate-900")}
                />
              </div>
            </motion.div>
          )}

          {/* Compute Resources & Billing Mode */}
          <motion.div variants={itemVariants} className={cn("rounded-2xl p-5 sm:p-6 border relative z-[30] w-full max-w-full min-w-0 overflow-visible", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b gap-3 relative z-10"
              style={{ borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(226,232,240,0.8)" }}
            >
              <div>
                <h2 className={cn("text-base sm:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  3. Compute Resources
                </h2>
                <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Scale dedicated CPU cores, memory, and block storage.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <IntelCpuBadge />
                <div className={cn("flex rounded-lg p-0.5 border", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                  <button
                    type="button"
                    onClick={() => handleSwitchDiskType("HDD")}
                    className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer", diskType === "HDD" ? "bg-cyan-400 text-slate-950 shadow-2xs font-bold" : (isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900"))}
                  >
                    <HardDrive className="w-3.5 h-3.5" /> HDD
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchDiskType("SSD")}
                    className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer", diskType === "SSD" ? "bg-cyan-400 text-slate-950 shadow-2xs font-bold" : (isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900"))}
                  >
                    <Disc className="w-3.5 h-3.5" /> SSD
                  </button>
                </div>
              </div>
            </div>

            {(() => {
              const activeApp = imageMode === "apps" && selectedAppId ? getAppById(selectedAppId) : null;
              const minCpu = activeApp?.minSpecs ? activeApp.minSpecs.cpu : 1;
              const minRam = activeApp?.minSpecs ? activeApp.minSpecs.ram : 1;
              const minDisk = activeApp?.minSpecs ? Math.max(20, activeApp.minSpecs.disk) : 20;
              const currentCpu = Math.max(minCpu, cpuCores);
              const currentRam = Math.max(minRam, ramGb);
              const currentDisk = Math.max(minDisk, diskGb);
              const maxDisk = diskType === "SSD" ? maxSpecs.diskSsd : maxSpecs.diskHdd;

              const cpuRange = Math.max(1, maxSpecs.cpu - minCpu);
              const ramRange = Math.max(1, maxSpecs.ram - minRam);
              const diskRange = Math.max(1, maxDisk - minDisk);

              const cpuPercent = Math.min(100, Math.max(0, ((currentCpu - minCpu) / cpuRange) * 100));
              const ramPercent = Math.min(100, Math.max(0, ((currentRam - minRam) / ramRange) * 100));
              const diskPercent = Math.min(100, Math.max(0, ((currentDisk - minDisk) / diskRange) * 100));

              return (
                <div className="space-y-6 relative z-10">
                  {/* vCPU Slider */}
                  <div className={cn("p-4 rounded-xl border", isDark ? "bg-white/[0.015] border-white/[0.06]" : "bg-slate-50/50 border-slate-200/70")}>
                    <div className="flex justify-between items-center mb-2.5">
                      <label className={cn("text-xs sm:text-sm font-semibold flex items-center gap-2", isDark ? "text-zinc-200" : "text-slate-700")}>
                        <Cpu className="w-4 h-4 text-cyan-400" /> vCPU Cores
                        {activeApp && activeApp.minSpecs.cpu > 1 && (
                          <span className="text-[10px] text-cyan-400 font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                            Min: {minCpu} Cores ({activeApp.name})
                          </span>
                        )}
                      </label>
                      <span className={cn("text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                        {currentCpu} Core{currentCpu > 1 ? 's' : ''}
                      </span>
                    </div>
                    <input
                      type="range" min={minCpu} max={maxSpecs.cpu} step="1"
                      value={currentCpu}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setCpuCores(Math.max(minCpu, val));
                      }}
                      className={cn(
                        "w-full h-2 rounded-lg appearance-none cursor-pointer outline-none transition-all",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.7)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform",
                        "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.7)] [&::-moz-range-thumb]:cursor-pointer"
                      )}
                      style={{
                        background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${cpuPercent}%, ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} ${cpuPercent}%, ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} 100%)`
                      }}
                    />
                    <div className="flex justify-between items-center text-[11px] font-mono text-zinc-500 mt-1.5">
                      <span>{minCpu} Core{minCpu > 1 ? 's' : ''} {minCpu > 1 ? '(App Min)' : ''}</span>
                      <span>{maxSpecs.cpu} Cores</span>
                    </div>
                  </div>

                  {/* RAM Slider */}
                  <div className={cn("p-4 rounded-xl border", isDark ? "bg-white/[0.015] border-white/[0.06]" : "bg-slate-50/50 border-slate-200/70")}>
                    <div className="flex justify-between items-center mb-2.5">
                      <label className={cn("text-xs sm:text-sm font-semibold flex items-center gap-2", isDark ? "text-zinc-200" : "text-slate-700")}>
                        <MemoryStick className="w-4 h-4 text-cyan-400" /> Memory (RAM)
                        {activeApp && activeApp.minSpecs.ram > 1 && (
                          <span className="text-[10px] text-cyan-400 font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                            Min: {minRam} GB ({activeApp.name})
                          </span>
                        )}
                      </label>
                      <span className={cn("text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                        {currentRam} GB
                      </span>
                    </div>
                    <input
                      type="range" min={minRam} max={maxSpecs.ram} step="1"
                      value={currentRam}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setRamGb(Math.max(minRam, val));
                      }}
                      className={cn(
                        "w-full h-2 rounded-lg appearance-none cursor-pointer outline-none transition-all",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.7)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform",
                        "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.7)] [&::-moz-range-thumb]:cursor-pointer"
                      )}
                      style={{
                        background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${ramPercent}%, ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} ${ramPercent}%, ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} 100%)`
                      }}
                    />
                    <div className="flex justify-between items-center text-[11px] font-mono text-zinc-500 mt-1.5">
                      <span>{minRam} GB {minRam > 1 ? '(App Min)' : ''}</span>
                      <span>{maxSpecs.ram} GB</span>
                    </div>
                  </div>

                  {/* Disk Slider */}
                  <div className={cn("p-4 rounded-xl border", isDark ? "bg-white/[0.015] border-white/[0.06]" : "bg-slate-50/50 border-slate-200/70")}>
                    <div className="flex justify-between items-center mb-2.5">
                      <label className={cn("text-xs sm:text-sm font-semibold flex items-center gap-2", isDark ? "text-zinc-200" : "text-slate-700")}>
                        <HardDrive className="w-4 h-4 text-cyan-400" /> Block Storage ({diskType})
                        {activeApp && activeApp.minSpecs.disk > 20 && (
                          <span className="text-[10px] text-cyan-400 font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                            Min: {minDisk} GB ({activeApp.name})
                          </span>
                        )}
                      </label>
                      <span className={cn("text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                        {currentDisk} GB {diskType}
                      </span>
                    </div>
                    <input
                      type="range" min={minDisk} max={maxDisk} step={minDisk % 10 === 0 ? "10" : "5"}
                      value={currentDisk}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setDiskGb(Math.max(minDisk, val));
                      }}
                      className={cn(
                        "w-full h-2 rounded-lg appearance-none cursor-pointer outline-none transition-all",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.7)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform",
                        "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.7)] [&::-moz-range-thumb]:cursor-pointer"
                      )}
                      style={{
                        background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${diskPercent}%, ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} ${diskPercent}%, ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} 100%)`
                      }}
                    />
                    <div className="flex justify-between items-center text-[11px] font-mono text-zinc-500 mt-1.5">
                      <span>{minDisk} GB {minDisk > 20 ? '(App Min)' : ''}</span>
                      <span>{maxDisk} GB</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>

          {/* Network & Extra (Only for PAYG) */}
          <motion.div variants={itemVariants} className={cn("rounded-2xl p-5 sm:p-6 border relative z-[20] grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-full min-w-0 overflow-visible", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
            <div className="flex flex-col h-full w-full max-w-full min-w-0">
              <div className="flex flex-wrap items-center justify-between mb-3.5 gap-2 shrink-0">
                <h2 className={cn("text-base sm:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Network className="w-4 h-4 text-cyan-400 shrink-0" />
                  4. Public Networking
                </h2>
                <NetworkInfraBadge />
              </div>
              <div className="flex-1 flex flex-col gap-3 w-full max-w-full min-w-0">

                {reservedIps.length > 0 && (
                  <div className={cn(
                    "p-3.5 sm:p-4 w-full max-w-full min-w-0 rounded-xl border transition-all space-y-3",
                    useReservedIp ? (isDark ? "bg-cyan-500/[0.05] border-cyan-500/50 ring-1 ring-cyan-500/20" : "bg-cyan-50/40 border-cyan-600 ring-1 ring-cyan-600/20") : (isDark ? "bg-white/[0.015] border-white/[0.07]" : "bg-slate-50/50 border-slate-200/80")
                  )}>
                    <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center font-bold border transition-colors shrink-0",
                          useReservedIp ? (isDark ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" : "bg-cyan-500/10 text-cyan-700 border-cyan-500/20") : (isDark ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]" : "bg-white border-slate-200 text-slate-600")
                        )}>
                          <Network className="w-4 h-4 shrink-0" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={cn("font-bold text-xs sm:text-sm leading-tight", useReservedIp ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>Use Reserved IP</div>
                          <div className={cn("text-[11px] font-medium truncate sm:whitespace-normal", isDark ? "text-zinc-500" : "text-slate-500")}>Attach an IP you already own</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseReservedIp(!useReservedIp)}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none transition-colors",
                          useReservedIp ? "bg-cyan-400" : (isDark ? "bg-white/10" : "bg-slate-300")
                        )}
                      >
                        <span className="sr-only">Use Reserved IP</span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute left-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            useReservedIp ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {useReservedIp && (
                      <div className={cn("pt-2 border-t", isDark ? "border-white/[0.07]" : "border-slate-200/70")}>
                        <Select
                          value={selectedReservedIpId || ""}
                          onChange={(val) => setSelectedReservedIpId(parseInt(val))}
                          options={reservedIps.map(ip => ({ 
                            value: ip.id, 
                            label: ip.publicIp ? `${ip.ipAddress} (Public: ${ip.publicIp})` : ip.ipAddress 
                          }))}
                          placeholder="Select Reserved IP"
                          className={cn("w-full rounded-lg px-3 py-2 text-sm", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                        <p className={cn("text-[11px] mt-2", isDark ? "text-zinc-500" : "text-slate-500")}>
                          When using a reserved IP, you will not be billed hourly for the IP on this service.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!useReservedIp && hasIpv4Pool && (
                  <div className={cn(
                    "flex flex-col p-3.5 sm:p-4 w-full max-w-full min-w-0 rounded-xl border transition-all gap-3 flex-1 justify-center",
                    ipv4Count > 0 ? (isDark ? "bg-cyan-500/[0.05] border-cyan-500/50 ring-1 ring-cyan-500/20" : "bg-cyan-50/40 border-cyan-600 ring-1 ring-cyan-600/20") : (isDark ? "bg-white/[0.015] border-white/[0.07]" : "bg-slate-50/50 border-slate-200/80")
                  )}>
                    <div className="flex items-center justify-between w-full gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center font-bold border text-[10px] sm:text-xs transition-colors shrink-0",
                          ipv4Count > 0 ? (isDark ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" : "bg-cyan-500/10 text-cyan-700 border-cyan-500/20") : (isDark ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]" : "bg-white border-slate-200 text-slate-600")
                        )}>
                          IPv4
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={cn("font-bold text-xs sm:text-sm leading-tight mb-0.5", ipv4Count > 0 ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>Public IPv4</div>
                          <div className={cn("text-[10px] sm:text-xs font-medium truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
                            +{formatRupiah(pricing.ipv4 || 0)}/hr <span className="hidden sm:inline">per IP</span>
                          </div>
                        </div>
                      </div>

                      <div className={cn(
                        "flex items-center gap-1.5 rounded-lg p-1 border shrink-0",
                        isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200"
                      )}>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedAppId && ipv4Count <= 1) {
                              toast.info("A dedicated Public IPv4 address is strictly required for 1-Click Applications.");
                              return;
                            }
                            setIpv4Count(Math.max(0, ipv4Count - 1));
                          }}
                          disabled={ipv4Count <= 0 || Boolean(selectedAppId && ipv4Count <= 1)}
                          className={cn(
                            "w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-all disabled:opacity-30 cursor-pointer",
                            isDark ? "bg-white/[0.04] hover:bg-white/[0.08] text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
                          )}
                        >
                          -
                        </button>
                        <span className={cn("w-5 text-center font-bold font-mono text-xs sm:text-sm", ipv4Count > 0 ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>{ipv4Count}</span>
                        <button
                          type="button"
                          onClick={() => setIpv4Count(Math.min(10, ipv4Count + 1))}
                          className={cn(
                            "w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-all cursor-pointer",
                            isDark ? "bg-white/[0.04] hover:bg-white/[0.08] text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
                          )}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className={cn(
                      "pt-2 border-t flex flex-wrap items-center justify-between text-[11px] font-mono gap-1.5",
                      isDark ? "border-white/[0.07]" : "border-slate-200/70"
                    )}>
                      <span className={cn("font-sans", isDark ? "text-zinc-400" : "text-slate-500")}>Est. Cost ({ipv4Count} IP):</span>
                      <div className={cn("font-bold text-right", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        +{formatRupiah(ipv4Count * (pricing.ipv4 || 0))}/hr <span className={cn("font-normal font-sans block sm:inline", isDark ? "text-zinc-500" : "text-slate-500")}>(~{formatRupiah(ipv4Count * (pricing.ipv4 || 0) * 720)}/mo)</span>
                      </div>
                    </div>

                    {/* Note: Public IP allocation requires opening a support ticket after VPS activation */}
                    <div className={cn(
                      "p-3 rounded-xl border flex items-start gap-2.5 text-[11px] sm:text-xs leading-relaxed transition-all",
                      isDark 
                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" 
                        : "bg-cyan-50 border-cyan-200 text-cyan-900 shadow-2xs"
                    )}>
                      <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} role="presentation" aria-hidden="true" />
                      <p className={cn("leading-relaxed", isDark ? "text-cyan-200/90" : "text-slate-700")}>
                        <strong className={cn("font-semibold mr-1.5", isDark ? "text-cyan-400" : "text-cyan-950")}>Note:</strong> After your VPS is active, please open a support ticket to request a Public IP allocation.
                      </p>
                    </div>
                  </div>
                )}

                {hasIpv6Pool && (
                  <div className={cn(
                    "flex flex-col p-3.5 sm:p-4 w-full max-w-full min-w-0 rounded-xl border transition-all gap-3",
                    ipv6Count > 0 ? (isDark ? "bg-cyan-500/[0.05] border-cyan-500/50 ring-1 ring-cyan-500/20" : "bg-cyan-50/40 border-cyan-600 ring-1 ring-cyan-600/20") : (isDark ? "bg-white/[0.015] border-white/[0.07]" : "bg-slate-50/50 border-slate-200/80")
                  )}>
                    <div className="flex items-center justify-between w-full gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center font-bold border text-xs transition-colors shrink-0",
                          ipv6Count > 0 ? (isDark ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" : "bg-cyan-500/10 text-cyan-700 border-cyan-500/20") : (isDark ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]" : "bg-white border-slate-200 text-slate-600")
                        )}>
                          IPv6
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={cn("font-bold text-xs sm:text-sm leading-tight mb-0.5", ipv6Count > 0 ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>Public IPv6</div>
                          <div className={cn("text-[10px] sm:text-xs font-medium truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
                            +{formatRupiah(pricing.ipv6 || 0)}/hr <span className="hidden sm:inline">per IP</span>
                          </div>
                        </div>
                      </div>

                      <div className={cn(
                        "flex items-center gap-1.5 rounded-lg p-1 border shrink-0",
                        isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200"
                      )}>
                        <button
                          type="button"
                          onClick={() => setIpv6Count(Math.max(0, ipv6Count - 1))}
                          disabled={ipv6Count <= 0}
                          className={cn(
                            "w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-all disabled:opacity-30 cursor-pointer",
                            isDark ? "bg-white/[0.04] hover:bg-white/[0.08] text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
                          )}
                        >
                          -
                        </button>
                        <span className={cn("w-5 text-center font-bold font-mono text-xs sm:text-sm", ipv6Count > 0 ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>{ipv6Count}</span>
                        <button
                          type="button"
                          onClick={() => setIpv6Count(Math.min(10, ipv6Count + 1))}
                          className={cn(
                            "w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-all cursor-pointer",
                            isDark ? "bg-white/[0.04] hover:bg-white/[0.08] text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
                          )}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className={cn(
                      "pt-2 border-t flex flex-wrap items-center justify-between text-[11px] font-mono gap-1.5",
                      isDark ? "border-white/[0.07]" : "border-slate-200/70"
                    )}>
                      <span className={cn("font-sans", isDark ? "text-zinc-400" : "text-slate-500")}>Est. Cost ({ipv6Count} IP):</span>
                      <div className={cn("font-bold text-right", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        +{formatRupiah(ipv6Count * (pricing.ipv6 || 0))}/hr <span className={cn("font-normal font-sans block sm:inline", isDark ? "text-zinc-500" : "text-slate-500")}>(~{formatRupiah(ipv6Count * (pricing.ipv6 || 0) * 720)}/mo)</span>
                      </div>
                    </div>
                  </div>
                )}
                {!useReservedIp && !hasIpv4Pool && !hasIpv6Pool && (
                  <div className="p-3 rounded-lg border border-white/[0.07] bg-white/[0.02] text-sm text-zinc-400 text-center">
                    No Public IP addresses available at the moment.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col h-full w-full max-w-full min-w-0">
              <h2 className={cn("text-base sm:text-lg font-bold mb-3.5 flex items-center gap-2 shrink-0", isDark ? "text-white" : "text-slate-900")}>
                <DatabaseBackup className="w-4 h-4 text-cyan-400 shrink-0" />
                5. Automated Backups
              </h2>
              <div className={cn(
                "flex flex-col p-3.5 sm:p-4 w-full max-w-full min-w-0 rounded-xl border transition-all gap-3 flex-1 justify-center",
                backupGb > 0
                  ? (isDark ? "bg-cyan-500/[0.05] border-cyan-500/50 ring-1 ring-cyan-500/20" : "bg-cyan-50/40 border-cyan-600 ring-1 ring-cyan-600/20")
                  : (isDark ? "bg-white/[0.015] border-white/[0.07]" : "bg-slate-50/50 border-slate-200/80")
              )}>
                <div className="flex items-center justify-between w-full gap-2 min-w-0">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center font-bold border text-xs transition-colors shrink-0",
                      backupGb > 0 ? (isDark ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" : "bg-cyan-500/10 text-cyan-700 border-cyan-500/20") : (isDark ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]" : "bg-white border-slate-200 text-slate-600")
                    )}>
                      <HardDrive className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn("font-bold text-xs sm:text-sm leading-tight mb-0.5", backupGb > 0 ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>Offsite Snapshot Quota</div>
                      <div className={cn("text-[10px] sm:text-xs font-medium truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
                        +{formatRupiah(pricing.backup || 0)}/hr <span className="hidden sm:inline">per GB</span>
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "flex items-center gap-1 rounded-lg px-2.5 py-1 border shrink-0",
                    isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200"
                  )}>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={backupGb.toString()}
                      onChange={(e) => {
                        if (e.target.value === "") {
                          setBackupGb(0);
                        } else {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            setBackupGb(Math.min(val, maxBackupAllowed));
                          }
                        }
                      }}
                      className={cn(
                        "bg-transparent text-center font-bold text-xs sm:text-sm font-mono focus:outline-none p-0 border-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                        backupGb > 0 ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900")
                      )}
                      style={{ width: `${Math.max(1, backupGb.toString().length)}ch` }}
                    />
                    <span className={cn("font-bold text-xs sm:text-sm font-mono pr-0.5", backupGb > 0 ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>GB</span>
                  </div>
                </div>

                <input
                  type="range" min="0" max={maxBackupAllowed} step="5"
                  value={backupGb} onChange={e => setBackupGb(Math.min(Number(e.target.value), maxBackupAllowed))}
                  className={cn("w-full max-w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-none my-1", isDark ? "bg-white/10" : "bg-slate-200")}
                  style={{ background: `linear-gradient(to right, #22d3ee ${((backupGb - 0) / Math.max(1, maxBackupAllowed - 0)) * 100}%, ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} ${((backupGb - 0) / Math.max(1, maxBackupAllowed - 0)) * 100}%)` }}
                />

                {backupGb > 0 ? (
                  <div className={cn(
                    "pt-2 border-t flex flex-wrap items-center justify-between text-[11px] font-mono gap-1.5",
                    isDark ? "border-white/[0.07]" : "border-slate-200/70"
                  )}>
                    <span className={cn("font-sans", isDark ? "text-zinc-400" : "text-slate-500")}>Est. Cost ({backupGb} GB):</span>
                    <div className={cn("font-bold text-right", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      +{formatRupiah(backupGb * (pricing.backup || 0))}/hr <span className={cn("font-normal font-sans block sm:inline", isDark ? "text-zinc-500" : "text-slate-500")}>(~{formatRupiah(backupGb * (pricing.backup || 0) * 720)}/mo)</span>
                    </div>
                  </div>
                ) : (
                  <div className={cn("pt-2 border-t flex flex-col sm:flex-row sm:items-start justify-between text-[11px] gap-1 sm:gap-2", isDark ? "border-white/[0.07]" : "border-slate-200/70")}>
                    <span className={cn("font-sans leading-snug", isDark ? "text-zinc-500" : "text-slate-500")}>Enable automatic backups by allocating storage.</span>
                    <div className={cn("font-mono italic text-left sm:text-right shrink-0", isDark ? "text-zinc-500" : "text-slate-400")}>0 GB (Free)</div>
                  </div>
                )}
              </div>
            </div>

            {/* Bandwidth Speed Limit Section */}
            <div className="flex flex-col h-full w-full max-w-full min-w-0 md:col-span-2">
              <h2 className={cn("text-base sm:text-lg font-bold mb-3.5 flex items-center gap-2 shrink-0", isDark ? "text-white" : "text-slate-900")}>
                <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                6. Network Port Speed
              </h2>
              <div className={cn(
                "flex flex-col p-4 w-full max-w-full min-w-0 rounded-xl border transition-all gap-4",
                isDark ? "bg-white/[0.015] border-white/[0.07]" : "bg-slate-50/50 border-slate-200/80"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className={cn("font-bold text-xs sm:text-sm", isDark ? "text-white" : "text-slate-900")}>Port Speed Rate Limit</span>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Dedicated network port traffic shaper. 100 Mbps base speed is included free.</p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border transition-colors",
                      isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                    )}>
                      {bandwidthMbps} Mbps {bandwidthMbps === 100 ? "(Free)" : `(+${formatRupiah(Math.floor((bandwidthMbps - 100) / 50) * 50000)}/mo)`}
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                {bandwidthOptions.length > 1 && (
                  <div className="pt-1">
                    <input
                      type="range"
                      min={bandwidthOptions[0]}
                      max={bandwidthOptions[bandwidthOptions.length - 1]}
                      step={50}
                      value={bandwidthMbps}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const closest = bandwidthOptions.reduce((prev, curr) =>
                          Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev, bandwidthOptions[0]
                        );
                        setBandwidthMbps(closest);
                      }}
                      className={cn(
                        "w-full max-w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-none my-1",
                        isDark ? "bg-white/10" : "bg-slate-200"
                      )}
                      style={{
                        background: `linear-gradient(to right, #22d3ee ${((bandwidthMbps - bandwidthOptions[0]) / Math.max(1, bandwidthOptions[bandwidthOptions.length - 1] - bandwidthOptions[0])) * 100}%, ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} ${((bandwidthMbps - bandwidthOptions[0]) / Math.max(1, bandwidthOptions[bandwidthOptions.length - 1] - bandwidthOptions[0])) * 100}%)`
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {bandwidthOptions.map((speed, index) => {
                    const isSelected = bandwidthMbps === speed;
                    const extraSteps = Math.floor(Math.max(0, speed - 100) / 50);
                    const monthlyPrice = extraSteps * 50000;
                    const isLastOdd = index === bandwidthOptions.length - 1 && bandwidthOptions.length % 2 === 1;
                    return (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => setBandwidthMbps(speed)}
                        className={cn(
                          "flex items-center justify-center py-2 px-2 rounded-lg border text-center transition-all cursor-pointer relative min-w-0",
                          isLastOdd ? "col-span-2 sm:col-span-1 flex-row gap-2 sm:flex-col sm:gap-0" : "col-span-1 flex-col",
                          isSelected
                            ? (isDark ? "bg-cyan-500/15 border-cyan-500/50 text-white" : "bg-cyan-50 border-cyan-600 text-cyan-900")
                            : (isDark ? "bg-[#111115] border-white/[0.07] text-zinc-300 hover:border-white/[0.15]" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300")
                        )}
                      >
                        <span className="font-bold text-xs sm:text-sm font-mono tracking-tight shrink-0">{speed} Mbps</span>
                        <span className={cn(
                          "text-[10px] font-semibold tracking-tight whitespace-nowrap",
                          isLastOdd ? "mt-0 sm:mt-0.5" : "mt-0.5",
                          speed === 100
                            ? (isSelected ? "text-cyan-400 font-bold" : (isDark ? "text-cyan-400" : "text-cyan-600"))
                            : (isSelected ? (isDark ? "text-cyan-300" : "text-cyan-800") : (isDark ? "text-zinc-500" : "text-slate-500"))
                        )}>
                          {speed === 100 ? "FREE" : `+${formatRupiah(monthlyPrice)}/mo`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col h-full w-full max-w-full min-w-0 md:col-span-2">
              <h2 className={cn("text-base sm:text-lg font-bold mb-3.5 flex items-center gap-2 shrink-0", isDark ? "text-white" : "text-slate-900")}>
                <VpcIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                7. Virtual Private Cloud (VPC)
              </h2>
              <div className={cn(
                "flex flex-col p-3.5 sm:p-4 w-full max-w-full min-w-0 rounded-xl border transition-all gap-3 flex-1",
                isDark ? "bg-white/[0.015] border-white/[0.07]" : "bg-slate-50/50 border-slate-200/80"
              )}>
                <div className="flex items-center justify-between w-full gap-2 sm:gap-3 min-w-0">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center font-bold border transition-colors shrink-0",
                      isDark ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" : "bg-cyan-500/10 text-cyan-700 border-cyan-500/20"
                    )}>
                      <Plug className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn("font-bold text-xs sm:text-sm leading-tight", isDark ? "text-white" : "text-slate-900")}>Attach to Private VPC</div>
                      <div className={cn("text-[11px] font-medium truncate sm:whitespace-normal", isDark ? "text-zinc-500" : "text-slate-500")}>Isolate instance traffic on a dedicated RFC 1918 subnet</div>
                    </div>
                  </div>

                  <div className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-md shrink-0">
                    Required
                  </div>
                </div>

                {useVpc && (
                  <div className={cn("pt-3 border-t space-y-4", isDark ? "border-white/[0.07]" : "border-slate-200/70")}>
                    {isCreatingVpc ? (
                      <div className={cn("p-4 rounded-xl border space-y-3", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200")}>
                        <h4 className={cn("text-sm font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Create New VPC</h4>
                        <div>
                          <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>VPC Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            placeholder="e.g. Production Network"
                            value={newVpcName}
                            onChange={(e) => setNewVpcName(e.target.value)}
                            className={cn("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-300 text-slate-900")}
                          />
                        </div>
                        <div>
                          <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>Description (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. For web servers and databases"
                            value={newVpcDescription}
                            onChange={(e) => setNewVpcDescription(e.target.value)}
                            className={cn("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-300 text-slate-900")}
                          />
                        </div>
                        <div>
                          <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>IPv4 CIDR Block <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            placeholder="e.g. 10.10.100.0/24"
                            value={newVpcCidr}
                            onChange={(e) => setNewVpcCidr(e.target.value)}
                            className={cn(
                              "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-mono",
                              isDark ? "bg-[#111115] text-white" : "bg-white text-slate-900",
                              (newVpcCidr && validateCidr(newVpcCidr).error) ? "border-red-500 focus:border-red-500" : (isDark ? "border-white/[0.08] focus:border-cyan-500" : "border-slate-300 focus:border-cyan-500")
                            )}
                          />
                          {(newVpcCidr && validateCidr(newVpcCidr).error) ? (
                            <p className="text-[11px] text-red-400 mt-1.5">
                              {validateCidr(newVpcCidr).error}
                              {validateCidr(newVpcCidr).suggestion && (
                                <> - <button type="button" onClick={() => setNewVpcCidr(validateCidr(newVpcCidr).suggestion!)} className="text-cyan-400 hover:underline">Did you mean {validateCidr(newVpcCidr).suggestion}?</button></>
                              )}
                            </p>
                          ) : (
                            <p className={cn("text-[11px] mt-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                              Must be a private IP range (RFC 1918). e.g., 10.x.x.x, 172.16.x.x, 192.168.x.x.
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2.5 gap-3 w-full">
                          <div className="min-w-0 flex-1">
                            <div className={cn("text-xs sm:text-sm font-medium flex items-center gap-2 flex-wrap leading-tight", isDark ? "text-white" : "text-slate-900")}>
                              <span>Enable NAT Gateway</span>
                              <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0 font-bold", isDark ? "bg-white/[0.06] text-zinc-400 border-white/[0.08]" : "bg-slate-100 text-slate-500 border-slate-200")}>VPC Level</span>
                            </div>
                            <div className={cn("text-[11px] sm:text-xs mt-0.5 leading-snug", isDark ? "text-zinc-500" : "text-slate-500")}>Allow instances to access the internet</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewVpcNatEnabled(!newVpcNatEnabled)}
                            className={cn(
                              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full focus:outline-none transition-colors",
                              newVpcNatEnabled ? "bg-cyan-400" : (isDark ? "bg-white/10" : "bg-slate-300")
                            )}
                          >
                            <span className="sr-only">Toggle NAT Gateway</span>
                            <span
                              aria-hidden="true"
                              className={cn(
                                "pointer-events-none absolute left-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                newVpcNatEnabled ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsCreatingVpc(false)}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateVpcInline}
                            disabled={isSubmittingVpc}
                            className="bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-50 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                          >
                            {isSubmittingVpc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Create VPC
                          </button>
                        </div>
                      </div>
                    ) : vpcs.length === 0 ? (
                      <div className={cn("text-sm p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-3", isDark ? "text-zinc-400 bg-[#0a0a0c] border-white/[0.08]" : "text-slate-500 bg-white border-slate-200")}>
                        <p>You don't have any Virtual Private Cloud networks.</p>
                        <button 
                          type="button"
                          onClick={() => setIsCreatingVpc(true)} 
                          className="bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 px-4 py-2 rounded-lg font-semibold transition-colors text-xs"
                        >
                          Create VPC Network
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>Select VPC Network</label>
                          <div className="flex flex-col gap-2 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                              <div className="flex-1 min-w-0 w-full">
                                <Select
                                  value={selectedVpcId?.toString() || ""}
                                  onChange={(val) => setSelectedVpcId(Number(val))}
                                  options={vpcs.map(vpc => ({ value: vpc.id.toString(), label: `${vpc.name} (${vpc.cidr})` }))}
                                  placeholder="Select VPC Network"
                                  className={cn("py-2 px-3 min-h-[38px] rounded-lg w-full", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                                />
                              </div>
                              <button 
                                type="button"
                                onClick={() => setIsCreatingVpc(true)} 
                                className={cn("w-full sm:w-auto shrink-0 border px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 min-h-[38px] cursor-pointer", isDark ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-cyan-400" : "bg-white hover:bg-slate-50 border-slate-200 text-cyan-700")}
                              >
                                <Plus className="w-3.5 h-3.5" /> New VPC
                              </button>
                            </div>
                            {selectedVpcId && (() => {
                              const selectedVpcObj = vpcs.find(v => v.id === selectedVpcId);
                              if (!selectedVpcObj) return null;
                              return (
                                <div className="flex items-center justify-between mt-2.5 gap-3 w-full">
                                  <div className="min-w-0 flex-1">
                                    <div className={cn("text-xs sm:text-sm font-medium flex items-center gap-2 flex-wrap leading-tight", isDark ? "text-white" : "text-slate-900")}>
                                      <span>NAT Gateway</span>
                                      <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0 font-bold", isDark ? "bg-white/[0.06] text-zinc-400 border-white/[0.08]" : "bg-slate-100 text-slate-500 border-slate-200")}>VPC Level</span>
                                    </div>
                                    <div className={cn("text-[11px] sm:text-xs mt-0.5 leading-snug truncate sm:whitespace-normal", isDark ? "text-zinc-500" : "text-slate-500")}>Enable internet access for all VMs in this VPC</div>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={loading}
                                    onClick={async () => {
                                      const newState = !selectedVpcObj.isNatEnabled;
                                      setVpcs(vpcs.map(v => v.id === selectedVpcId ? { ...v, isNatEnabled: newState } : v));
                                      
                                      try {
                                        const res = await fetch(`/api/dashboard/vpc/${selectedVpcId}/nat`, {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ isNatEnabled: newState })
                                        });
                                        if (!res.ok) throw new Error("Failed to update NAT Gateway");
                                        toast.success(`NAT Gateway ${newState ? 'enabled' : 'disabled'} for ${selectedVpcObj.name}`);
                                      } catch (err: any) {
                                        toast.error(err.message || "Failed to update NAT Gateway");
                                        setVpcs(vpcs.map(v => v.id === selectedVpcId ? { ...v, isNatEnabled: !newState } : v));
                                      }
                                    }}
                                    className={cn(
                                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none transition-colors disabled:opacity-50",
                                      selectedVpcObj.isNatEnabled ? "bg-cyan-400" : (isDark ? "bg-white/10" : "bg-slate-300")
                                    )}
                                  >
                                    <span className="sr-only">Toggle NAT Gateway</span>
                                    <span
                                      aria-hidden="true"
                                      className={cn(
                                        "pointer-events-none absolute left-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        selectedVpcObj.isNatEnabled ? "translate-x-4" : "translate-x-0"
                                      )}
                                    />
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div>
                          <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>Private IP Address <span className="text-red-500">*</span></label>
                          {(() => {
                            const currentVpc = vpcs.find(v => v.id === selectedVpcId);
                            const ipRange = currentVpc ? getUsableIpRange(currentVpc.cidr, currentVpc.gateway || '') : null;
                            const placeholderText = ipRange ? `e.g. ${ipRange.first}` : 'e.g. 10.10.100.5';
                            const isGatewayEntered = currentVpc?.gateway && privateIpAddress.trim() === currentVpc.gateway;
                            const isIpUsed = currentVpc?.vpsServices?.some((v: any) => v.vpcIp === privateIpAddress.trim());
                            const isIpOutOfRange = (() => {
                              if (!ipRange || !privateIpAddress.trim() || isGatewayEntered || isIpUsed) return false;
                              const ipNum = ipToNum(privateIpAddress.trim());
                              const firstNum = ipToNum(ipRange.first);
                              const lastNum = ipToNum(ipRange.last);
                              return ipNum < firstNum || ipNum > lastNum;
                            })();
                            const hasError = isGatewayEntered || isIpOutOfRange || isIpUsed;

                            return (
                              <>
                                <input
                                  type="text"
                                  placeholder={placeholderText}
                                  value={privateIpAddress}
                                  onChange={(e) => setPrivateIpAddress(e.target.value)}
                                  className={cn(
                                    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-mono transition-colors",
                                    isDark ? "bg-[#111115] text-white" : "bg-white text-slate-900",
                                    hasError ? "border-red-500/60 focus:border-red-500" : (isDark ? "border-white/[0.08] focus:border-cyan-500" : "border-slate-200 focus:border-cyan-500")
                                  )}
                                />
                                {isGatewayEntered ? (
                                  <div className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span><strong>{privateIpAddress}</strong> is reserved for the VPC Gateway. Please use a usable IP.</span>
                                  </div>
                                ) : isIpUsed ? (
                                  <div className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span><strong>{privateIpAddress}</strong> is already in use by another VM in this VPC.</span>
                                  </div>
                                ) : isIpOutOfRange ? (
                                  <div className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span><strong>{privateIpAddress}</strong> is outside the valid range. Please use {ipRange?.first} - {ipRange?.last}.</span>
                                  </div>
                                ) : ipRange && (
                                  <div className={cn("text-[11px] mt-1.5 font-mono flex flex-wrap items-center gap-x-1.5 gap-y-0.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                                    <span>Valid range:</span>
                                    <span className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>{ipRange.first} – {ipRange.last}</span>
                                    <span className={isDark ? "text-zinc-500" : "text-slate-400"}>({ipRange.count} usable IPs)</span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Firewall Settings */}
          <motion.div variants={itemVariants} className={cn("rounded-2xl p-5 sm:p-6 border relative z-[10] w-full max-w-full min-w-0 overflow-visible", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
            <div className="mb-4">
              <h2 className={cn("text-base sm:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                8. Security Group & Firewall
              </h2>
              <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                Define inbound traffic rules for your instance.
              </p>
            </div>

            <div className="space-y-3">
              {/* SSH Rule */}
              <div className={cn("border p-3.5 sm:p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3", isDark ? "bg-white/[0.015] border-white/[0.07]" : "bg-slate-50/50 border-slate-200/80")}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setFirewallRules(r => ({ ...r, ssh: { ...r.ssh, enabled: !r.ssh.enabled } }))}
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                      firewallRules.ssh.enabled
                        ? "bg-cyan-400 border-cyan-400"
                        : isDark ? "bg-transparent border-white/[0.2] hover:border-cyan-400/50" : "bg-white border-slate-300 hover:border-cyan-500"
                    )}
                  >
                    <CheckCircle className={cn("w-3 h-3", firewallRules.ssh.enabled ? "text-slate-950" : "text-transparent")} />
                  </button>
                  <div>
                    <div className={cn("text-xs sm:text-sm font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Allow SSH (Port 22)</div>
                    <div className={cn("text-[11px] mt-0.5 leading-snug", isDark ? "text-zinc-400" : "text-slate-500")}>Remote terminal access to your instance</div>
                  </div>
                </div>
                {firewallRules.ssh.enabled && (
                  <div className="flex flex-col gap-2 w-full md:w-64 shrink-0">
                    <Select
                      className={cn("w-full border rounded-lg px-3 py-2 text-xs sm:text-sm", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                      value={firewallRules.ssh.source}
                      onChange={(val) => setFirewallRules(r => ({ ...r, ssh: { ...r.ssh, source: val } }))}
                      options={[
                        { value: 'anywhere', label: 'Anywhere (0.0.0.0/0)' },
                        { value: 'myip', label: `My IP ${clientIp ? `(${clientIp}/32)` : ''}` },
                        { value: 'custom', label: 'Custom IP / CIDR' },
                      ]}
                    />
                    {firewallRules.ssh.source === "custom" && (
                      <input
                        type="text" placeholder="e.g. 192.168.1.1/32"
                        className={cn("border rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 w-full font-mono", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        value={firewallRules.ssh.customIp}
                        onChange={(e) => setFirewallRules(r => ({ ...r, ssh: { ...r.ssh, customIp: e.target.value } }))}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* HTTPS Rule */}
              <div className={cn("border p-3.5 sm:p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3", isDark ? "bg-white/[0.015] border-white/[0.07]" : "bg-slate-50/50 border-slate-200/80")}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setFirewallRules(r => ({ ...r, https: { ...r.https, enabled: !r.https.enabled } }))}
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                      firewallRules.https.enabled
                        ? "bg-cyan-400 border-cyan-400"
                        : isDark ? "bg-transparent border-white/[0.2] hover:border-cyan-400/50" : "bg-white border-slate-300 hover:border-cyan-500"
                    )}
                  >
                    <CheckCircle className={cn("w-3 h-3", firewallRules.https.enabled ? "text-slate-950" : "text-transparent")} />
                  </button>
                  <div>
                    <div className={cn("text-xs sm:text-sm font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Allow HTTPS (Port 443)</div>
                    <div className={cn("text-[11px] mt-0.5 leading-snug", isDark ? "text-zinc-400" : "text-slate-500")}>Encrypted web traffic from the internet</div>
                  </div>
                </div>
                {firewallRules.https.enabled && (
                  <div className="flex flex-col gap-2 w-full md:w-64 shrink-0">
                    <Select
                      className={cn("w-full border rounded-lg px-3 py-2 text-xs sm:text-sm", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                      value={firewallRules.https.source}
                      onChange={(val) => setFirewallRules(r => ({ ...r, https: { ...r.https, source: val } }))}
                      options={[
                        { value: 'anywhere', label: 'Anywhere (0.0.0.0/0)' },
                        { value: 'myip', label: `My IP ${clientIp ? `(${clientIp}/32)` : ''}` },
                        { value: 'custom', label: 'Custom IP / CIDR' },
                      ]}
                    />
                    {firewallRules.https.source === "custom" && (
                      <input
                        type="text" placeholder="e.g. 192.168.1.1/32"
                        className={cn("border rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 w-full font-mono", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        value={firewallRules.https.customIp}
                        onChange={(e) => setFirewallRules(r => ({ ...r, https: { ...r.https, customIp: e.target.value } }))}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* HTTP Rule */}
              <div className={cn("border p-3.5 sm:p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3", isDark ? "bg-white/[0.015] border-white/[0.07]" : "bg-slate-50/50 border-slate-200/80")}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setFirewallRules(r => ({ ...r, http: { ...r.http, enabled: !r.http.enabled } }))}
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                      firewallRules.http.enabled
                        ? "bg-cyan-400 border-cyan-400"
                        : isDark ? "bg-transparent border-white/[0.2] hover:border-cyan-400/50" : "bg-white border-slate-300 hover:border-cyan-500"
                    )}
                  >
                    <CheckCircle className={cn("w-3 h-3", firewallRules.http.enabled ? "text-slate-950" : "text-transparent")} />
                  </button>
                  <div>
                    <div className={cn("text-xs sm:text-sm font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Allow HTTP (Port 80)</div>
                    <div className={cn("text-[11px] mt-0.5 leading-snug", isDark ? "text-zinc-400" : "text-slate-500")}>Unencrypted web traffic and ACME challenges</div>
                  </div>
                </div>
                {firewallRules.http.enabled && (
                  <div className="flex flex-col gap-2 w-full md:w-64 shrink-0">
                    <Select
                      className={cn("w-full border rounded-lg px-3 py-2 text-xs sm:text-sm", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                      value={firewallRules.http.source}
                      onChange={(val) => setFirewallRules(r => ({ ...r, http: { ...r.http, source: val } }))}
                      options={[
                        { value: 'anywhere', label: 'Anywhere (0.0.0.0/0)' },
                        { value: 'myip', label: `My IP ${clientIp ? `(${clientIp}/32)` : ''}` },
                        { value: 'custom', label: 'Custom IP / CIDR' },
                      ]}
                    />
                    {firewallRules.http.source === "custom" && (
                      <input
                        type="text" placeholder="e.g. 192.168.1.1/32"
                        className={cn("border rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 w-full font-mono", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        value={firewallRules.http.customIp}
                        onChange={(e) => setFirewallRules(r => ({ ...r, http: { ...r.http, customIp: e.target.value } }))}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Authentication & Settings */}
          <motion.div variants={itemVariants} className={cn("rounded-2xl p-5 sm:p-6 border relative z-[5] w-full max-w-full min-w-0 overflow-visible", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
            <div className="mb-4">
              <h2 className={cn("text-base sm:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Settings2 className="w-4 h-4 text-cyan-400" />
                9. Instance Identity & Authentication
              </h2>
              <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                Configure the FQDN hostname, system user, and SSH key credentials.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-4">
                <div>
                  <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>Hostname (FQDN)</label>
                  <input
                    type="text"
                    required
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="server.example.com"
                    className={cn("w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors", isDark ? "bg-[#111115] border-white/[0.08] text-white focus:border-cyan-500/60 placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 focus:border-cyan-500 placeholder:text-slate-400")}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={cn("block text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>System Username</label>
                    {isWindows && (
                      <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                        Default Administrator
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={isWindows ? "Administrator" : username}
                    disabled={isWindows}
                    readOnly={isWindows}
                    onChange={(e) => {
                      if (!isWindows) {
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                      }
                    }}
                    placeholder={isWindows ? "Administrator" : "ubuntu"}
                    className={cn(
                      "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors",
                      isWindows
                        ? (isDark ? "bg-[#111115]/60 border-white/[0.06] text-zinc-500 cursor-not-allowed select-none" : "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed select-none")
                        : (isDark ? "bg-[#111115] border-white/[0.08] text-white focus:border-cyan-500/60 placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 focus:border-cyan-500 placeholder:text-slate-400")
                    )}
                  />
                  {isWindows && (
                    <p className={cn("text-[11px] mt-1.5 flex items-center gap-1.5 font-medium", isDark ? "text-cyan-400/90" : "text-cyan-700")}>
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>Windows requires the default user <strong>Administrator</strong>.</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={cn("block text-xs font-semibold mb-1.5", isDark ? "text-zinc-200" : "text-slate-800")}>
                    VPS Server Root Password <span className="text-cyan-400">*</span>
                    <span className={cn("block text-[10px] font-normal mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Used for SSH (Port 22) & Web Console access. 1-Click App web passwords are automatically generated.
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 symbol..."
                      className={cn(
                        "w-full border rounded-xl pl-4 pr-11 py-3 text-sm font-medium focus:outline-none transition-colors",
                        isDark ? "bg-[#111115] text-white placeholder:text-zinc-600" : "bg-white text-slate-900 placeholder:text-slate-400",
                        passwordError && password.length > 0
                          ? "border-red-500/60 focus:border-red-500"
                          : isDark ? "border-white/[0.08] focus:border-cyan-500/60" : "border-slate-200 focus:border-cyan-500"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-cyan-400 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Retype password..."
                      className={cn(
                        "w-full border rounded-xl pl-4 pr-11 py-3 text-sm font-medium focus:outline-none transition-colors",
                        isDark ? "bg-[#111115] text-white placeholder:text-zinc-600" : "bg-white text-slate-900 placeholder:text-slate-400",
                        password !== passwordConfirm && passwordConfirm.length > 0
                          ? "border-red-500/60 focus:border-red-500"
                          : isDark ? "border-white/[0.08] focus:border-cyan-500/60" : "border-slate-200 focus:border-cyan-500"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-cyan-400 transition-colors p-1"
                    >
                      {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {passwordError && (
                  <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> {passwordError}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 pt-5 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(226,232,240,0.8)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <label className={cn("block text-xs font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>
                    SSH Public Key (Optional)
                  </label>
                  {userSavedKeys.length > 0 && (
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      isDark ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                    )}>
                      {userSavedKeys.length} Saved {userSavedKeys.length === 1 ? 'Key' : 'Keys'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href="/dashboard/settings?tab=ssh-keys"
                    target="_blank"
                    className={cn(
                      "text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors font-medium",
                      isDark
                        ? "text-zinc-400 hover:text-white border-white/[0.08] hover:bg-white/[0.04]"
                        : "text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <KeyRound className="w-3 h-3 text-cyan-400" />
                    Manage in Settings
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleGenerateSSHKey}
                    disabled={isGeneratingKey}
                    className={cn(
                      "text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-semibold cursor-pointer",
                      isDark ? "text-cyan-400 hover:bg-white/[0.06] bg-white/[0.03] border-white/[0.08]" : "text-cyan-700 hover:bg-slate-100 bg-slate-50 border-slate-200"
                    )}
                  >
                    {isGeneratingKey ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Generate & Download .pem
                  </button>
                </div>
              </div>

              {/* Saved Keys vs Custom Switch (if user has saved keys) */}
              {userSavedKeys.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-1 rounded-xl border max-w-fit" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(226,232,240,0.9)", background: isDark ? "#0f0f12" : "#f8fafc" }}>
                    <button
                      type="button"
                      onClick={() => setSshKeyMode('saved')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                        sshKeyMode === 'saved'
                          ? (isDark ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-xs" : "bg-white text-cyan-700 border border-slate-200 shadow-xs")
                          : (isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-500 hover:text-slate-800")
                      )}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Select Saved Key ({userSavedKeys.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSshKeyMode('custom');
                        setSelectedSavedKeyId(null);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                        sshKeyMode === 'custom'
                          ? (isDark ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-xs" : "bg-white text-cyan-700 border border-slate-200 shadow-xs")
                          : (isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-500 hover:text-slate-800")
                      )}
                    >
                      Custom / Paste Key
                    </button>
                  </div>

                  {sshKeyMode === 'saved' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {userSavedKeys.map((key) => {
                          const isSelected = selectedSavedKeyId === key.id;
                          return (
                            <div
                              key={key.id}
                              onClick={() => handleSelectSavedKey(key)}
                              className={cn(
                                "group relative p-3 rounded-xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between gap-2",
                                isSelected
                                  ? (isDark
                                      ? "bg-cyan-500/10 border-cyan-500/60 shadow-sm shadow-cyan-500/10 ring-1 ring-cyan-500/50"
                                      : "bg-cyan-50/80 border-cyan-500 shadow-xs ring-1 ring-cyan-500/30")
                                  : (isDark
                                      ? "bg-[#111115] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.02]"
                                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60")
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                                    isSelected
                                      ? (isDark ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "bg-cyan-100 border-cyan-300 text-cyan-700")
                                      : (isDark ? "bg-white/[0.04] border-white/[0.08] text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-500")
                                  )}>
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className={cn("text-xs font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                                      {key.name}
                                    </div>
                                    <span className={cn(
                                      "inline-block text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase font-semibold mt-0.5",
                                      key.keyType === 'ssh-ed25519'
                                        ? (isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                                        : (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")
                                    )}>
                                      {key.keyType === 'ssh-ed25519' ? 'ED25519' : key.keyType ? key.keyType.replace('ssh-', '').toUpperCase() : 'SSH'}
                                    </span>
                                  </div>
                                </div>
                                <div className={cn(
                                  "w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 mt-0.5",
                                  isSelected
                                    ? "bg-cyan-500 border-cyan-500 text-slate-950 font-bold"
                                    : (isDark ? "border-white/[0.15] bg-white/[0.02]" : "border-slate-300 bg-white")
                                )}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                              {key.fingerprint && (
                                <div className={cn("text-[10px] font-mono truncate px-2 py-1 rounded border", isDark ? "bg-black/30 text-zinc-400 border-white/[0.04]" : "bg-slate-100 text-slate-500 border-slate-200")}>
                                  {key.fingerprint}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className={cn(selectedSavedKeyId ? (isDark ? "text-cyan-400 font-medium" : "text-cyan-700 font-medium") : "text-zinc-500")}>
                          {selectedSavedKeyId
                            ? "✓ Selected SSH key will be automatically injected into /root/.ssh/authorized_keys."
                            : "Click any key to select it for passwordless root login (optional)."}
                        </span>
                        {selectedSavedKeyId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSavedKeyId(null);
                              setSshKey("");
                            }}
                            className={cn("text-[11px] underline cursor-pointer", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-800")}
                          >
                            Deselect key
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <textarea
                        value={sshKey}
                        onChange={(e) => setSshKey(e.target.value)}
                        placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQ... user@hostname"
                        className={cn("w-full h-24 border rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none transition-colors font-mono resize-none leading-relaxed", isDark ? "bg-[#111115] border-white/[0.08] text-white focus:border-cyan-500/60 placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 focus:border-cyan-500 placeholder:text-slate-400")}
                      />
                      <p className="text-[11px] text-zinc-500 mt-1.5">Enter a custom SSH public key for this order.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <textarea
                    value={sshKey}
                    onChange={(e) => setSshKey(e.target.value)}
                    placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQ... user@hostname"
                    className={cn("w-full h-24 border rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none transition-colors font-mono resize-none leading-relaxed", isDark ? "bg-[#111115] border-white/[0.08] text-white focus:border-cyan-500/60 placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 focus:border-cyan-500 placeholder:text-slate-400")}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] mt-1.5">
                    <span className="text-zinc-500">Add your SSH public key for passwordless authentication.</span>
                    <Link
                      href="/dashboard/settings?tab=ssh-keys"
                      target="_blank"
                      className={cn("inline-flex items-center gap-1 font-medium transition-colors", isDark ? "text-cyan-400 hover:underline" : "text-cyan-700 hover:underline")}
                    >
                      Save keys to your profile for 1-click orders ↗
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Order Summary Sidebar */}
        <motion.div variants={itemVariants} className="xl:col-span-1 w-full max-w-full min-w-0">
          <div className={cn("rounded-2xl p-5 sm:p-6 border sticky top-6 relative overflow-hidden w-full max-w-full min-w-0", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
            <h2 className={cn("text-base sm:text-lg font-bold mb-5 pb-3.5 border-b flex items-center gap-2 relative z-10", isDark ? "text-white border-white/[0.07]" : "text-slate-900 border-slate-100")}>
              <ListChecks className="w-4 h-4 text-cyan-400" />
              {serviceType === "KUBERNETES" ? (isAddWorkerNode ? "Worker Summary" : "Cluster Summary") : "Instance Summary"}
            </h2>

            <div className={cn("rounded-xl border divide-y mb-5 relative z-10", isDark ? "bg-white/[0.015] border-white/[0.07] divide-white/[0.06]" : "bg-slate-50/60 border-slate-200/80 divide-slate-200/70")}>
              {serviceType === "KUBERNETES" && !isAddWorkerNode && (
                <div className="flex justify-between items-center text-xs px-3.5 py-2.5">
                  <span className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><Server className="w-3.5 h-3.5 text-cyan-400" /> K3s Engine</span>
                  <span className={cn("font-mono font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    {kubernetesVersion}
                  </span>
                </div>
              )}
              {selectedAppId ? (
                <div className="flex justify-between items-center text-xs px-3.5 py-2.5">
                  <span className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><Rocket className="w-3.5 h-3.5 text-cyan-400" /> 1-Click App</span>
                  <span className={cn("font-bold truncate max-w-[180px]", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    {getAppById(selectedAppId)?.name} ({getAppById(selectedAppId)?.osBase || "Ubuntu 26.04"})
                  </span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-xs px-3.5 py-2.5">
                  <span className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><Disc className="w-3.5 h-3.5 text-cyan-400" /> Image</span>
                  <span className={cn("font-semibold truncate max-w-[160px]", isDark ? "text-zinc-200" : "text-slate-900")}>
                    {templates.find(t => t.id === selectedTemplate)?.name || (serviceType === "KUBERNETES" ? "Debian-13" : "-")}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs px-3.5 py-2.5">
                <span className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><Cpu className="w-3.5 h-3.5 text-cyan-400" /> Processor</span>
                <span className={cn("font-semibold flex items-center gap-1.5", isDark ? "text-zinc-200" : "text-slate-900")}>
                  <IntelLogo className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> {cpuCores} vCPU
                </span>
              </div>
              <div className="flex justify-between items-center text-xs px-3.5 py-2.5">
                <span className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><MemoryStick className="w-3.5 h-3.5 text-cyan-400" /> Memory</span>
                <span className={cn("font-mono font-semibold", isDark ? "text-zinc-200" : "text-slate-900")}>{ramGb} GB RAM</span>
              </div>
              <div className="flex justify-between items-center text-xs px-3.5 py-2.5">
                <span className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Storage</span>
                <span className={cn("font-mono font-semibold", isDark ? "text-zinc-200" : "text-slate-900")}>{diskGb} GB {diskType}</span>
              </div>
              <div className="flex justify-between items-center text-xs px-3.5 py-2.5">
                <span className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><Network className="w-3.5 h-3.5 text-cyan-400" /> Public IP</span>
                <span className={cn("font-mono font-semibold", isDark ? "text-zinc-200" : "text-slate-900")}>
                  {ipv4Count > 0 && ipv6Count > 0 ? `${ipv4Count} IPv4 + ${ipv6Count} IPv6` : ipv4Count > 0 ? `${ipv4Count} IPv4` : ipv6Count > 0 ? `${ipv6Count} IPv6` : "VPC Only"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs px-3.5 py-2.5">
                <span className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><Activity className="w-3.5 h-3.5 text-cyan-400" /> Port Speed</span>
                <span className={cn("font-mono font-semibold", isDark ? "text-zinc-200" : "text-slate-900")}>
                  {bandwidthMbps} Mbps
                </span>
              </div>
              {backupGb > 0 && (
                <div className="flex justify-between items-center text-xs px-3.5 py-2.5">
                  <span className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><DatabaseBackup className="w-3.5 h-3.5 text-cyan-400" /> Backups</span>
                  <span className={cn("font-mono font-semibold", isDark ? "text-zinc-200" : "text-slate-900")}>{backupGb} GB</span>
                </div>
              )}
            </div>

            <div className={cn("rounded-xl p-4 mb-5 border flex items-center justify-between", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50 border-slate-200/80")}>
              <div>
                <div className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-600")}>Estimated Rate</div>
                <div className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-500" : "text-slate-400")}>Billed hourly (PAYG)</div>
              </div>
              <div className="text-right">
                <div className="text-cyan-400 font-bold font-mono text-lg sm:text-xl leading-tight">
                  Rp {calculateHourlyPrice().toLocaleString('id-ID')}<span className="text-xs font-normal opacity-80">/hr</span>
                </div>
                <div className={cn("text-[11px] font-mono mt-0.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                  ≈ Rp {calculateMonthlyPrice().toLocaleString('id-ID')}/mo
                </div>
              </div>
            </div>

            <div className="mb-5">
              <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className={cn("w-4 h-4 rounded border cursor-pointer appearance-none transition-all", isDark ? "border-white/[0.2] bg-white/[0.02] checked:bg-cyan-400 checked:border-cyan-400" : "border-slate-300 bg-white checked:bg-cyan-600 checked:border-cyan-600")} />
                  <ShieldCheck className={cn("absolute w-3 h-3 text-slate-950 pointer-events-none transition-opacity", termsAccepted ? "opacity-100" : "opacity-0")} />
                </div>
                <span className={cn("text-xs leading-relaxed transition-colors", isDark ? "text-zinc-400 group-hover:text-zinc-300" : "text-slate-500 group-hover:text-slate-700")}>
                  I agree to the <a href="/terms" target="_blank" className={cn("hover:underline font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Terms of Service</a> and <a href="/privacy" target="_blank" className={cn("hover:underline font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Privacy Policy</a>.
                </span>
              </label>
            </div>

            {balance < 50000 && (
              <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  A minimum balance of <strong>Rp 50.000</strong> is required to deploy Pay-As-You-Go instances. Please <Link href="/dashboard/billing" className="underline font-bold hover:text-red-300 transition-colors">Top Up</Link> first.
                </span>
              </div>
            )}

            {/* Warning Notes for missing fields */}
            {(() => {
              const missingFields = [];
              if (!hostname) missingFields.push("Hostname");
              if (!username) missingFields.push("Username");
              if (!password) missingFields.push("Password");
              if (password !== passwordConfirm) missingFields.push("Password Confirmation");
              if (imageMode !== "apps" && selectedTemplate === null) missingFields.push("OS Template");
              
              if (useVpc && (!selectedVpcId || !privateIpAddress.trim() || (() => {
                const currentVpc = vpcs.find(v => v.id === selectedVpcId);
                if (!currentVpc) return true;
                const ipRange = getUsableIpRange(currentVpc.cidr, currentVpc.gateway || '');
                if (!ipRange) return true;
                const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                if (!ipRegex.test(privateIpAddress.trim())) return true;
                if (currentVpc.gateway && privateIpAddress.trim() === currentVpc.gateway) return true;
                if (currentVpc.vpsServices?.some((v: any) => v.vpcIp === privateIpAddress.trim())) return true;
                const ipNum = ipToNum(privateIpAddress.trim());
                return ipNum < ipToNum(ipRange.first) || ipNum > ipToNum(ipRange.last);
              })())) {
                missingFields.push("Valid VPC Configuration");
              }

              const isK3sMissingIp = serviceType === "KUBERNETES" && !useReservedIp && ipv4Count === 0;
              const isAppMissingIp = Boolean(selectedAppId && !useReservedIp && ipv4Count === 0);

              if (missingFields.length > 0 || isK3sMissingIp || isAppMissingIp) {
                return (
                  <div className={cn("mb-4 rounded-xl p-3.5 flex items-start gap-2.5 text-xs border", isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                    <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    <div className="flex flex-col gap-1">
                      <p className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>Required before deployment:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                        {missingFields.length > 0 && (
                          <li>Complete: {missingFields.join(", ")}.</li>
                        )}
                        {isK3sMissingIp && (
                          <li>K3s requires at least 1 Public IPv4 or Reserved IP.</li>
                        )}
                        {isAppMissingIp && (
                          <li>1-Click Applications strictly require at least 1 Public IPv4 address.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <button
              onClick={handleOrder}
              disabled={
                isDisabled || !termsAccepted || isSubmitting || !hostname || !username || (imageMode !== "apps" && selectedTemplate === null) ||
                (!selectedPaymentMethod || balance < 50000) ||
                (!password || password !== passwordConfirm || !!passwordError) ||
                (useVpc && (!selectedVpcId || !privateIpAddress.trim() || (() => {
                  const currentVpc = vpcs.find(v => v.id === selectedVpcId);
                  if (!currentVpc) return true;
                  const ipRange = getUsableIpRange(currentVpc.cidr, currentVpc.gateway || '');
                  if (!ipRange) return true;
                  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                  if (!ipRegex.test(privateIpAddress.trim())) return true;
                  if (currentVpc.gateway && privateIpAddress.trim() === currentVpc.gateway) return true;
                  if (currentVpc.vpsServices?.some((v: any) => v.vpcIp === privateIpAddress.trim())) return true;
                  const ipNum = ipToNum(privateIpAddress.trim());
                  return ipNum < ipToNum(ipRange.first) || ipNum > ipToNum(ipRange.last);
                })())) ||
                (serviceType === "KUBERNETES" && !useReservedIp && ipv4Count === 0) ||
                (Boolean(selectedAppId && !useReservedIp && ipv4Count === 0))
              }
              className={cn("w-full bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-bold text-sm py-3 px-5 rounded-xl flex items-center justify-center gap-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed relative z-10 shadow-xs cursor-pointer")}
            >
              {isDisabled ? "Coming Soon" : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Provisioning...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 shrink-0" />
                  {isAddWorkerNode ? "Deploy Worker Node" : "Deploy Instance"}
                </>
              )}
            </button>

            <div className="mt-4 relative z-10">
              <EnterpriseInfraSidebarCard />
            </div>

            <div className="mt-3.5 flex flex-col items-center justify-center gap-1 relative z-10">
              <div className={cn("flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                256-bit Encrypted Provisioning
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {showAppInstallationModal && installedVpsId && (
        <VpsAppInstallationMonitor
          vpsId={installedVpsId}
          appId={selectedAppId}
          fallbackPassword={password}
          isDark={isDark}
          mode="modal"
          onComplete={() => {
            setShowAppInstallationModal(false);
            router.push(`/dashboard/vps/${installedVpsId}`);
          }}
        />
      )}
    </>
  );
}
