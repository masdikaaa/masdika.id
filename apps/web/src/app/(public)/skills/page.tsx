"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  Server,
  Activity,
  Award,
  ArrowRight,
  Brain,
  Users,
  Lightbulb,
  Target,
  Trophy,
  BadgeCheck,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  SiKubernetes,
  SiMikrotik,
  SiGooglecloud,
  SiTerraform,
  SiDocker,
  SiRedhat,
  SiLinux,
  SiCloudflare,
} from "react-icons/si";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { SectionOrnaments } from "@/components/ui/PremiumBackground";

const DEFAULT_CERTIFICATIONS = [
  {
    title: "AWS Certified Solutions Architect",
    org: "Amazon Web Services",
    date: "2024",
    icon: "Award",
  },
  {
    title: "Certified Kubernetes Administrator",
    org: "Cloud Native Computing Foundation",
    date: "2023",
    icon: "CheckCircle",
  },
  {
    title: "Google Cloud Professional Architect",
    org: "Google Cloud",
    date: "2023",
    icon: "Trophy",
  },
  {
    title: "HashiCorp Certified: Terraform",
    org: "HashiCorp",
    date: "2022",
    icon: "CheckCircle",
  },
];

function AwsOriginalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 304 182" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        className="fill-[#252F3E] dark:fill-white"
        d="M86.4 66.4c0 3.7.4 6.7 1.1 8.9.8 2.2 1.8 4.6 3.2 7.2.5.8.7 1.6.7 2.3 0 1-.6 2-1.9 3l-6.3 4.2c-.9.6-1.8.9-2.6.9-1 0-2-.5-3-1.4-1.4-1.5-2.6-3.1-3.6-4.7-1-1.7-2-3.6-3.1-5.9-7.8 9.2-17.6 13.8-29.4 13.8-8.4 0-15.1-2.4-20-7.2-4.9-4.8-7.4-11.2-7.4-19.2 0-8.5 3-15.4 9.1-20.6 6.1-5.2 14.2-7.8 24.5-7.8 3.4 0 6.9.3 10.6.8 3.7.5 7.5 1.3 11.5 2.2v-7.3c0-7.6-1.6-12.9-4.7-16-3.2-3.1-8.6-4.6-16.3-4.6-3.5 0-7.1.4-10.8 1.3-3.7.9-7.3 2-10.8 3.4-1.6.7-2.8 1.1-3.5 1.3-.7.2-1.2.3-1.6.3-1.4 0-2.1-1-2.1-3.1v-4.9c0-1.6.2-2.8.7-3.5.5-.7 1.4-1.4 2.8-2.1 3.5-1.8 7.7-3.3 12.6-4.5 4.9-1.3 10.1-1.9 15.6-1.9 11.9 0 20.6 2.7 26.2 8.1 5.5 5.4 8.3 13.6 8.3 24.6v32.4zM45.8 81.6c3.3 0 6.7-.6 10.3-1.8 3.6-1.2 6.8-3.4 9.5-6.4 1.6-1.9 2.8-4 3.4-6.4.6-2.4 1-5.3 1-8.7v-4.2c-2.9-.7-6-1.3-9.2-1.7-3.2-.4-6.3-.6-9.4-.6-6.7 0-11.6 1.3-14.9 4-3.3 2.7-4.9 6.5-4.9 11.5 0 4.7 1.2 8.2 3.7 10.6 2.4 2.5 5.9 3.7 10.5 3.7zm80.3 10.8c-1.8 0-3-.3-3.8-1-.8-.6-1.5-2-2.1-3.9L96.7 10.2c-.6-2-.9-3.3-.9-4 0-1.6.8-2.5 2.4-2.5h9.8c1.9 0 3.2.3 3.9 1 .8.6 1.4 2 2 3.9l16.8 66.2 15.6-66.2c.5-2 1.1-3.3 1.9-3.9.8-.6 2.2-1 4-1h8c1.9 0 3.2.3 4 1 .8.6 1.5 2 1.9 3.9l15.8 67 17.3-67c.6-2 1.3-3.3 2-3.9.8-.6 2.1-1 3.9-1h9.3c1.6 0 2.5.8 2.5 2.5 0 .5-.1 1-.2 1.6-.1.6-.3 1.4-.7 2.5l-24.1 77.3c-.6 2-1.3 3.3-2.1 3.9-.8.6-2.1 1-3.8 1h-8.6c-1.9 0-3.2-.3-4-1-.8-.7-1.5-2-1.9-4L156 23l-15.4 64.4c-.5 2-1.1 3.3-1.9 4-.8.7-2.2 1-4 1h-8.6zm128.5 2.7c-5.2 0-10.4-.6-15.4-1.8-5-1.2-8.9-2.5-11.5-4-1.6-.9-2.7-1.9-3.1-2.8-.4-.9-.6-1.9-.6-2.8v-5.1c0-2.1.8-3.1 2.3-3.1.6 0 1.2.1 1.8.3.6.2 1.5.6 2.5 1 3.4 1.5 7.1 2.7 11 3.5 4 .8 7.9 1.2 11.9 1.2 6.3 0 11.2-1.1 14.6-3.3 3.4-2.2 5.2-5.4 5.2-9.5 0-2.8-.9-5.1-2.7-7-1.8-1.9-5.2-3.6-10.1-5.2L246 52c-7.3-2.3-12.7-5.7-16-10.2-3.3-4.4-5-9.3-5-14.5 0-4.2.9-7.9 2.7-11.1 1.8-3.2 4.2-6 7.2-8.2 3-2.3 6.4-4 10.4-5.2 4-1.2 8.2-1.7 12.6-1.7 2.2 0 4.5.1 6.7.4 2.3.3 4.4.7 6.5 1.1 2 .5 3.9 1 5.7 1.6 1.8.6 3.2 1.2 4.2 1.8 1.4.8 2.4 1.6 3 2.5.6.8.9 1.9.9 3.3v4.7c0 2.1-.8 3.2-2.3 3.2-.8 0-2.1-.4-3.8-1.2-5.7-2.6-12.1-3.9-19.2-3.9-5.7 0-10.2.9-13.3 2.8-3.1 1.9-4.7 4.8-4.7 8.9 0 2.8 1 5.2 3 7.1 2 1.9 5.7 3.8 11 5.5l14.2 4.5c7.2 2.3 12.4 5.5 15.5 9.6 3.1 4.1 4.6 8.8 4.6 14 0 4.3-.9 8.2-2.6 11.6-1.8 3.4-4.2 6.4-7.3 8.8-3.1 2.5-6.8 4.3-11.1 5.6-4.5 1.4-9.2 2.1-14.3 2.1z"
      />
      <path
        fill="#FF9900"
        d="M273.5 143.7c-32.9 24.3-80.7 37.2-121.8 37.2-57.6 0-109.5-21.3-148.7-56.7-3.1-2.8-.3-6.6 3.4-4.4 42.4 24.6 94.7 39.5 148.8 39.5 36.5 0 76.6-7.6 113.5-23.2 5.5-2.5 10.2 3.6 4.8 7.6z"
      />
      <path
        fill="#FF9900"
        d="M287.2 128.1c-4.2-5.4-27.8-2.6-38.5-1.3-3.2.4-3.7-2.4-.8-4.5 18.8-13.2 49.7-9.4 53.3-5 3.6 4.5-1 35.4-18.6 50.2-2.7 2.3-5.3 1.1-4.1-1.9 4-9.9 12.9-32.2 8.7-37.5z"
      />
    </svg>
  );
}

