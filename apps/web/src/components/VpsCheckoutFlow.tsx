"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Server, HardDrive, Cpu, MemoryStick, Network, ShieldCheck, ArrowRight, Shield, XCircle, CheckCircle, Clock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { formatRupiah } from "@/lib/billing";
import { motion } from "framer-motion";
import { RefreshCw, Plus, Settings2, Receipt, Disc, DatabaseBackup, DollarSign, ListChecks, ChevronLeft, ChevronRight, CreditCard, Building2, Wallet, Store, QrCode, Sliders, Rocket, Loader2, Plug, MapPin, AlertTriangle, Info } from "lucide-react";
import { Select } from "@/components/ui/Select";
import Link from "next/link";
import { SiUbuntu, SiDebian, SiRockylinux, SiCentos, SiAlpinelinux, SiFedora, SiKubernetes } from "react-icons/si";
import { FaWindows } from "react-icons/fa";

const getOsIcon = (name: string, isDark: boolean = false) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('ubuntu')) return <SiUbuntu className="w-5 h-5 text-[#E95420]" />;
  if (lowerName.includes('debian')) return <SiDebian className="w-5 h-5 text-[#A81D33]" />;
  if (lowerName.includes('windows')) return <FaWindows className="w-5 h-5 text-[#0078D6]" />;
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

