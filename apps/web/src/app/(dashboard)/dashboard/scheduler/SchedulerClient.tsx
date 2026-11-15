"use client";

import { useState, useMemo } from "react";
import { Clock, Server, Save, Calendar, Power, RefreshCw, ShieldCheck, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Select } from "@/components/ui/Select";

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

export default function SchedulerClient({ vpsList }: { vpsList: any[] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [schedules, setSchedules] = useState<Record<string, any>>(
    vpsList.reduce((acc, vps) => {
      acc[vps.id] = vps.schedule || {
        enabled: false,
        monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false,
        startTime: "08:00", stopTime: "17:00", timezone: "Asia/Jakarta"
      };
      return acc;
    }, {})
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [confirmModal, setConfirmModal] = useState<{ vpsId: number, enable: boolean } | null>(null);
  const [selectedVpsId, setSelectedVpsId] = useState<number>(vpsList[0]?.id);
  const [vpsStatuses, setVpsStatuses] = useState<Record<number, string>>(
    vpsList.reduce((acc, vps) => { acc[vps.id] = vps.status; return acc; }, {} as Record<number, string>)
  );

  const handleSave = async (vpsId: number, overrideSchedule?: any) => {
    setLoading(prev => ({ ...prev, [vpsId]: true }));
    try {
      const schedule = overrideSchedule || schedules[vpsId];
      const res = await fetch("/api/dashboard/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId, schedule })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.action === 'STARTED') {
          setVpsStatuses(prev => ({ ...prev, [vpsId]: 'RUNNING' }));
          toast.success(`Schedule saved & VPS started!`);
        } else if (data.action === 'STOPPED') {
          setVpsStatuses(prev => ({ ...prev, [vpsId]: 'STOPPED' }));
          toast.success(`Schedule saved & VPS stopped!`);
        } else {
          toast.success(`Schedule saved for ${vpsList.find(v => v.id === vpsId)?.hostname}`);
        }
      } else {
        toast.error(data.error || "Failed to save schedule");
      }
    } catch (e) {
      toast.error("Failed to save schedule");
    } finally {
      setLoading(prev => ({ ...prev, [vpsId]: false }));
    }
  };

  const updateSchedule = (vpsId: number, field: string, value: any) => {
    setSchedules(prev => ({
      ...prev,
      [vpsId]: { ...prev[vpsId], [field]: value }
    }));
  };

  const activeScheduleCount = useMemo(
    () => Object.values(schedules).filter((s: any) => s?.enabled).length,
    [schedules]
  );
  const runningVpsCount = useMemo(
    () => Object.values(vpsStatuses).filter((st) => st === "RUNNING").length,
    [vpsStatuses]
  );

  return (
    <div className="w-full space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Auto Scheduler
            </h1>
            <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Clock className="w-3 h-3" /> Cost Optimizer
            </span>
          </div>
          <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-600")}>
            Schedule your VPS instances to turn on and off automatically according to your operational hours.
          </p>
        </div>
      </div>

      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cn("rounded-2xl border p-5 transition-colors", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Eligible Instances
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>{vpsList.length}</span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>{runningVpsCount} running</span>
          </div>
          <p className={cn("text-xs mt-2.5", isDark ? "text-zinc-500" : "text-slate-500")}>
            Cloud VPS instances available for scheduling.
          </p>
        </div>

        <div className={cn("rounded-2xl border p-5 transition-colors", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Active Schedules
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>{activeScheduleCount}</span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>/ {vpsList.length} enabled</span>
          </div>
          <p className={cn("text-xs mt-2.5", isDark ? "text-zinc-500" : "text-slate-500")}>
            Automated power-on &amp; power-off rules.
          </p>
        </div>

        <div className={cn("rounded-2xl border p-5 transition-colors", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Scheduler Timezone
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>WIB</span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>Asia/Jakarta (UTC+7)</span>
          </div>
          <p className={cn("text-xs mt-2.5", isDark ? "text-zinc-500" : "text-slate-500")}>
            Resources remain reserved and billed hourly.
          </p>
        </div>
      </div>

      {vpsList.length === 0 ? (
        <div className={cn("border rounded-2xl p-12 text-center", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
            <Server className="w-7 h-7" />
          </div>
          <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-slate-900")}>No VPS Found</h3>
          <p className={cn("text-sm max-w-md mx-auto mt-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>Deploy a Cloud VPS instance first to configure automated start and stop schedules.</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {vpsList.length > 1 && (
            <div className={cn("p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
              <div>
                <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>Select VPS Instance</h3>
                <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>Choose the server you want to schedule.</p>
              </div>
              <div className="w-full sm:w-64">
                <Select 
                  value={selectedVpsId} 
                  onChange={(val) => setSelectedVpsId(Number(val))}
                  options={vpsList.map(v => ({ value: v.id, label: `${v.hostname} (${v.assignedIps?.[0]?.ipAddress || 'No IP'})` }))}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:gap-5">
            {vpsList.filter(v => v.id === selectedVpsId).map(vps => {
              const sched = schedules[vps.id];
              const isOnline = vpsStatuses[vps.id] === 'RUNNING';
              return (
                <div key={vps.id} className={cn("border rounded-2xl p-5 transition-all", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
                  {/* Header: VPS Info + Status + Toggle */}
                  <div className={cn("flex items-center justify-between gap-3 mb-5 pb-4 sm:pb-5 border-b", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                      <div className={cn("w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-slate-50/80 border-slate-200/90")}>
                        <Server className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn("font-bold text-sm sm:text-base truncate", isDark ? "text-white" : "text-slate-900")}>{vps.hostname}</h3>
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shrink-0",
                            isOnline
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border border-red-500/30"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <p className={cn("text-xs font-mono mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>{vps.assignedIps?.[0]?.ipAddress || "No IP"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmModal({ vpsId: vps.id, enable: !sched.enabled })}
                      className={cn(
                        "shrink-0 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2",
                        sched.enabled ? "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm" : (isDark ? "bg-[#111115] border border-white/[0.08] text-zinc-400 hover:text-white" : "bg-slate-50/80 border border-slate-200/90 text-slate-500 hover:text-slate-700")
                      )}
                    >
                      <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{sched.enabled ? "Enabled" : "Disabled"}</span>
                    </button>
                  </div>

                  {/* Schedule Config */}
                  <div className={cn("space-y-5 transition-all duration-300", !sched.enabled && "opacity-40 pointer-events-none select-none")}>
                    {/* Time Inputs */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-5">
                      <div className="space-y-2">
                        <label className={cn("text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2", isDark ? "text-zinc-300" : "text-slate-600")}>
                          <Clock className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                          <span>Start Time</span>
                        </label>
                        <input
                          type="time"
                          value={sched.startTime}
                          onChange={e => updateSchedule(vps.id, "startTime", e.target.value)}
                          className={cn("w-full border rounded-xl px-3 py-2.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 transition-all", isDark ? "bg-[#111115] border-white/[0.08] text-white focus:border-cyan-500 focus:ring-cyan-500" : "bg-slate-50/80 border-slate-200/90 text-slate-900 focus:border-cyan-500 focus:ring-cyan-500")}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={cn("text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2", isDark ? "text-zinc-300" : "text-slate-600")}>
                          <Power className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                          <span>Stop Time</span>
                        </label>
                        <input
                          type="time"
                          value={sched.stopTime}
                          onChange={e => updateSchedule(vps.id, "stopTime", e.target.value)}
                          className={cn("w-full border rounded-xl px-3 py-2.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 transition-all", isDark ? "bg-[#111115] border-white/[0.08] text-white focus:border-cyan-500 focus:ring-cyan-500" : "bg-slate-50/80 border-slate-200/90 text-slate-900 focus:border-cyan-500 focus:ring-cyan-500")}
                        />
                      </div>
                    </div>

                    {/* Active Days */}
                    <div className="space-y-2.5">
                      <label className={cn("text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2", isDark ? "text-zinc-300" : "text-slate-600")}>
                        <Calendar className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                        <span>Active Days</span>
                      </label>
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {DAYS.map(day => (
                          <button
                            key={day.key}
                            onClick={() => updateSchedule(vps.id, day.key, !sched[day.key as keyof typeof sched])}
                            className={cn(
                              "py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all border text-center cursor-pointer",
                              sched[day.key as keyof typeof sched] 
                                ? (isDark ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/40 font-bold" : "bg-cyan-50 text-cyan-900 border-cyan-500 font-bold") 
                                : (isDark ? "bg-[#111115] text-zinc-400 border-white/[0.08] hover:border-white/[0.16]" : "bg-slate-50/80 text-slate-600 border-slate-200/90 hover:border-slate-300")
                            )}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className={cn("pt-4 sm:pt-5 mt-4 sm:mt-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                      <p className={cn("text-[11px] flex items-center gap-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        Dedicated resources remain reserved on the hypervisor and continue hourly billing.
                      </p>
                      <button
                        onClick={() => handleSave(vps.id)}
                        disabled={loading[vps.id]}
                        className="px-4 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 shrink-0"
                      >
                        {loading[vps.id] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Schedule
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className={cn("border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}>
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className={cn("w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border", confirmModal.enable ? "bg-cyan-500/10 border-cyan-500/20" : "bg-red-500/10 border-red-500/20")}>
                <Power className={cn("w-5 h-5 sm:w-6 sm:h-6", confirmModal.enable ? "text-cyan-400" : "text-red-400")} />
              </div>
              <div>
                <h3 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                  {confirmModal.enable ? "Enable Auto Scheduler" : "Disable Auto Scheduler"}
                </h3>
                <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  {confirmModal.enable ? "Cost Optimizer will be activated." : "Server will run 24/7."}
                </p>
              </div>
            </div>
            <p className={cn("text-xs sm:text-sm mb-5 sm:mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
              {confirmModal.enable 
                ? "Are you sure you want to enable the Auto Scheduler? Your server will automatically start and stop based on the schedule you set." 
                : "Are you sure you want to disable the Auto Scheduler? Your server will ignore all schedules and you will be charged the standard hourly rate continuously."}
            </p>
            <div className="flex items-center justify-end gap-2.5 sm:gap-3">
              <button onClick={() => setConfirmModal(null)}
                className={cn("px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors", isDark ? "bg-white/[0.02] text-zinc-300 border-white/[0.08] hover:bg-white/[0.06]" : "bg-slate-50/80 text-slate-600 border-slate-200/90 hover:bg-slate-100")}>
                Cancel
              </button>
              <button onClick={() => {
                  const newSchedule = { ...schedules[confirmModal.vpsId], enabled: confirmModal.enable };
                  updateSchedule(confirmModal.vpsId, "enabled", confirmModal.enable);
                  handleSave(confirmModal.vpsId, newSchedule);
                  setConfirmModal(null);
                }}
                className={cn("px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm",
                  confirmModal.enable ? "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950" : "bg-red-500 hover:bg-red-600 text-white"
                )}>
                Yes, {confirmModal.enable ? "Enable" : "Disable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}