function getCertMeta(cert: { title?: string; org?: string; description?: string; icon?: string; domain?: string; code?: string }) {
  const text = `${cert.title || ""} ${cert.org || ""}`.toLowerCase();

  if (text.includes("aws") || text.includes("amazon")) {
    return {
      logoUrl: null,
      BrandIcon: AwsOriginalIcon,
      iconColor: "",
      domain: cert.domain || "Cloud Architecture",
      code: cert.code || "AWS-SAA",
      summary:
        cert.description ||
        "Designing distributed, fault-tolerant, and cost-optimized multi-AZ production architectures on AWS.",
    };
  }
  if (text.includes("kubernetes") || text.includes("cncf") || text.includes("cka")) {
    return {
      logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/kubernetes/kubernetes-plain.svg",
      BrandIcon: SiKubernetes,
      iconColor: "text-[#326CE5]",
      domain: cert.domain || "Container Orchestration",
      code: cert.code || "CNCF-CKA",
      summary:
        cert.description ||
        "Production cluster lifecycle management, CNI networking, RBAC hardening, and workload troubleshooting.",
    };
  }
  if (text.includes("google") || text.includes("gcp")) {
    return {
      logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/googlecloud/googlecloud-original.svg",
      BrandIcon: SiGooglecloud,
      iconColor: "text-[#4285F4]",
      domain: cert.domain || "Enterprise Cloud",
      code: cert.code || "GCP-PCA",
      summary:
        cert.description ||
        "Architecting scalable Google Cloud infrastructure, hybrid VPC interconnects, and GKE workloads.",
    };
  }
  if (text.includes("terraform") || text.includes("hashicorp")) {
    return {
      logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/terraform/terraform-original.svg",
      BrandIcon: SiTerraform,
      iconColor: "text-[#844FBA]",
      domain: cert.domain || "Infrastructure as Code",
      code: cert.code || "HCTA-003",
      summary:
        cert.description ||
        "Modular Infrastructure as Code workflows, remote state locking, and automated multi-cloud provisioning.",
    };
  }
  if (text.includes("mikrotik") || text.includes("mtcna") || text.includes("mtcre")) {
    return {
      logoUrl: null,
      BrandIcon: SiMikrotik,
      iconColor: "text-slate-800 dark:text-white",
      domain: cert.domain || "Core Networking",
      code: cert.code || "MTCNA / MTCRE",
      summary:
        cert.description ||
        "Carrier-grade RouterOS routing, BGP/OSPF peering, firewall filtering, and high-throughput tunneling.",
    };
  }
  if (text.includes("redhat") || text.includes("rhcsa") || text.includes("rhce")) {
    return {
      logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redhat/redhat-original.svg",
      BrandIcon: SiRedhat,
      iconColor: "text-[#EE0000]",
      domain: cert.domain || "Enterprise Linux",
      code: cert.code || "RHCSA",
      summary:
        cert.description ||
        "Enterprise Linux systems administration, SELinux security hardening, storage management, and automation.",
    };
  }
  if (text.includes("docker")) {
    return {
      logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg",
      BrandIcon: SiDocker,
      iconColor: "text-[#2496ED]",
      domain: cert.domain || "Containerization",
      code: cert.code || "DCA",
      summary:
        cert.description ||
        "Container image optimization, multi-stage builds, registry security, and runtime orchestration.",
    };
  }
  if (text.includes("cloudflare")) {
    return {
      logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cloudflare/cloudflare-original.svg",
      BrandIcon: SiCloudflare,
      iconColor: "text-[#F38020]",
      domain: cert.domain || "Edge Security",
      code: cert.code || "CF-ZT",
      summary:
        cert.description ||
        "Global Anycast CDN, Zero Trust network access, L3/L7 DDoS mitigation, and edge WAF rulesets.",
    };
  }
  if (text.includes("linux")) {
    return {
      logoUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg",
      BrandIcon: SiLinux,
      iconColor: "text-amber-500",
      domain: cert.domain || "Linux Kernel & OS",
      code: cert.code || "LFCS",
      summary:
        cert.description ||
        "Production Linux server administration, kernel tuning, networking, and systemd service management.",
    };
  }

  const FallbackIcon = (cert.icon && (LucideIcons as any)[cert.icon]) || Award;
  return {
    logoUrl: null,
    BrandIcon: FallbackIcon,
    iconColor: "text-cyan-600 dark:text-cyan-400",
    domain: cert.domain || "Accreditation",
    code: cert.code || "VERIFIED",
    summary:
      cert.description ||
      "Industry-recognized technical certification validating hands-on cloud and infrastructure engineering proficiency.",
  };
}

