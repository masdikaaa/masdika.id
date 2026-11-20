'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';

interface AdminCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function AdminCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: AdminCheckboxProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <label
      className={cn(
        'relative inline-flex items-center gap-2.5 select-none',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group',
        className,
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={cn(
          'w-5 h-5 rounded-md border transition-all flex items-center justify-center shrink-0',
          checked
            ? 'bg-cyan-400 border-cyan-400 text-slate-950 shadow-2xs shadow-cyan-500/20'
            : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 group-hover:border-cyan-500',
        )}
      >
        {checked && <CheckCircle className="w-3.5 h-3.5 text-slate-950" strokeWidth={3} />}
      </div>
      {label !== undefined && (
        <span className="text-xs text-slate-700 dark:text-zinc-300">{label}</span>
      )}
    </label>
  );
}