export default function VpsCheckoutFlow({ serviceType = "VPS" }: VpsCheckoutFlowProps) {
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
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [sshKey, setSshKey] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

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

  // Resource Sliders
  const [cpuCores, setCpuCores] = useState(parseInt(searchParams.get("cpu") || "1"));
  const [ramGb, setRamGb] = useState(parseInt(searchParams.get("ram") || "1"));
  const [diskGb, setDiskGb] = useState(parseInt(searchParams.get("disk") || "20"));
  const [diskType, setDiskType] = useState<"HDD" | "SSD">((searchParams.get("diskType") as "HDD" | "SSD") || "HDD");
  const [backupGb, setBackupGb] = useState(0);

  const [maxSpecs, setMaxSpecs] = useState({ cpu: 16, ram: 64, diskHdd: 1000, diskSsd: 500, backup: 500 });

  useEffect(() => {
    const maxDisk = diskType === "SSD" ? maxSpecs.diskSsd : maxSpecs.diskHdd;
    if (diskGb > maxDisk) {
      setDiskGb(maxDisk);
    }
  }, [diskType, maxSpecs, diskGb]);

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
        if (data.templates.length > 0) {
          const firstTpl = data.templates[0];
          const firstFamily = firstTpl.name.split('-')[0];
          setSelectedOsFamily(firstFamily);
          setSelectedTemplate(firstTpl.id);
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
    if (!hostname || !username || selectedTemplate === null || !password) {
      toast.error("Please fill all required fields");
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
      const res = await fetch("/api/user/vps/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostname,
          username,
          rootPassword: password,
          sshKey: sshKey,
          templateId: selectedTemplate,
          billingMode: "PAYG",
          planId: selectedPlanId,
          cpuCores,
          ramGb,
          diskGb,
          diskType,
          backupGb,
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
          paymentMethodCode: "BALANCE"
        })
      });

      const data = await res.json();
      if (res.ok && data.paymentUrl) {
        toast.success("Order created! Redirecting to payment...");
        window.location.href = data.paymentUrl;
      } else if (res.ok && data.success) {
        toast.success("Server deployment started!");
        if (data.k3sClusterId) {
          window.location.href = `/dashboard/k3s/${data.k3sClusterId}`;
        } else {
          window.location.href = `/dashboard/vps/${data.vpsId}`;
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 w-full max-w-full min-w-0">
        {/* Configuration Pane */}
        <div className="xl:col-span-2 space-y-6 md:space-y-8 w-full max-w-full min-w-0">

          {/* OS Templates */}
          <motion.section variants={itemVariants} className={cn("rounded-3xl p-4 sm:p-6 md:p-8 shadow-md relative z-[60] w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                        <h2 className={cn("text-xl font-bold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <HardDrive className="w-5 h-5 text-cyan-400" />
              1. Choose Operating System
            </h2>
            {templates.length === 0 ? (
              <div className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>No templates available. Please contact support.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Image / App</label>
                  <Select
                    value={selectedOsFamily || ""}
                    onChange={(val) => {
                      setSelectedOsFamily(val.toString());
                      const firstVersion = templates.find(t => t.name.startsWith(val.toString() + "-")) || templates.find(t => t.name.startsWith(val.toString()));
                      if (firstVersion) setSelectedTemplate(firstVersion.id);
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
                    placeholder="Select Image / App..."
                    className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm font-bold", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Image / App Version</label>
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
                    className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm font-bold", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm")}
                  />
                </div>
              </div>
            )}
          </motion.section>

          {serviceType === "KUBERNETES" && !isAddWorkerNode && (
            <motion.section variants={itemVariants} className={cn("rounded-3xl p-4 sm:p-6 md:p-8 shadow-md relative z-[50] w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                            <h2 className={cn("text-xl font-bold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Server className="w-5 h-5 text-cyan-400" />
                Choose Kubernetes Version
              </h2>
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
                className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm font-bold", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm")}
              />
            </motion.section>
          )}

          {nodes.length > 0 && (
            <motion.section variants={itemVariants} className={cn("rounded-3xl p-4 sm:p-6 md:p-8 shadow-md relative mb-6 md:mb-8 z-[40] w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                            <h2 className={cn("text-xl font-bold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <MapPin className="w-5 h-5 text-cyan-400" />
                2. Region
              </h2>
              <div>
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
                  className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm font-bold transition-colors", isDark ? "bg-[#060b14] border-slate-800 hover:border-slate-700 text-white" : "bg-white border-slate-200 hover:border-cyan-400 text-slate-900 shadow-sm")}
                />
              </div>
            </motion.section>
          )}

          {/* Compute Resources & Billing Mode */}
          <motion.section variants={itemVariants} className={cn("rounded-3xl p-4 sm:p-6 md:p-8 shadow-md relative mb-6 md:mb-8 z-[30] w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 relative z-10">
              <h2 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Sliders className="w-5 h-5 text-cyan-400" />
                3. Compute Resources
              </h2>

            </div>
            
            <div className="flex justify-start sm:justify-end mb-6">
              <div className={cn("flex rounded-lg p-1 border w-full sm:w-max", isDark ? "bg-black/50 border-white/10" : "bg-slate-200 border-slate-300")}>
                <button
                  onClick={() => setDiskType("HDD")}
                  className={cn("flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2", diskType === "HDD" ? "bg-cyan-600 text-white shadow-sm" : (isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900"))}
                >
                  <HardDrive className="w-4 h-4" /> HDD
                </button>
                <button
                  onClick={() => setDiskType("SSD")}
                  className={cn("flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2", diskType === "SSD" ? "bg-cyan-600 text-white shadow-sm" : (isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900"))}
                >
                  <Disc className="w-4 h-4" /> SSD
                </button>
              </div>
            </div>

              <div className="space-y-8 relative z-10">
                {/* vCPU Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={cn("text-sm font-medium flex items-center gap-2", isDark ? "text-zinc-300" : "text-slate-700")}>
                      <Cpu className="w-4 h-4" /> vCPU Cores
                    </label>
                    <span className="text-cyan-400 font-bold">{cpuCores} Core{cpuCores > 1 ? 's' : ''}</span>
                  </div>
                  <input
                    type="range" min="1" max={maxSpecs.cpu} step="1"
                    value={cpuCores} onChange={e => setCpuCores(Number(e.target.value))}
                    className={cn("w-full h-2 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-none", isDark ? "bg-white/10" : "bg-slate-200")}
                    style={{ background: `linear-gradient(to right, #22d3ee ${((cpuCores - 1) / Math.max(1, maxSpecs.cpu - 1)) * 100}%, ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} ${((cpuCores - 1) / Math.max(1, maxSpecs.cpu - 1)) * 100}%)` }}
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>1 Core</span><span>{maxSpecs.cpu} Cores</span>
                  </div>
                </div>

                {/* RAM Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={cn("text-sm font-medium flex items-center gap-2", isDark ? "text-zinc-300" : "text-slate-700")}>
                      <MemoryStick className="w-4 h-4" /> Memory (RAM)
                    </label>
                    <span className="text-cyan-400 font-bold">{ramGb} GB</span>
                  </div>
                  <input
                    type="range" min="1" max={maxSpecs.ram} step="1"
                    value={ramGb} onChange={e => setRamGb(Number(e.target.value))}
                    className={cn("w-full h-2 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-none", isDark ? "bg-white/10" : "bg-slate-200")}
                    style={{ background: `linear-gradient(to right, #22d3ee ${((ramGb - 1) / Math.max(1, maxSpecs.ram - 1)) * 100}%, ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} ${((ramGb - 1) / Math.max(1, maxSpecs.ram - 1)) * 100}%)` }}
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>1 GB</span><span>{maxSpecs.ram} GB</span>
                  </div>
                </div>

                {/* Disk Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={cn("text-sm font-medium flex items-center gap-2", isDark ? "text-zinc-300" : "text-slate-700")}>
                      <HardDrive className="w-4 h-4" /> Disk Storage ({diskType})
                    </label>
                    <span className="text-cyan-400 font-bold">{diskGb} GB</span>
                  </div>
                  <input
                    type="range" min="20" max={diskType === "SSD" ? maxSpecs.diskSsd : maxSpecs.diskHdd} step="10"
                    value={diskGb} onChange={e => setDiskGb(Number(e.target.value))}
                    className={cn("w-full h-2 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-none", isDark ? "bg-white/10" : "bg-slate-200")}
                    style={{ background: `linear-gradient(to right, #22d3ee ${((diskGb - 20) / Math.max(1, (diskType === "SSD" ? maxSpecs.diskSsd : maxSpecs.diskHdd) - 20)) * 100}%, ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} ${((diskGb - 20) / Math.max(1, (diskType === "SSD" ? maxSpecs.diskSsd : maxSpecs.diskHdd) - 20)) * 100}%)` }}
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>20 GB</span><span>{diskType === "SSD" ? maxSpecs.diskSsd : maxSpecs.diskHdd} GB</span>
                  </div>
                </div>
              </div>

          </motion.section>
          {/* Network & Extra (Only for PAYG) */}

            <motion.section variants={itemVariants} className={cn("rounded-3xl p-4 sm:p-6 md:p-8 shadow-md relative z-[20] grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
              <div className="flex flex-col h-full w-full max-w-full min-w-0">
                <h2 className={cn("text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2 shrink-0", isDark ? "text-white" : "text-slate-900")}>
                  <Network className="w-5 h-5 text-cyan-400 shrink-0" />
                  4. Networking
                </h2>
                <div className="flex-1 flex flex-col gap-3 w-full max-w-full min-w-0">

                  {reservedIps.length > 0 && (
                    <div className={cn(
                      "p-3.5 sm:p-4 w-full max-w-full min-w-0 rounded-2xl border transition-all space-y-3",
                      useReservedIp ? (isDark ? "bg-[#0b162c] border-cyan-500 shadow-md ring-1 ring-cyan-500/30" : "bg-white border-cyan-600 shadow-md ring-2 ring-cyan-600/20") : (isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200/90 shadow-sm")
                    )}>
                      <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full">
                        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                          <div className={cn(
                            "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold border transition-colors shrink-0",
                            useReservedIp ? (isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-cyan-500/10 text-cyan-700 border border-cyan-500/20") : (isDark ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-slate-100 border border-slate-200 text-slate-600")
                          )}>
                            <Network className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={cn("font-bold text-xs sm:text-sm leading-tight", useReservedIp ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>Use Reserved IP</div>
                            <div className={cn("text-[11px] sm:text-xs font-medium truncate sm:whitespace-normal", isDark ? "text-zinc-500" : "text-slate-500")}>Attach an IP you already own</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUseReservedIp(!useReservedIp)}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0f172a] transition-colors",
                            useReservedIp ? "bg-cyan-500" : (isDark ? "bg-white/10" : "bg-slate-300")
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
                        <div className={cn("pt-2 border-t", isDark ? "border-white/5" : "border-slate-100")}>
                          <Select
                            value={selectedReservedIpId || ""}
                            onChange={(val) => setSelectedReservedIpId(parseInt(val))}
                            options={reservedIps.map(ip => ({ 
                              value: ip.id, 
                              label: ip.publicIp ? `${ip.ipAddress} (Public: ${ip.publicIp})` : ip.ipAddress 
                            }))}
                            placeholder="Select Reserved IP"
                            className={cn("w-full rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-black/40 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
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
                      "flex flex-col p-3.5 sm:p-4 w-full max-w-full min-w-0 rounded-2xl border transition-all gap-3 flex-1 justify-center",
                      ipv4Count > 0 ? (isDark ? "bg-[#0b162c] border-cyan-500 shadow-md ring-1 ring-cyan-500/30" : "bg-white border-cyan-600 shadow-md ring-2 ring-cyan-600/20") : (isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200/90 shadow-sm")
                    )}>
                      <div className="flex items-center justify-between w-full gap-2 min-w-0">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div className={cn(
                            "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold border text-[10px] sm:text-xs transition-colors shrink-0",
                            ipv4Count > 0 ? (isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-cyan-500/10 text-cyan-700 border border-cyan-500/20") : (isDark ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-slate-100 border border-slate-200 text-slate-600")
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
                          "flex items-center gap-1.5 sm:gap-2 rounded-lg p-1 border shrink-0",
                          isDark ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-200"
                        )}>
                          <button
                            type="button"
                            onClick={() => setIpv4Count(Math.max(0, ipv4Count - 1))}
                            disabled={ipv4Count <= 0}
                            className={cn(
                              "w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded text-xs sm:text-sm font-bold transition-all disabled:opacity-30",
                              isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs"
                            )}
                          >
                            -
                          </button>
                          <span className={cn("w-5 sm:w-6 text-center font-bold text-xs sm:text-sm", ipv4Count > 0 ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>{ipv4Count}</span>
                          <button
                            type="button"
                            onClick={() => setIpv4Count(Math.min(10, ipv4Count + 1))}
                            className={cn(
                              "w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded text-xs sm:text-sm font-bold transition-all",
                              isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs"
                            )}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className={cn(
                        "pt-2 border-t flex flex-wrap items-center justify-between text-[11px] sm:text-xs font-mono gap-1.5 sm:gap-2",
                        isDark ? "border-cyan-500/20" : "border-slate-200"
                      )}>
                        <span className={cn("font-sans", isDark ? "text-zinc-400" : "text-slate-500")}>Est. Cost ({ipv4Count} IP):</span>
                        <div className={cn("font-bold text-right", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          +{formatRupiah(ipv4Count * (pricing.ipv4 || 0))}/hr <span className={cn("font-normal font-sans block sm:inline", isDark ? "text-zinc-400" : "text-slate-500")}>(~{formatRupiah(ipv4Count * (pricing.ipv4 || 0) * 720)}/mo)</span>
                        </div>
                      </div>
                      <p className={cn("text-[10px] italic leading-tight break-words", isDark ? "text-zinc-500" : "text-slate-500")}>
                        *Public IP is an addon. If you add this option, please open a support ticket after checkout to claim your IP.
                      </p>
                    </div>
                  )}

                  {hasIpv6Pool && (
                    <div className={cn(
                      "flex flex-col p-3.5 sm:p-4 w-full max-w-full min-w-0 rounded-2xl border transition-all gap-3",
                      ipv6Count > 0 ? (isDark ? "bg-[#0b162c] border-cyan-500 shadow-md ring-1 ring-cyan-500/30" : "bg-white border-cyan-600 shadow-md ring-2 ring-cyan-600/20") : (isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200/90 shadow-sm")
                    )}>
                      <div className="flex items-center justify-between w-full gap-2 min-w-0">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div className={cn(
                            "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold border text-xs transition-colors shrink-0",
                            ipv6Count > 0 ? (isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-cyan-500/10 text-cyan-700 border border-cyan-500/20") : (isDark ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-slate-100 border border-slate-200 text-slate-600")
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
                          "flex items-center gap-1.5 sm:gap-2 rounded-lg p-1 border shrink-0",
                          isDark ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-200"
                        )}>
                          <button
                            type="button"
                            onClick={() => setIpv6Count(Math.max(0, ipv6Count - 1))}
                            disabled={ipv6Count <= 0}
                            className={cn(
                              "w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded text-xs sm:text-sm font-bold transition-all disabled:opacity-30",
                              isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs"
                            )}
                          >
                            -
                          </button>
                          <span className={cn("w-5 sm:w-6 text-center font-bold text-xs sm:text-sm", ipv6Count > 0 ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>{ipv6Count}</span>
                          <button
                            type="button"
                            onClick={() => setIpv6Count(Math.min(10, ipv6Count + 1))}
                            className={cn(
                              "w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded text-xs sm:text-sm font-bold transition-all",
                              isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs"
                            )}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className={cn(
                        "pt-2 border-t flex flex-wrap items-center justify-between text-[11px] sm:text-xs font-mono gap-1.5 sm:gap-2",
                        isDark ? "border-cyan-500/20" : "border-slate-200"
                      )}>
                        <span className={cn("font-sans", isDark ? "text-zinc-400" : "text-slate-500")}>Est. Cost ({ipv6Count} IP):</span>
                        <div className={cn("font-bold text-right", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          +{formatRupiah(ipv6Count * (pricing.ipv6 || 0))}/hr <span className={cn("font-normal font-sans block sm:inline", isDark ? "text-zinc-400" : "text-slate-500")}>(~{formatRupiah(ipv6Count * (pricing.ipv6 || 0) * 720)}/mo)</span>
                        </div>
                      </div>
                      <p className={cn("text-[10px] italic leading-tight break-words", isDark ? "text-zinc-500" : "text-slate-500")}>
                        *Public IP is an addon. If you add this option, please open a support ticket after checkout to claim your IP.
                      </p>
                    </div>
                  )}
                  {!useReservedIp && !hasIpv4Pool && !hasIpv6Pool && (
                    <div className="p-3 rounded-lg border border-white/10 bg-white/5 text-sm text-zinc-400 text-center">
                      No Public IP addresses available at the moment.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col h-full w-full max-w-full min-w-0">
                <h2 className={cn("text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2 shrink-0", isDark ? "text-white" : "text-slate-900")}>
                  <DatabaseBackup className="w-5 h-5 text-cyan-400 shrink-0" />
                  5. Backup Addon
                </h2>
                <div className={cn(
                  "flex flex-col p-3.5 sm:p-4 w-full max-w-full min-w-0 rounded-2xl border transition-all gap-3 flex-1 justify-center",
                  backupGb > 0
                    ? (isDark ? "bg-[#0b162c] border-cyan-500 shadow-md ring-1 ring-cyan-500/30" : "bg-white border-cyan-600 shadow-md ring-2 ring-cyan-600/20")
                    : (isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200/90 shadow-sm")
                )}>
                  <div className="flex items-center justify-between w-full gap-2 min-w-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold border text-xs transition-colors shrink-0",
                        backupGb > 0 ? (isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-cyan-500/10 text-cyan-700 border border-cyan-500/20") : (isDark ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-slate-100 border border-slate-200 text-slate-600")
                      )}>
                        <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={cn("font-bold text-xs sm:text-sm leading-tight mb-0.5", backupGb > 0 ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>Offsite Backup</div>
                        <div className={cn("text-[10px] sm:text-xs font-medium truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
                          +{formatRupiah(pricing.backup || 0)}/hr <span className="hidden sm:inline">per GB</span>
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 border shrink-0",
                      isDark ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-200"
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
                    className={cn("w-full max-w-full h-2 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-none my-1", isDark ? "bg-white/10" : "bg-slate-200")}
                    style={{ background: `linear-gradient(to right, #22d3ee ${((backupGb - 0) / Math.max(1, maxBackupAllowed - 0)) * 100}%, ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} ${((backupGb - 0) / Math.max(1, maxBackupAllowed - 0)) * 100}%)` }}
                  />

                  {backupGb > 0 ? (
                    <div className={cn(
                      "pt-2 border-t flex flex-wrap items-center justify-between text-[11px] sm:text-xs font-mono gap-1.5 sm:gap-2",
                      isDark ? "border-cyan-500/20" : "border-slate-200"
                    )}>
                      <span className={cn("font-sans", isDark ? "text-zinc-400" : "text-slate-500")}>Est. Cost ({backupGb} GB):</span>
                      <div className={cn("font-bold text-right", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        +{formatRupiah(backupGb * (pricing.backup || 0))}/hr <span className={cn("font-normal font-sans block sm:inline", isDark ? "text-zinc-400" : "text-slate-500")}>(~{formatRupiah(backupGb * (pricing.backup || 0) * 720)}/mo)</span>
                      </div>
                    </div>
                  ) : (
                    <div className={cn("pt-2 border-t flex flex-col sm:flex-row sm:items-start justify-between text-[11px] sm:text-xs gap-1 sm:gap-2", isDark ? "border-slate-800" : "border-slate-200")}>
                      <span className={cn("font-sans leading-snug", isDark ? "text-zinc-500" : "text-slate-500")}>Enable automatic backups by allocating storage.</span>
                      <div className={cn("font-mono italic text-left sm:text-right shrink-0", isDark ? "text-zinc-500" : "text-slate-400")}>0 GB (No extra cost)</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col h-full w-full max-w-full min-w-0 md:col-span-2">
                <h2 className={cn("text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2 shrink-0", isDark ? "text-white" : "text-slate-900")}>
                  <VpcIcon className="w-5 h-5 text-cyan-400 shrink-0" />
                  6. Virtual Private Cloud
                </h2>
                <div className={cn(
                  "flex flex-col p-3.5 sm:p-4 w-full max-w-full min-w-0 rounded-2xl border transition-all gap-3 flex-1",
                  useVpc ? (isDark ? "bg-[#0b162c] border-cyan-500 shadow-md ring-1 ring-cyan-500/30" : "bg-white border-cyan-600 shadow-md ring-2 ring-cyan-600/20") : (isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200/90 shadow-sm")
                )}>
                  <div className="flex items-center justify-between w-full gap-2 sm:gap-3 min-w-0">
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                      <div className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold border transition-colors shrink-0",
                        useVpc ? (isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-cyan-500/10 text-cyan-700 border border-cyan-500/20") : (isDark ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-slate-100 border border-slate-200 text-slate-600")
                      )}>
                        <Plug className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={cn("font-bold text-xs sm:text-sm leading-tight", useVpc ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>Attach to VPC</div>
                        <div className={cn("text-[11px] sm:text-xs font-medium truncate sm:whitespace-normal", isDark ? "text-zinc-500" : "text-slate-500")}>Isolate your instance securely</div>
                      </div>
                    </div>

                    <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full shrink-0">
                      Required
                    </div>
                  </div>

                  {useVpc && (
                    <div className="pt-3 border-t border-cyan-500/20 space-y-4">
                      {isCreatingVpc ? (
                        <div className={cn("p-4 rounded-xl border space-y-3", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                          <h4 className={cn("text-sm font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Create New VPC</h4>
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>VPC Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              placeholder="e.g. Production Network"
                              value={newVpcName}
                              onChange={(e) => setNewVpcName(e.target.value)}
                              className={cn("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900")}
                            />
                          </div>
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>Description (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. For web servers and databases"
                              value={newVpcDescription}
                              onChange={(e) => setNewVpcDescription(e.target.value)}
                              className={cn("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900")}
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
                                "w-full bg-black/60 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 font-mono",
                                (newVpcCidr && validateCidr(newVpcCidr).error) ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500"
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
                          <div className="flex items-center justify-between mt-2">
                            <div>
                              <div className={cn("text-sm font-medium flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                                Enable NAT Gateway
                                <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border", isDark ? "bg-white/10 text-zinc-400 border-white/5" : "bg-slate-100 text-slate-500 border-slate-200")}>VPC Level</span>
                              </div>
                              <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>Allow instances to access the internet</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewVpcNatEnabled(!newVpcNatEnabled)}
                              className={cn(
                                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                newVpcNatEnabled ? "bg-cyan-500" : "bg-white/10"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                  newVpcNatEnabled ? "translate-x-5" : "translate-x-0"
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
                              className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                            >
                              {isSubmittingVpc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                              Create VPC
                            </button>
                          </div>
                        </div>
                      ) : vpcs.length === 0 ? (
                        <div className="text-sm text-zinc-400 bg-[#060b14] p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center gap-3">
                          <p>You don't have any Virtual Private Cloud networks.</p>
                          <button 
                            type="button"
                            onClick={() => setIsCreatingVpc(true)} 
                            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            Create VPC Network
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
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
                                      className="py-2 px-3 min-h-[38px] rounded-lg w-full"
                                    />
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => setIsCreatingVpc(true)} 
                                    className={cn("w-full sm:w-auto shrink-0 border px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 min-h-[38px]", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-cyan-400" : "bg-white hover:bg-slate-50 border-slate-200 text-cyan-600")}
                                  >
                                    <Plus className="w-4 h-4" /> New VPC
                                  </button>
                                </div>
                                {selectedVpcId && (() => {
                                  const selectedVpcObj = vpcs.find(v => v.id === selectedVpcId);
                                  if (!selectedVpcObj) return null;
                                  return (
                                    <div className="flex items-center justify-between mt-3 gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className={cn("text-xs sm:text-sm font-medium flex items-center gap-2 flex-wrap", isDark ? "text-white" : "text-slate-900")}>
                                          NAT Gateway
                                          <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border", isDark ? "bg-white/10 text-zinc-400 border-white/5" : "bg-slate-100 text-slate-500 border-slate-200")}>VPC Level</span>
                                        </div>
                                        <div className={cn("text-[11px] sm:text-xs truncate sm:whitespace-normal", isDark ? "text-zinc-500" : "text-slate-500")}>Enable internet access for all VMs in this VPC</div>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={loading}
                                        onClick={async () => {
                                          const newState = !selectedVpcObj.isNatEnabled;
                                          // Optimistically update the UI by mapping over vpcs state
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
                                            // Revert optimistic update on failure
                                            setVpcs(vpcs.map(v => v.id === selectedVpcId ? { ...v, isNatEnabled: !newState } : v));
                                          }
                                        }}
                                        className={cn(
                                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0f172a] transition-colors disabled:opacity-50",
                                          selectedVpcObj.isNatEnabled ? "bg-cyan-500" : "bg-white/10"
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
                                    className={cn("w-full bg-black/40 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 font-mono transition-colors", 
                                      hasError ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500")}
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
                                    <div className={cn("text-[11px] mt-1.5 font-mono flex flex-wrap items-center gap-x-1.5 gap-y-0.5", isDark ? "text-cyan-400/70" : "text-cyan-700")}>
                                      <span>Valid range:</span>
                                      <span className={cn("font-bold", isDark ? "text-cyan-300" : "text-cyan-600")}>{ipRange.first} - {ipRange.last}</span>
                                      <span className={isDark ? "text-cyan-400/50" : "text-cyan-600/70"}>({ipRange.count} usable IPs)</span>
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
            </motion.section>
          {/* Firewall Settings */}
          <motion.section variants={itemVariants} className={cn("rounded-3xl p-4 sm:p-6 md:p-8 shadow-md relative z-[10] w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            <h2 className={cn("text-xl font-bold mb-2 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              7. Firewall
            </h2>
            <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>A security group is a set of firewall rules that control the traffic for your instance. Add rules to allow specific traffic to reach your instance.</p>

            <div className="space-y-4">
              {/* SSH Rule */}
              <div className={cn("border p-4 rounded-xl flex flex-col md:flex-row md:items-start justify-between gap-4", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setFirewallRules(r => ({ ...r, ssh: { ...r.ssh, enabled: !r.ssh.enabled } }))}
                    className={cn(
                      "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200",
                      firewallRules.ssh.enabled
                        ? "bg-cyan-400"
                        : isDark ? "bg-[#060b14] border-slate-800 hover:border-cyan-400/50" : "bg-white border-slate-200 hover:border-cyan-400"
                    )}
                  >
                    <CheckCircle className={cn("w-3.5 h-3.5", firewallRules.ssh.enabled ? "text-[#0f172a]" : "text-transparent")} />
                  </button>
                  <div>
                    <div className={cn("text-sm font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Allow SSH traffic from</div>
                    <div className={cn("text-xs mt-0.5 leading-snug", isDark ? "text-zinc-400" : "text-slate-500")}>Helps you connect to your instance</div>
                  </div>
                </div>
                {firewallRules.ssh.enabled && (
                  <div className="flex flex-col gap-2 w-full md:w-64 shrink-0">
                    <Select
                      className={cn("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
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
                        className={cn("border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 w-full", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
                        value={firewallRules.ssh.customIp}
                        onChange={(e) => setFirewallRules(r => ({ ...r, ssh: { ...r.ssh, customIp: e.target.value } }))}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* HTTPS Rule */}
              <div className={cn("border p-4 rounded-xl flex flex-col md:flex-row md:items-start justify-between gap-4", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setFirewallRules(r => ({ ...r, https: { ...r.https, enabled: !r.https.enabled } }))}
                    className={cn(
                      "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200",
                      firewallRules.https.enabled
                        ? "bg-cyan-400"
                        : isDark ? "bg-[#060b14] border-slate-800 hover:border-cyan-400/50" : "bg-white border-slate-200 hover:border-cyan-400"
                    )}
                  >
                    <CheckCircle className={cn("w-3.5 h-3.5", firewallRules.https.enabled ? "text-[#0f172a]" : "text-transparent")} />
                  </button>
                  <div>
                    <div className={cn("text-sm font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Allow HTTPS traffic from the Internet</div>
                    <div className={cn("text-xs mt-0.5 leading-snug", isDark ? "text-zinc-400" : "text-slate-500")}>To set up an endpoint, for example when creating a web server</div>
                  </div>
                </div>
                {firewallRules.https.enabled && (
                  <div className="flex flex-col gap-2 w-full md:w-64 shrink-0">
                    <Select
                      className={cn("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
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
                        className={cn("border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 w-full", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
                        value={firewallRules.https.customIp}
                        onChange={(e) => setFirewallRules(r => ({ ...r, https: { ...r.https, customIp: e.target.value } }))}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* HTTP Rule */}
              <div className={cn("border p-4 rounded-xl flex flex-col md:flex-row md:items-start justify-between gap-4", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setFirewallRules(r => ({ ...r, http: { ...r.http, enabled: !r.http.enabled } }))}
                    className={cn(
                      "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200",
                      firewallRules.http.enabled
                        ? "bg-cyan-400"
                        : isDark ? "bg-[#060b14] border-slate-800 hover:border-cyan-400/50" : "bg-white border-slate-200 hover:border-cyan-400"
                    )}
                  >
                    <CheckCircle className={cn("w-3.5 h-3.5", firewallRules.http.enabled ? "text-[#0f172a]" : "text-transparent")} />
                  </button>
                  <div>
                    <div className={cn("text-sm font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Allow HTTP traffic from the Internet</div>
                    <div className={cn("text-xs mt-0.5 leading-snug", isDark ? "text-zinc-400" : "text-slate-500")}>To set up an endpoint, for example when creating a web server</div>
                  </div>
                </div>
                {firewallRules.http.enabled && (
                  <div className="flex flex-col gap-2 w-full md:w-64 shrink-0">
                    <Select
                      className={cn("w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
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
                        className={cn("border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 w-full", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
                        value={firewallRules.http.customIp}
                        onChange={(e) => setFirewallRules(r => ({ ...r, http: { ...r.http, customIp: e.target.value } }))}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.section>


          {/* Authentication & Settings */}
          <motion.section variants={itemVariants} className={cn("rounded-3xl p-4 sm:p-6 md:p-8 shadow-md relative z-[5] w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                        <h2 className={cn("text-xl font-bold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <Settings2 className="w-5 h-5 text-cyan-400" />
              8. Server Details
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Hostname</label>
                  <input
                    type="text"
                    required
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="server.example.com"
                    className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500/50 shadow-inner hover:border-cyan-500/30 placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-400")}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="User"
                    className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500/50 shadow-inner hover:border-cyan-500/30 placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-400")}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 symbol..."
                      className={cn(
                        isDark ? "w-full bg-black/40 border rounded-2xl pl-5 pr-12 py-3.5 text-sm text-white font-bold focus:outline-none transition-colors shadow-inner placeholder:text-zinc-600" : "w-full border border-slate-200 bg-white rounded-2xl pl-5 pr-12 py-3.5 text-sm text-slate-900 font-bold focus:outline-none transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500",
                        passwordError && password.length > 0
                          ? "border-red-500/50 focus:border-red-500 hover:border-red-500/30"
                          : isDark ? "border-slate-800 focus:border-cyan-500/50 hover:border-cyan-500/30" : "hover:border-cyan-400"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-cyan-400 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Retype Password</label>
                  <div className="relative">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Retype password..."
                      className={cn(
                        isDark ? "w-full bg-black/40 border rounded-2xl pl-5 pr-12 py-3.5 text-sm text-white font-bold focus:outline-none transition-colors shadow-inner placeholder:text-zinc-600" : "w-full border border-slate-200 bg-white rounded-2xl pl-5 pr-12 py-3.5 text-sm text-slate-900 font-bold focus:outline-none transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500",
                        password !== passwordConfirm && passwordConfirm.length > 0
                          ? "border-red-500/50 focus:border-red-500 hover:border-red-500/30"
                          : isDark ? "border-slate-800 focus:border-cyan-500/50 hover:border-cyan-500/30" : "hover:border-cyan-400"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-cyan-400 transition-colors p-1"
                    >
                      {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {passwordError && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {passwordError}
                  </p>
                )}
              </div>
            </div>



            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className={cn("block text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>SSH Public Key (Optional)</label>
                <button
                  type="button"
                  onClick={handleGenerateSSHKey}
                  disabled={isGeneratingKey}
                  className={cn(
                    "text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-medium",
                    isDark ? "text-cyan-400 hover:text-cyan-300 bg-cyan-500/10" : "text-slate-900 hover:text-black bg-slate-100 hover:bg-slate-200"
                  )}
                >
                  {isGeneratingKey ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Auto Generate & Download .pem
                </button>
              </div>
              <textarea
                value={sshKey}
                onChange={(e) => setSshKey(e.target.value)}
                placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQ... user@hostname"
                className={cn("w-full h-28 border rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none transition-colors font-mono resize-none leading-relaxed", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500/50 shadow-inner hover:border-cyan-500/30 placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-400")}
              />
              <p className="text-xs text-zinc-500 mt-2">Add your public key to login securely without a password.</p>
            </div>
          </motion.section>
        </div>

        {/* Order Summary Sidebar */}
        <motion.div variants={itemVariants} className="xl:col-span-1 w-full max-w-full min-w-0">
          <div className={cn("rounded-3xl p-4 sm:p-6 md:p-8 shadow-md sticky top-6 relative overflow-hidden w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                        <h2 className={cn("text-xl font-bold tracking-wide mb-6 border-b pb-4 flex items-center gap-2 relative z-10", isDark ? "text-white border-slate-800" : "text-slate-900 border-slate-200")}>
              <ListChecks className="w-5 h-5 text-cyan-400" />
              {serviceType === "KUBERNETES" ? (isAddWorkerNode ? "Worker Configuration" : "Cluster Configuration") : "Server Configuration"}
            </h2>

            <div className="space-y-4 mb-6 relative z-10">
              <div className="flex justify-between items-center text-sm px-2">
                <span className={cn("font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]", isDark ? "text-zinc-400" : "text-slate-600")}><Disc className="w-3.5 h-3.5" /> OS Template</span>
                <span className={cn("font-bold px-2 py-1 rounded-lg border truncate max-w-[150px]", isDark ? "text-white bg-slate-800/60 border-slate-700" : "text-slate-900 bg-slate-100 border-slate-200")}>
                  {templates.find(t => t.id === selectedTemplate)?.name || "-"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm px-2">
                <span className={cn("font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]", isDark ? "text-zinc-400" : "text-slate-600")}><DollarSign className="w-3.5 h-3.5" /> Billing Mode</span>
                <span className={cn("font-bold px-2 py-1 rounded-lg border", isDark ? "text-white bg-slate-800/60 border-slate-700" : "text-slate-900 bg-slate-100 border-slate-200")}>Pay As You Go</span>
              </div>
              <div className="flex justify-between items-center text-sm px-2">
                <span className={cn("font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]", isDark ? "text-zinc-400" : "text-slate-600")}><Cpu className="w-3.5 h-3.5" /> vCPU</span>
                <span className={cn("font-bold px-2 py-1 rounded-lg border", isDark ? "text-white bg-slate-800/60 border-slate-700" : "text-slate-900 bg-slate-100 border-slate-200")}>{cpuCores} Cores</span>
              </div>
              <div className="flex justify-between items-center text-sm px-2">
                <span className={cn("font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]", isDark ? "text-zinc-400" : "text-slate-600")}><MemoryStick className="w-3.5 h-3.5" /> RAM</span>
                <span className={cn("font-bold px-2 py-1 rounded-lg border", isDark ? "text-white bg-slate-800/60 border-slate-700" : "text-slate-900 bg-slate-100 border-slate-200")}>{ramGb} GB</span>
              </div>
              <div className="flex justify-between items-center text-sm px-2">
                <span className={cn("font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]", isDark ? "text-zinc-400" : "text-slate-600")}><HardDrive className="w-3.5 h-3.5" /> Disk Storage</span>
                <span className={cn("font-bold px-2 py-1 rounded-lg border", isDark ? "text-white bg-slate-800/60 border-slate-700" : "text-slate-900 bg-slate-100 border-slate-200")}>{diskGb} GB</span>
              </div>
              <div className="flex justify-between items-center text-sm px-2">
                <span className={cn("font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]", isDark ? "text-zinc-400" : "text-slate-600")}><Network className="w-3.5 h-3.5" /> Network IPs</span>
                <span className={cn("font-bold px-2 py-1 rounded-lg border", isDark ? "text-white bg-slate-800/60 border-slate-700" : "text-slate-900 bg-slate-100 border-slate-200")}>
                  {ipv4Count > 0 && ipv6Count > 0 ? `${ipv4Count} IPv4 + ${ipv6Count} IPv6` : ipv4Count > 0 ? `${ipv4Count} IPv4` : ipv6Count > 0 ? `${ipv6Count} IPv6` : "None"}
                </span>
              </div>
              {backupGb > 0 && (
                <div className="flex justify-between items-center text-sm px-2">
                  <span className={cn("font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]", isDark ? "text-zinc-400" : "text-slate-600")}><DatabaseBackup className="w-3.5 h-3.5" /> Backup Storage</span>
                  <span className={cn("font-bold px-2 py-1 rounded-lg border", isDark ? "text-white bg-slate-800/60 border-slate-700" : "text-slate-900 bg-slate-100 border-slate-200")}>{backupGb} GB</span>
                </div>
              )}
            </div>

            <div className={cn("border-t pt-6 mb-6", isDark ? "border-slate-800" : "border-slate-200")}>
              <div className="flex justify-between items-center text-sm mb-4">
                <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Total Price</span>
                <div className="text-right">
                  <div className="text-cyan-400 font-bold text-lg">Rp {calculateHourlyPrice().toLocaleString('id-ID')} / hr</div>
                  <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>~ Rp {calculateMonthlyPrice().toLocaleString('id-ID')} / mo</div>
                </div>
              </div>
            </div>

            <div className={cn("mb-6 border-t pt-6", isDark ? "border-slate-800" : "border-slate-200")}>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-1 shrink-0">
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className={cn("w-5 h-5 rounded border cursor-pointer appearance-none transition-all", isDark ? "border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20 checked:bg-cyan-500 checked:border-cyan-500" : "border-slate-300 bg-white text-cyan-600 focus:ring-cyan-200 checked:bg-cyan-600 checked:border-cyan-600")} />
                  <ShieldCheck className={cn("absolute w-3.5 h-3.5 text-white pointer-events-none transition-opacity", termsAccepted ? "opacity-100" : "opacity-0")} />
                </div>
                <span className={cn("text-xs leading-relaxed transition-colors", isDark ? "text-zinc-400 group-hover:text-zinc-300" : "text-slate-500 group-hover:text-slate-700")}>
                  I agree to the <a href="/terms" target="_blank" className={cn("hover:underline", isDark ? "text-cyan-400" : "text-cyan-600")}>Terms of Service</a> and <a href="/privacy" target="_blank" className={cn("hover:underline", isDark ? "text-cyan-400" : "text-cyan-600")}>Privacy Policy</a>, and understand that resources will be provisioned immediately.
                </span>
              </label>
            </div>

            {balance < 50000 && (
              <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  A minimum balance of <strong>Rp 50.000</strong> is required to enable Pay-As-You-Go mode. Please <Link href="/dashboard/billing" className="underline font-bold hover:text-red-300 transition-colors">Top Up</Link> first.
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
              if (selectedTemplate === null) missingFields.push("OS Template");
              
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

              if (missingFields.length > 0 || isK3sMissingIp) {
                return (
                  <div className={cn("mb-4 rounded-xl p-4 flex items-start gap-3 text-sm animate-in slide-in-from-bottom-2 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                    <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    <div className="flex flex-col gap-1">
                      <p className={cn("font-medium mb-1", isDark ? "text-cyan-400" : "text-cyan-800")}>Cannot Deploy {serviceType === "KUBERNETES" ? "Cluster" : "Server"}:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {missingFields.length > 0 && (
                          <li>Please complete all required fields: {missingFields.join(", ")}.</li>
                        )}
                        {isK3sMissingIp && (
                          <li>K3s requires at least 1 Public IPv4 or a Reserved IP.</li>
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
                isDisabled || !termsAccepted || isSubmitting || !hostname || !username || selectedTemplate === null ||
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
                (serviceType === "KUBERNETES" && !useReservedIp && ipv4Count === 0)
              }
              className={cn("group w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative z-10", "shadow-sm")}
            >
              {isDisabled ? "Coming Soon" : isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                  {isAddWorkerNode ? "Deploy Worker Node" : "Deploy Server"}
                </>
              )}
            </button>
            <div className="mt-6 flex flex-col items-center justify-center gap-2 relative z-10">
              <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                256-bit Encrypted Checkout
              </div>
              <p className={cn("text-xs mt-1", isDark ? "text-zinc-600" : "text-slate-400")}>
                Provisioning typically takes up to 5 minutes.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
