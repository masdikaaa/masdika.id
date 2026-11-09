/**
 * Utility functions and presets for VPS Operating System templates and icons.
 * Consistent across Admin Panel and Customer Dashboard.
 */

export interface OsPreset {
  id: string;
  name: string;
  family: string;
  templateValue: string;
  description?: string;
}

export interface OsGroup {
  family: string;
  icon: string;
  presets: OsPreset[];
}

export const OS_GROUPS: OsGroup[] = [
  {
    family: "Debian",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg",
    presets: [
      { id: "deb-12", name: "Debian 12", family: "Debian", templateValue: "Debian-12", description: "Bookworm (Latest Stable)" },
      { id: "deb-11", name: "Debian 11", family: "Debian", templateValue: "Debian-11", description: "Bullseye (Oldstable)" },
      { id: "deb-13", name: "Debian 13", family: "Debian", templateValue: "Debian-13", description: "Trixie (Testing)" },
    ],
  },
  {
    family: "Ubuntu",
    icon: "https://cdn.simpleicons.org/ubuntu/E95420",
    presets: [
      { id: "ubu-2504", name: "Ubuntu 25.04", family: "Ubuntu", templateValue: "Ubuntu-25.04", description: "Plucky Puffin" },
      { id: "ubu-2404", name: "Ubuntu 24.04 LTS", family: "Ubuntu", templateValue: "Ubuntu-24.04", description: "Noble Numbat (Recommended)" },
      { id: "ubu-2204", name: "Ubuntu 22.04 LTS", family: "Ubuntu", templateValue: "Ubuntu-22.04", description: "Jammy Jellyfish" },
      { id: "ubu-2004", name: "Ubuntu 20.04 LTS", family: "Ubuntu", templateValue: "Ubuntu-20.04", description: "Focal Fossa" },
      { id: "ubu-2604", name: "Ubuntu 26.04", family: "Ubuntu", templateValue: "Ubuntu-26.04", description: "Next Generation" },
    ],
  },
  {
    family: "AlmaLinux",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg",
    presets: [
      { id: "alma-102", name: "AlmaLinux 10.2", family: "AlmaLinux", templateValue: "AlmaLinux-10.2", description: "Enterprise RHEL Compatible" },
      { id: "alma-9", name: "AlmaLinux 9", family: "AlmaLinux", templateValue: "AlmaLinux-9", description: "Stable 9.x" },
      { id: "alma-8", name: "AlmaLinux 8", family: "AlmaLinux", templateValue: "AlmaLinux-8", description: "Legacy 8.x" },
    ],
  },
  {
    family: "Rocky Linux",
    icon: "https://cdn.simpleicons.org/rockylinux/10B981",
    presets: [
      { id: "rocky-9", name: "Rocky Linux 9", family: "Rocky Linux", templateValue: "Rocky-9", description: "Enterprise Linux 9" },
      { id: "rocky-8", name: "Rocky Linux 8", family: "Rocky Linux", templateValue: "Rocky-8", description: "Enterprise Linux 8" },
      { id: "rocky-97", name: "Rocky 9.7", family: "Rocky Linux", templateValue: "Rocky-9.7", description: "Point Release" },
    ],
  },
  {
    family: "CentOS",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/centos/centos-original.svg",
    presets: [
      { id: "centos-9", name: "CentOS 9 Stream", family: "CentOS", templateValue: "CentOS-9-Stream", description: "Upstream RHEL" },
      { id: "centos-7", name: "CentOS 7", family: "CentOS", templateValue: "CentOS-7", description: "Legacy" },
    ],
  },
  {
    family: "Alpine Linux",
    icon: "https://www.vectorlogo.zone/logos/alpinelinux/alpinelinux-icon.svg",
    presets: [
      { id: "alpine-319", name: "Alpine 3.19", family: "Alpine Linux", templateValue: "Alpine-3.19", description: "Ultra Lightweight" },
      { id: "alpine-318", name: "Alpine 3.18", family: "Alpine Linux", templateValue: "Alpine-3.18", description: "Minimal Resource" },
    ],
  },
  {
    family: "Fedora",
    icon: "https://cdn.simpleicons.org/fedora/3b82f6",
    presets: [
      { id: "fedora-40", name: "Fedora 40", family: "Fedora", templateValue: "Fedora-40", description: "Cutting Edge" },
      { id: "fedora-39", name: "Fedora 39", family: "Fedora", templateValue: "Fedora-39", description: "Stable" },
    ],
  },
  {
    family: "Arch Linux",
    icon: "https://cdn.simpleicons.org/archlinux/1793D1",
    presets: [
      { id: "arch-latest", name: "Arch Linux", family: "Arch Linux", templateValue: "ArchLinux", description: "Rolling Release" },
    ],
  },
  {
    family: "Windows Server",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg",
    presets: [
      { id: "win-2022", name: "Windows Server 2022", family: "Windows Server", templateValue: "Windows-Server-2022", description: "Standard Edition" },
      { id: "win-2019", name: "Windows Server 2019", family: "Windows Server", templateValue: "Windows-Server-2019", description: "Standard Edition" },
    ],
  },
  {
    family: "MikroTik",
    icon: "https://cdn.worldvectorlogo.com/logos/mikrotik.svg",
    presets: [
      { id: "mikrotik-chr", name: "MikroTik RouterOS CHR", family: "MikroTik", templateValue: "MikroTik-CHR", description: "Cloud Hosted Router" },
    ],
  },
  {
    family: "FreeBSD",
    icon: "https://cdn.simpleicons.org/freebsd/AB2B28",
    presets: [
      { id: "freebsd-14", name: "FreeBSD 14", family: "FreeBSD", templateValue: "FreeBSD-14", description: "BSD Unix" },
    ],
  },
];

