import { CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  switch (status) {
    case 'PAID':
      return (
        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap", className)}>
          <CheckCircle className="w-3 h-3" /> Paid
        </span>
      );
    case 'PENDING':
      return (
        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap", className)}>
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
    case 'FAILED':
    case 'CANCELED':
    case 'EXPIRED':
      return (
        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap", className)}>
          <XCircle className="w-3 h-3" /> {status}
        </span>
      );
    default:
      return (
        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 whitespace-nowrap", className)}>
          {status}
        </span>
      );
  }
}