export default function SkillsPage() {
  const [certifications, setCertifications] = useState<any[]>(DEFAULT_CERTIFICATIONS);
  const [certPage, setCertPage] = useState(1);
  const certsPerPage = 4;

  useEffect(() => {
    fetch("/api/certifications")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error && Array.isArray(data) && data.length > 0) {
          setCertifications(data);
          setCertPage(1);
        }
      })
      .catch((err) => console.error("Error fetching certifications:", err));
  }, []);

  const totalCertPages = Math.max(1, Math.ceil(certifications.length / certsPerPage));
  const paginatedCertifications = certifications.slice(
    (certPage - 1) * certsPerPage,
    certPage * certsPerPage
  );

  type SkillItem = {
    name: string;
    level: number;
    icon?: string;
    iconComponent?: React.ComponentType<{ className?: string }>;
    invert?: boolean;
  };

  const categories: { title: string; badge: string; skills: SkillItem[] }[] = [
    {
      title: "Cloud Platforms",
      badge: "Multi-Cloud",
      skills: [
        {
          name: "AWS",
          level: 90,
          iconComponent: AwsOriginalIcon,
        },
        {
          name: "Google Cloud (GCP)",
          level: 80,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/googlecloud/googlecloud-original.svg",
        },
        {
          name: "Microsoft Azure",
          level: 65,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/azure/azure-original.svg",
        },
      ],
    },
    {
      title: "Containers & Orchestration",
      badge: "Cloud Native",
      skills: [
        {
          name: "Docker",
          level: 95,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg",
        },
        {
          name: "Kubernetes & K3s",
          level: 88,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/kubernetes/kubernetes-plain.svg",
        },
        {
          name: "Helm",
          level: 82,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/helm/helm-original.svg",
        },
      ],
    },
    {
      title: "DevOps & CI/CD Pipelines",
      badge: "Release Automation",
      skills: [
        {
          name: "GitLab CI",
          level: 90,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/gitlab/gitlab-original.svg",
        },
        {
          name: "GitHub Actions",
          level: 85,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg",
          invert: true,
        },
        {
          name: "Jenkins",
          level: 75,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jenkins/jenkins-original.svg",
        },
      ],
    },
    {
      title: "Infrastructure as Code (IaC)",
      badge: "Declarative Infra",
      skills: [
        {
          name: "Terraform",
          level: 90,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/terraform/terraform-original.svg",
        },
        {
          name: "Ansible",
          level: 85,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ansible/ansible-original.svg",
        },
        {
          name: "OpenTofu",
          level: 82,
          icon: "https://cdn.simpleicons.org/opentofu/FFDA1A",
        },
      ],
    },
    {
      title: "Operating Systems & Linux",
      badge: "Bare-Metal & Kernel",
      skills: [
        { name: "Ubuntu Server", level: 95, icon: "https://cdn.simpleicons.org/ubuntu/E95420" },
        {
          name: "Debian",
          level: 90,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg",
        },
        {
          name: "AlmaLinux",
          level: 90,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg",
        },
        {
          name: "Red Hat Enterprise",
          level: 85,
          icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redhat/redhat-original.svg",
        },
      ],
    },
    {
      title: "Networking & VPN Infrastructure",
      badge: "Routing & Virtualization",
      skills: [
        { name: "Proxmox VE", level: 95, icon: "https://cdn.simpleicons.org/proxmox/E57000" },
        { name: "WireGuard Mesh", level: 90, icon: "https://cdn.simpleicons.org/wireguard/88171A" },
        { name: "MikroTik RouterOS", level: 85, iconComponent: SiMikrotik },
        { name: "OpenVPN", level: 80, icon: "https://cdn.simpleicons.org/openvpn/EA7E20" },
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 lg:pb-28 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO ────────────────────────────────────────────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30">
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  TECHNICAL EXPERTISE &amp; PROFICIENCIES
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Technical Skills <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  &amp; Proficiencies.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                A comprehensive overview of my technical proficiencies, DevOps automation toolchains, multi-cloud competencies, and engineering traits.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#skills-grid"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Stack
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#certifications-section"
                  leftIcon={<Award className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Certifications
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/skills.webp"
                imageAlt="Masdika – Technical Skills"
                imageWidth={1024}
                imageHeight={1024}
                badges={[
                  { icon: Cloud, label: "Cloud Platform", value: "AWS & GCP" },
                  { icon: SiKubernetes, label: "Containers", value: "Docker & K8s" },
                  { icon: Activity, label: "Automation", value: "CI/CD & GitOps" },
                  { icon: Server, label: "Infrastructure", value: "Terraform & IaC" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 1. TECHNICAL PROFICIENCIES SECTION ──────────────────────── */}
        <section id="skills-grid" className="py-16 lg:py-24 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Core Competencies
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Domains of Technical Expertise
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Hands-on experience and verified proficiency across enterprise cloud providers, container orchestration, and continuous delivery systems.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {categories.map((category, i) => (
              <div key={i} className="h-full">
                <div className="h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-all duration-300 p-6 sm:p-8 flex flex-col justify-start">
                  <div className="mb-6 pb-4 border-b border-[var(--border-primary)] flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                        {category.title}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                      {category.badge} • {category.skills.length} Tools
                    </span>
                  </div>

                  <div className="space-y-6">
                    {category.skills.map((skill, j) => (
                      <div key={j} className="group/skill">
                        <div className="flex justify-between items-center mb-2.5 gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 shrink-0 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] group-hover/skill:border-cyan-500/30 flex items-center justify-center p-2 transition-colors">
                              {skill.iconComponent ? (
                                <skill.iconComponent
                                  className={cn(
                                    "w-full h-full",
                                    skill.name === "AWS" ? "text-[#FF9900]" : "text-slate-800 dark:text-white"
                                  )}
                                />
                              ) : (
                                <img
                                  referrerPolicy="no-referrer"
                                  src={skill.icon}
                                  alt={skill.name}
                                  className={cn(
                                    "w-full h-full object-contain max-w-full max-h-full",
                                    skill.invert && "dark:filter dark:invert dark:brightness-0 dark:saturate-100"
                                  )}
                                  loading="lazy"
                                  decoding="async"
                                />
                              )}
                            </div>
                            <span className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
                              {skill.name}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            {skill.level}%
                          </span>
                        </div>

                        <div className="h-2 rounded-full overflow-hidden bg-[var(--surface-secondary)] border border-[var(--border-primary)]">
                          <div
                            style={{ width: `${skill.level}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 2. PROFESSIONAL TRAITS SECTION ─────────────────────────── */}
        <section className="py-16 lg:py-24 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Engineering Mindset
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Professional Traits &amp; Delivery
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Core operating principles that guide high-impact engineering collaboration, continuous growth, and mission-critical execution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                label: "Root-Cause Diagnostics",
                tag: "SRE Approach",
                desc: "Systematic packet-level and log-driven analysis to resolve complex infrastructure bottlenecks rapidly.",
                metric: "MTTR < 15m",
                icon: Brain,
              },
              {
                label: "Cross-Team Synergy",
                tag: "Documentation",
                desc: "Clear architecture runbooks, post-mortem transparency, and seamless collaboration with product engineers.",
                metric: "100% Documented",
                icon: Users,
              },
              {
                label: "Architecture Agility",
                tag: "Modern Stack",
                desc: "Rapid evaluation and safe adoption of cloud-native patterns, eBPF networking, and GitOps toolchains.",
                metric: "Cloud-Native",
                icon: Lightbulb,
              },
              {
                label: "SLA-Driven Execution",
                tag: "Reliability",
                desc: "Laser focus on delivering measurable production uptime, cost optimization, and deployment velocity.",
                metric: "98.99% Target SLA",
                icon: Target,
              },
            ].map((trait, idx) => (
              <div key={idx} className="h-full">
                <div className="group rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300 hover:-translate-y-1 p-5 sm:p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shrink-0">
                        <trait.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.75} />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                        {trait.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-2">
                      {trait.label}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                      {trait.desc}
                    </p>
                  </div>

                  <div className="pt-3.5 border-t border-[var(--border-primary)] flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)] font-mono">Benchmark</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{trait.metric}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. CERTIFICATIONS & ACCREDITATIONS SECTION (REFINED) ────── */}
        <section id="certifications-section" className="py-16 lg:py-24 relative z-10 border-t border-[var(--border-primary)]">
          <SectionOrnaments variant="sides" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch relative z-10">

            {/* Left Column (4 cols): Header & Verification Summary Card */}
            <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8">
              <div>
                <div className="flex items-center justify-between gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-cyan-600 dark:text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    Milestones &amp; Accreditations
                  </span>
                  <span className="inline-flex items-center whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                    {certifications.length} Total
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] mb-4 leading-[1.15]">
                  Certifications &amp; Awards
                </h2>

                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-6">
                  Continuous validation against enterprise cloud standards, Kubernetes administration benchmarks, and declarative infrastructure practices.
                </p>

                <div className="space-y-2.5 mb-8 pt-5 border-t border-[var(--border-primary)]">
                  {[
                    "Official Vendor-Backed Accreditations",
                    "Production Multi-Cloud & CNCF Scope",
                    "Hands-On Lab & Exam Verified",
                  ].map((itemText) => (
                    <div key={itemText} className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-secondary)]">
                      <CheckCircle2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                      <span>{itemText}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {totalCertPages > 1 && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                    <span className="text-xs font-mono font-semibold text-[var(--text-secondary)] pl-1">
                      Page <span className="text-[var(--text-primary)] font-bold">{certPage}</span> / {totalCertPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Previous certifications page"
                        onClick={() => setCertPage((p) => Math.max(1, p - 1))}
                        disabled={certPage === 1}
                        className="w-8 h-8 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 text-[var(--text-secondary)] hover:text-cyan-500 dark:hover:text-cyan-400 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next certifications page"
                        onClick={() => setCertPage((p) => Math.min(totalCertPages, p + 1))}
                        disabled={certPage === totalCertPages}
                        className="w-8 h-8 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 text-[var(--text-secondary)] hover:text-cyan-500 dark:hover:text-cyan-400 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="md"
                  href="/contact"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full justify-center"
                >
                  Hire Cloud Expertise
                </Button>
              </div>
            </div>

            {/* Right Column (8 cols): 2x2 High-Craft Credential Cards (Paginated 4 per page) */}
            <div className="lg:col-span-8 flex flex-col justify-between gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch flex-1">
                {paginatedCertifications.length > 0 ? (
                  paginatedCertifications.map((cert, idx) => {
                  const meta = getCertMeta(cert);
                  const BrandIcon = meta.BrandIcon;

                  return (
                    <div
                      key={idx}
                      className="group relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300 hover:-translate-y-0.5 p-5 sm:p-6 flex flex-col justify-between h-full"
                    >
                      <div>
                        {/* Card Top Header: Official Brand Icon + Domain & Active Year Pill */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-[var(--border-primary)] bg-[var(--surface-secondary)] group-hover:border-cyan-500/30 transition-colors shrink-0 p-2.5">
                              {meta.logoUrl ? (
                                <img
                                  referrerPolicy="no-referrer"
                                  src={meta.logoUrl}
                                  alt={cert.org || cert.title}
                                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : BrandIcon ? (
                                <BrandIcon
                                  className={cn(
                                    "w-7 h-7 transition-transform duration-300 group-hover:scale-110",
                                    meta.iconColor
                                  )}
                                />
                              ) : (
                                <Award className="w-6 h-6 text-cyan-500" />
                              )}
                            </div>

                            <div>
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block">
                                {meta.domain}
                              </span>
                              <span className="text-xs font-mono text-[var(--text-muted)]">
                                {meta.code}
                              </span>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                            <Calendar className="w-3 h-3" />
                            {cert.date}
                          </span>
                        </div>

                        {/* Credential Title */}
                        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-1 leading-snug">
                          {cert.title}
                        </h3>

                        {/* Issuing Authority */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] mb-3">
                          <span>{cert.org}</span>
                          <BadgeCheck className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />
                        </div>

                        {/* Technical Scope */}
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                          {meta.summary}
                        </p>
                      </div>

                      {/* Credential Verification Footer */}
                      <div className="pt-3.5 border-t border-[var(--border-primary)] flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                          Verified Credential
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      </div>
                    </div>
                  );
                })
                ) : (
                  <div className="col-span-2 text-center py-16 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)]">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-zinc-600" />
                    <h3 className="text-lg font-bold mb-1 text-[var(--text-primary)]">No Certifications Listed</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Certifications will appear here once configured.</p>
                  </div>
                )}
              </div>

              {totalCertPages > 1 && (
                <div className="flex items-center justify-between gap-4 pt-2">
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    Showing {(certPage - 1) * certsPerPage + 1}–{Math.min(certPage * certsPerPage, certifications.length)} of {certifications.length} credentials
                  </span>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalCertPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCertPage(pageNum)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer",
                          certPage === pageNum
                            ? "bg-cyan-400 text-slate-950 border-cyan-400"
                            : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:border-cyan-500/40"
                        )}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── 4. CALL TO ACTION ──────────────────────────────────────── */}
        <section className="pt-8 pb-0">
          <div className="rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/40" />
            <Badge variant="brand" size="md" className="mb-4 font-mono uppercase">
              LET&apos;S COLLABORATE
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
              Looking for Verified Cloud &amp; DevOps Expertise?
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              Let&apos;s discuss how my architecture design, Kubernetes automation, and cloud engineering skills can accelerate your development roadmap.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href="/contact"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Start a Conversation
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="/portfolio"
              >
                View Case Studies
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