/**
 * Returns the official OS logo URL based on the OS template string.
 */
export function getOsIconUrl(name?: string | null, isDark: boolean = false): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();

  if (lower.includes("ubuntu")) return "https://cdn.simpleicons.org/ubuntu/E95420";
  if (lower.includes("debian")) return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg";
  if (lower.includes("almalinux") || lower.includes("alma")) {
    return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg";
  }
  if (lower.includes("rocky")) return "https://cdn.simpleicons.org/rockylinux/10B981";
  if (lower.includes("centos")) {
    return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/centos/centos-original.svg";
  }
  if (lower.includes("alpine")) return "https://www.vectorlogo.zone/logos/alpinelinux/alpinelinux-icon.svg";
  if (lower.includes("fedora")) return "https://cdn.simpleicons.org/fedora/3b82f6";
  if (lower.includes("windows")) {
    return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg";
  }
  if (lower.includes("arch")) return "https://cdn.simpleicons.org/archlinux/1793D1";
  if (lower.includes("kali")) return "https://cdn.simpleicons.org/kalilinux/557C94";
  if (lower.includes("redhat") || lower.includes("rhel")) return "https://cdn.simpleicons.org/redhat/EE0000";
  if (lower.includes("suse") || lower.includes("opensuse")) return "https://cdn.simpleicons.org/opensuse/73BA25";
  if (lower.includes("oracle")) return "https://cdn.simpleicons.org/oracle/F80000";
  if (lower.includes("freebsd")) return "https://cdn.simpleicons.org/freebsd/AB2B28";
  if (lower.includes("mikrotik") || lower.includes("chr")) {
    return "https://cdn.worldvectorlogo.com/logos/mikrotik.svg";
  }

  return null;
}

/**
 * Formats a raw OS template filename/string into a clean human-readable name.
 * e.g. "debian-12-standard_12.7-1_amd64.tar.zst" -> "Debian 12"
 * e.g. "AlmaLinux-10.2" -> "AlmaLinux 10.2"
 * e.g. "Ubuntu-25.04" -> "Ubuntu 25.04"
 */
export function formatOsName(osTemplate?: string | null): string {
  if (!osTemplate) return "Unknown OS";
  
  // Clean Proxmox tarball filenames if needed
  const cleaned = osTemplate
    .split("/")
    .pop()!
    .replace(/\.tar\.(zst|gz|xz)$/, "")
    .split("_")[0]
    .replace(/-standard|-default|-systemd/g, "")
    .replace(/-/g, " ");

  return cleaned.trim() || osTemplate;
}
