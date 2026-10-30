/**
 * User Presence and Last Seen formatting utilities in English.
 */

export interface LastSeenInfo {
  label: string;          // e.g. "Online", "5m ago", "2h ago", "Yesterday", "Oct 24, 2026", "Never"
  fullText: string;       // e.g. "Active right now", "Last active 5 minutes ago", "Last active on Oct 24, 2026, 01:45 PM"
  isOnline: boolean;      // true if active within last 5 minutes
  relativeTime: string;   // e.g. "Active now", "5m ago", "2h ago", "Yesterday", "Never"
  dateFormatted?: string; // e.g. "Oct 24, 2026, 01:45 PM"
}

export function isUserOnline(dateInput?: string | Date | null): boolean {
  if (!dateInput) return false;
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return false;
  const diffMs = Date.now() - date.getTime();
  // 5 minutes threshold (dashboard pings presence every 60s)
  return diffMs >= 0 && diffMs < 5 * 60 * 1000;
}

export function formatLastSeen(dateInput?: string | Date | null): LastSeenInfo {
  if (!dateInput) {
    return {
      label: "Never",
      fullText: "No activity recorded yet",
      isOnline: false,
      relativeTime: "Never",
    };
  }

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return {
      label: "Never",
      fullText: "Invalid activity timestamp",
      isOnline: false,
      relativeTime: "Never",
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  const dateFormatted = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Active within last 5 minutes -> Online
  if (diffMin < 5) {
    return {
      label: "Online",
      fullText: "Active right now",
      isOnline: true,
      relativeTime: "Active now",
      dateFormatted,
    };
  }

  if (diffMin < 60) {
    return {
      label: `${diffMin}m ago`,
      fullText: `Last active ${diffMin} minute${diffMin === 1 ? "" : "s"} ago (${dateFormatted})`,
      isOnline: false,
      relativeTime: `${diffMin}m ago`,
      dateFormatted,
    };
  }

  if (diffHours < 24) {
    return {
      label: `${diffHours}h ago`,
      fullText: `Last active ${diffHours} hour${diffHours === 1 ? "" : "s"} ago (${dateFormatted})`,
      isOnline: false,
      relativeTime: `${diffHours}h ago`,
      dateFormatted,
    };
  }

  if (diffDays === 1) {
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return {
      label: "Yesterday",
      fullText: `Last active yesterday at ${timeStr} (${dateFormatted})`,
      isOnline: false,
      relativeTime: "Yesterday",
      dateFormatted,
    };
  }

  if (diffDays < 7) {
    return {
      label: `${diffDays}d ago`,
      fullText: `Last active ${diffDays} days ago (${dateFormatted})`,
      isOnline: false,
      relativeTime: `${diffDays}d ago`,
      dateFormatted,
    };
  }

  const shortDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });

  return {
    label: shortDate,
    fullText: `Last active on ${dateFormatted}`,
    isOnline: false,
    relativeTime: shortDate,
    dateFormatted,
  };
}

