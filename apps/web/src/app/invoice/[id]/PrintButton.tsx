'use client';

import { Printer } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

export default function PrintButton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button 
      onClick={() => window.print()}
      className={cn(
        "flex items-center gap-2 font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm",
        isDark
          ? "bg-zinc-800 hover:bg-zinc-700 text-white shadow-black/10"
          : "bg-slate-900 hover:bg-slate-700 text-white"
      )}
    >
      <Printer className="w-4 h-4" />
      Print / Download PDF
    </button>
  );
}
