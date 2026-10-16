"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { RefreshCw, CheckCircle, Bell, ArrowLeft, ChevronLeft, Cpu, MemoryStick, HardDrive, AlertTriangle, Settings, Info } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AlertRule {
  metric: string;
  threshold: number;
  isEnabled: boolean;
  notifyEmails: string;
}

interface ConfigureAlertsClientProps {
  type: string;
  id: number;
  resourceName: string;
  initialRules: any[];
}

export default function ConfigureAlertsClient({ type, id, resourceName, initialRules }: ConfigureAlertsClientProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [isSavingAlerts, setIsSavingAlerts] = useState(false);

  useEffect(() => {
    const defaultRules = [
      { metric: "CPU", threshold: 90, isEnabled: false, notifyEmails: "" },
      { metric: "RAM", threshold: 90, isEnabled: false, notifyEmails: "" },
      { metric: "DISK", threshold: 90, isEnabled: false, notifyEmails: "" }
    ];

    const configuredRules = defaultRules.map(p => {
      const found = initialRules.find((r: any) => r.metric === p.metric);
      return found ? { ...p, threshold: found.threshold, isEnabled: found.isEnabled, notifyEmails: found.notifyEmails || "" } : p;
    });

    setAlertRules(configuredRules);
  }, [initialRules]);

  const handleSaveAlerts = async () => {
    // Frontend validation: if a rule is enabled, it must have at least one valid email
    for (const rule of alertRules) {
      if (rule.isEnabled && (!rule.notifyEmails || rule.notifyEmails.trim() === "")) {
        toast.error(`Please provide an email address for ${rule.metric} alerts.`);
        return;
      }
    }

    try {
      setIsSavingAlerts(true);
      const res = await fetch(`/api/user/${type}/${id}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: alertRules })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Alert configurations saved successfully");
      } else {
        toast.error(data.error || "Failed to update alerts");
      }
    } catch (err) {
      toast.error("An error occurred while saving alerts");
    } finally {
      setIsSavingAlerts(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">

      {/* Back Button */}
      <div className="flex items-center">
        <Link
          href="/dashboard/alerts"
          className={cn(
            "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border shadow-sm",
            isDark 
              ? "text-zinc-400 hover:text-white bg-[#0b1322] hover:bg-[#111c33] border-slate-800 hover:border-cyan-500/40" 
              : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Alerts
        </Link>
      </div>

      {/* Hero Header */}
      <div className={cn("relative overflow-hidden rounded-3xl border p-6 md:p-8 group shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        

        <div className="relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
            <Settings className="w-3 h-3" /> Configuration
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Alerts for {resourceName}
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Receive email notifications when resource usage exceeds the defined threshold.</p>
        </div>
      </div>

      <div className={cn("border rounded-3xl shadow-sm p-6 sm:p-8 relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="space-y-6 relative z-10">
          {alertRules.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin" />
            </div>
          ) : (
            <>
              <div className={cn("p-4 border rounded-xl flex items-start sm:items-center gap-3 text-sm", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
                <Info className={cn("w-5 h-5 shrink-0 mt-0.5 sm:mt-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                <p className="font-medium text-xs sm:text-sm">Alert checks are performed every 5 minutes by the monitoring agent.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {alertRules.map((rule, index) => (
                  <div key={rule.metric} className={cn("border rounded-2xl p-6 relative overflow-hidden transition-all flex flex-col h-full", isDark ? "bg-[#060b14] border-slate-800 hover:border-cyan-500/30" : "bg-white border-slate-200/90 shadow-sm hover:border-cyan-400")}>

                    <div className="relative z-10 flex-1 flex flex-col">
                      {/* Toggle & Title */}
                      <div className={cn("flex items-center justify-between mb-6 pb-6 border-b", isDark ? "border-slate-800" : "border-slate-100")}>
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2.5 rounded-xl border", rule.isEnabled ? (isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-slate-100 text-cyan-700 border-slate-200") : (isDark ? "bg-white/5 text-zinc-500 border-white/5" : "bg-slate-50 text-slate-400 border-slate-200"))}>
                            {rule.metric === "CPU" && <Cpu className="w-5 h-5" />}
                            {rule.metric === "RAM" && <MemoryStick className="w-5 h-5" />}
                            {rule.metric === "DISK" && <HardDrive className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-900")}>{rule.metric}</h4>
                            <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>{rule.isEnabled ? "Active" : "Disabled"}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={rule.isEnabled}
                            onChange={(e) => {
                              const newRules = [...alertRules];
                              newRules[index].isEnabled = e.target.checked;
                              setAlertRules(newRules);
                            }}
                          />
                          <div className={cn("w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500", isDark ? "bg-white/10" : "bg-slate-200")}></div>
                        </label>
                      </div>

                      {/* Sliders & Inputs */}
                      <div className={cn("space-y-6 transition-opacity duration-300 flex-1 flex flex-col", rule.isEnabled ? "opacity-100" : "opacity-40 pointer-events-none")}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Alert Threshold (%)</label>
                            <span className={cn("font-bold px-2 py-0.5 rounded text-sm border", isDark ? "text-cyan-400 bg-cyan-950/40 border-cyan-800/40" : "text-cyan-700 bg-slate-50 border-slate-200")}>{rule.threshold}%</span>
                          </div>
                          <input
                            type="range"
                            min="1" max="100"
                            value={rule.threshold}
                            onChange={(e) => {
                              const newRules = [...alertRules];
                              newRules[index].threshold = parseInt(e.target.value);
                              setAlertRules(newRules);
                            }}
                            className={cn("w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500", isDark ? "bg-black/40" : "bg-slate-200")}
                          />
                        </div>

                        <div className="space-y-2 mt-auto pt-4">
                          <label className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Notification Emails</label>
                          <input
                            type="text"
                            placeholder="e.g. ops@company.com"
                            value={rule.notifyEmails}
                            onChange={(e) => {
                              const newRules = [...alertRules];
                              newRules[index].notifyEmails = e.target.value;
                              setAlertRules(newRules);
                            }}
                            className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#0b1322] border-slate-800 text-white placeholder:text-zinc-600" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400")}
                          />
                          <p className={cn("text-xs mt-2", isDark ? "text-white/40" : "text-slate-400")}>
                            Separate multiple emails with commas. <strong className="text-cyan-400 font-medium">Required if active.</strong>
                          </p>  </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={cn("mt-8 pt-6 border-t flex justify-end gap-4", isDark ? "border-slate-800" : "border-slate-200")}>
                <Link
                  href="/dashboard/alerts"
                  className={cn("px-6 py-3 border rounded-xl font-medium transition-all inline-flex items-center", isDark ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-white" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}
                >
                  Cancel
                </Link>
                <button
                  onClick={handleSaveAlerts}
                  disabled={isSavingAlerts}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingAlerts ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  {isSavingAlerts ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}