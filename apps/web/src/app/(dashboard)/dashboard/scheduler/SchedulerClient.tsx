"use client";

import { useState } from "react";
import { Clock, Server, Save, Calendar, Power, RefreshCw, Info } from "lucide-react";
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

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Hero Header */}
      <div className={cn("relative overflow-hidden rounded-2xl sm:rounded-3xl border p-5 sm:p-6 md:p-8 shadow-md group", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        
        <div className="relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-3 sm:mb-4 tracking-wide", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
            <Clock className="w-3 h-3" /> Cost Optimizer
          </div>
          <h1 className={cn("text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1.5 sm:mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Auto <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Scheduler</span>
          </h1>
          <p className={cn("text-xs sm:text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Schedule your VPS instances to turn on and off automatically, saving costs on hourly billing.</p>
        </div>
      </div>

      <div className={cn("border rounded-xl p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
        <Info className={cn("w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5", isDark ? "text-cyan-500" : "text-cyan-600")} />
        <p className={cn("text-xs sm:text-sm font-medium leading-relaxed", isDark ? "text-cyan-200" : "text-cyan-800")}>
          The Auto Scheduler automatically starts and stops your VPS according to your set schedule. You will not be charged for CPU and RAM while your VPS is stopped. Storage costs still apply.
        </p>
      </div>

      {vpsList.length === 0 ? (
        <div className={cn("border rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-md", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn("w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-slate-50")}>
            <Server className={cn("w-8 h-8 sm:w-10 sm:h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-400")} />
          </div>
          <h3 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No VPS Found</h3>
          <p className={cn("text-sm max-w-md mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>Deploy a VPS instance first to configure schedules.</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {vpsList.length > 1 && (
            <div className={cn("p-4 sm:p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
              <div>
                <h3 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Select VPS Instance</h3>
                <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Choose the server you want to schedule.</p>
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

          <div className="grid gap-4 sm:gap-6">
            {vpsList.filter(v => v.id === selectedVpsId).map(vps => {
              const sched = schedules[vps.id];
              const isOnline = vpsStatuses[vps.id] === 'RUNNING';
              return (
                <div key={vps.id} className={cn("border rounded-2xl p-4 sm:p-6 transition-all shadow-md", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                  {/* Header: VPS Info + Status + Toggle */}
                  <div className={cn("flex items-center justify-between gap-3 mb-5 sm:mb-6 pb-5 sm:pb-6 border-b", isDark ? "border-slate-800" : "border-slate-100")}>
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                        <Server className={cn("w-5 h-5 sm:w-6 sm:h-6", isDark ? "text-cyan-500" : "text-cyan-600")} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn("font-bold text-base sm:text-lg truncate", isDark ? "text-white" : "text-slate-900")}>{vps.hostname}</h3>
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
                        <p className={cn("text-xs sm:text-sm font-mono mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>{vps.assignedIps?.[0]?.ipAddress || "No IP"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmModal({ vpsId: vps.id, enable: !sched.enabled })}
                      className={cn(
                        "shrink-0 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2",
                        sched.enabled ? (isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm") : (isDark ? "bg-[#060b14] border border-slate-800 text-zinc-400 hover:text-white" : "bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700")
                      )}
                    >
                      <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{sched.enabled ? "Enabled" : "Disabled"}</span>
                    </button>
                  </div>

                  {/* Schedule Config */}
                  <div className={cn("space-y-5 sm:space-y-6 transition-all duration-300", !sched.enabled && "opacity-40 pointer-events-none select-none")}>
                    {/* Time Inputs */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                      <div className="space-y-2">
                        <label className={cn("text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2", isDark ? "text-zinc-300" : "text-slate-600")}>
                          <Clock className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isDark ? "text-cyan-500" : "text-cyan-600")} />
                          <span>Start Time</span>
                        </label>
                        <input
                          type="time"
                          value={sched.startTime}
                          onChange={e => updateSchedule(vps.id, "startTime", e.target.value)}
                          className={cn("w-full border rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm focus:outline-none focus:ring-2 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white focus:ring-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:ring-cyan-500")}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={cn("text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2", isDark ? "text-zinc-300" : "text-slate-600")}>
                          <Power className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isDark ? "text-red-400" : "text-red-600")} />
                          <span>Stop Time</span>
                        </label>
                        <input
                          type="time"
                          value={sched.stopTime}
                          onChange={e => updateSchedule(vps.id, "stopTime", e.target.value)}
                          className={cn("w-full border rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm focus:outline-none focus:ring-2 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white focus:ring-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:ring-cyan-500")}
                        />
                      </div>
                    </div>

                    {/* Active Days */}
                    <div className="space-y-2.5">
                      <label className={cn("text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2", isDark ? "text-zinc-300" : "text-slate-600")}>
                        <Calendar className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isDark ? "text-cyan-500" : "text-cyan-600")} />
                        <span>Active Days</span>
                      </label>
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {DAYS.map(day => (
                          <button
                            key={day.key}
                            onClick={() => updateSchedule(vps.id, day.key, !sched[day.key as keyof typeof sched])}
                            className={cn(
                              "py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all border text-center",
                              sched[day.key as keyof typeof sched] ? (isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-cyan-50 text-cyan-700 border-cyan-200") : (isDark ? "bg-[#060b14] text-zinc-500 border-slate-800 hover:border-slate-700" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")
                            )}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className={cn("pt-4 sm:pt-6 mt-4 sm:mt-6 border-t flex justify-end", isDark ? "border-slate-800" : "border-slate-100")}>
                      <button
                        onClick={() => handleSave(vps.id)}
                        disabled={loading[vps.id]}
                        className={cn("px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center gap-2", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950" : "bg-cyan-600 hover:bg-cyan-700 text-white")}
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
          <div className={cn("border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className={cn("w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0", confirmModal.enable ? "bg-cyan-500/10" : "bg-red-500/10")}>
                <Power className={cn("w-5 h-5 sm:w-6 sm:h-6", confirmModal.enable ? "text-cyan-500" : "text-red-500")} />
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
                className={cn("px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/5 hover:bg-white/10 transition-colors", isDark ? "text-zinc-300" : "text-slate-500")}>
                Cancel
              </button>
              <button onClick={() => {
                  const newSchedule = { ...schedules[confirmModal.vpsId], enabled: confirmModal.enable };
                  updateSchedule(confirmModal.vpsId, "enabled", confirmModal.enable);
                  handleSave(confirmModal.vpsId, newSchedule);
                  setConfirmModal(null);
                }}
                className={cn("px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm hover:shadow",
                  confirmModal.enable ? (isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950" : "bg-cyan-600 hover:bg-cyan-700 text-white") : "bg-red-500 hover:bg-red-600 text-white"
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