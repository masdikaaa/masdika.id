"use client";

import { useUrlNumber } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { ShieldCheck, ShieldAlert, Plus, Trash2, RefreshCw, Server, Settings2, X, CheckCircle, Search, Info } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function FirewallsDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [vpsList, setVpsList] = useState<any[]>([]);
  const [loadingVps, setLoadingVps] = useState(true);
  
  const [selectedVpsId, setSelectedVpsId] = useState<number | null>(null);
  
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [firewallRules, setFirewallRules] = useState<any[]>([]);
  const [firewallLoading, setFirewallLoading] = useState(false);
  const [rulePage, setRulePage] = useUrlNumber("rulePage", 1);
  const RULES_PER_PAGE = 10;
  
  const [showFirewallModal, setShowFirewallModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [deletingRulePos, setDeletingRulePos] = useState<string | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Form states
  const [ruleType, setRuleType] = useState("in");
  const [ruleProto, setRuleProto] = useState("tcp");
  const [rulePort, setRulePort] = useState("");
  const [ruleSource, setRuleSource] = useState("");
  const [ruleComment, setRuleComment] = useState("");

  const fetchVpsList = async () => {
    try {
      const res = await fetch("/api/user/vps");
      const data = await res.json();
      if (Array.isArray(data)) {
        setVpsList(data);
        if (data.length > 0 && !selectedVpsId) {
          setSelectedVpsId(data[0].id);
        }
      }
    } catch (error) {
      toast.error("Failed to load VPS instances.");
    } finally {
      setLoadingVps(false);
    }
  };

  const fetchFirewallRules = async (vpsId: number) => {
    setFirewallLoading(true);
    try {
      const res = await fetch(`/api/user/vps/${vpsId}/firewall`);
      const data = await res.json();
      if (data.success) {
        setFirewallRules(data.rules || []);
        setRulePage((p) => Math.min(p, Math.max(1, Math.ceil((data.rules || []).length / RULES_PER_PAGE))));
      } else {
        toast.error(data.error || "Failed to load firewall rules");
        setFirewallRules([]);
      }
    } catch (e) {
      toast.error("An error occurred fetching rules.");
      setFirewallRules([]);
    } finally {
      setFirewallLoading(false);
    }
  };

  useEffect(() => {
    fetchVpsList();
  }, []);

  useEffect(() => {
    setSelectedRules([]);
    if (selectedVpsId) {
      fetchFirewallRules(selectedVpsId);
    } else {
      setFirewallRules([]);
    }
  }, [selectedVpsId]);



  useEffect(() => {
    if (editingRule) {
      setRuleType(editingRule.type || "in");
      setRuleProto(editingRule.proto || "");
      setRulePort(editingRule.dport ? editingRule.dport.replace(/:/g, '-') : "");
      setRuleSource(editingRule.source || "");
      setRuleComment(editingRule.comment || "");
    } else {
      setRuleType("in");
      setRuleProto("tcp");
      setRulePort("");
      setRuleSource("");
      setRuleComment("");
    }
  }, [editingRule, showFirewallModal]);

  const handleSaveFirewallRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVpsId) return;
    
    setIsSavingRule(true);
    try {
      const body = {
        action: "ACCEPT", // Support ACCEPT for now as in VPS details page
        type: ruleType,
        proto: ruleProto || undefined,
        dport: rulePort ? rulePort.replace(/-/g, ':') : undefined,
        source: ruleSource || undefined,
        comment: ruleComment || undefined,
        enable: 1,
      };

      const url = editingRule 
        ? `/api/user/vps/${selectedVpsId}/firewall/${editingRule.pos}`
        : `/api/user/vps/${selectedVpsId}/firewall`;
        
      const method = editingRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Firewall rule ${editingRule ? 'updated' : 'added'} successfully.`);
        setShowFirewallModal(false);
        fetchFirewallRules(selectedVpsId);
      } else {
        toast.error(data.error || "Failed to save firewall rule");
      }
    } catch (error) {
      toast.error("An error occurred saving rule.");
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteFirewallRule = async () => {
    if (!deletingRulePos || !selectedVpsId) return;
    setIsDeletingRule(true);
    try {
      const res = await fetch(`/api/user/vps/${selectedVpsId}/firewall/${deletingRulePos}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Firewall rule deleted.");
        fetchFirewallRules(selectedVpsId);
      } else {
        toast.error(data.error || "Failed to delete firewall rule");
      }
    } catch (e) {
      toast.error("An error occurred deleting rule.");
    } finally {
      setIsDeletingRule(false);
      setDeletingRulePos(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRules.length === 0 || !selectedVpsId) return;
    setBulkLoading(true);
    let successCount = 0;
    
    // Sort descending to avoid position shifts causing issues during deletion
    const sortedPos = [...selectedRules].sort((a, b) => parseInt(b) - parseInt(a));

    for (const pos of sortedPos) {
      try {
        const res = await fetch(`/api/user/vps/${selectedVpsId}/firewall`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pos })
        });
        if (res.ok) successCount++;
      } catch (e) {
        console.error(e);
      }
    }
    
    toast.success(`Deleted ${successCount} rule(s)`);
    setBulkLoading(false);
    setSelectedRules([]);
    fetchFirewallRules(selectedVpsId);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div className="space-y-6 pb-10" variants={containerVariants} initial="hidden" animate="visible">
      {/* Compact Unboxed Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Cloud Firewalls
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-800")}>
              <ShieldCheck className="w-3 h-3" /> Security Groups
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage inbound and outbound traffic rules across your VPS instances securely from one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              if(!selectedVpsId) return toast.error("Please select a VPS first");
              setEditingRule(null);
              setShowFirewallModal(true);
            }}
            disabled={!selectedVpsId}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={cn("rounded-2xl overflow-hidden relative border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
        <div className="p-4 sm:p-5">
          <div className={cn("border rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-6 flex items-start gap-3 sm:gap-3.5 transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-800 shadow-2xs")}>
            <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
            <div className="space-y-1 flex-1 min-w-0">
              <p className={cn("font-medium text-xs sm:text-sm", isDark ? "text-cyan-400" : "text-cyan-900")}>Global Firewall Management:</p>
              <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-cyan-200/90" : "text-slate-600")}>Select a VPS instance below to manage its security group rules. Changes take effect immediately without requiring a restart.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-6">
            <div className="w-full sm:w-1/2 md:w-1/3">
              <label className={cn("block text-xs sm:text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-700")}>Select Instance</label>
              {loadingVps ? (
                <div className={cn("w-full border rounded-xl px-4 py-3 text-sm flex items-center gap-2", isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-500" : "bg-slate-50/80 border-slate-200/90 text-slate-500")}>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading instances...
                </div>
              ) : (
                <Select
                  value={selectedVpsId?.toString() || ""}
                  onChange={(val) => setSelectedVpsId(parseInt(val))}
                  options={vpsList.length === 0 ? [] : vpsList.map(vps => ({
                    value: vps.id.toString(),
                    label: `${vps.hostname} (${vps.assignedIps?.[0]?.publicIp || vps.assignedIps?.[0]?.ipAddress || 'No IP'})`
                  }))}
                  placeholder={vpsList.length === 0 ? "No VPS instances found" : "Select a VPS Instance"}
                  className={cn("w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-white/[0.02] border-white/[0.08] text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-900 shadow-2xs")}
                />
              )}
            </div>
            
            <button
              onClick={() => {
                if(!selectedVpsId) return toast.error("Please select a VPS first");
                setEditingRule(null);
                setShowFirewallModal(true);
              }}
              disabled={!selectedVpsId}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Add Rule
            </button>
          </div>

          {!selectedVpsId && !loadingVps ? (
             <div className={cn("py-12 px-4 text-center border-t", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                  <ShieldAlert className="w-8 h-8 text-cyan-400" />
                </div>
                <h4 className={cn("text-lg font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Select a VPS</h4>
                <p className={cn("text-xs sm:text-sm max-w-sm mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>Please select a VPS instance from the dropdown above to manage its firewall rules.</p>
             </div>
          ) : (
            <div className={cn("overflow-x-auto w-full border-t pt-2 mt-4", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
              {firewallLoading ? (
                <div className="w-full flex items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
              ) : (() => {
                const totalRulePages = Math.ceil(firewallRules.length / RULES_PER_PAGE);
                const paginatedRules = firewallRules.slice((rulePage - 1) * RULES_PER_PAGE, rulePage * RULES_PER_PAGE);
                return (
                <div className="flex flex-col">
                  {selectedRules.length > 0 && (
                    <div className={cn("px-4 py-2.5 border flex flex-wrap items-center justify-between gap-4 mb-3 rounded-xl", isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200/90 bg-slate-50/80")}>
                      <div className="flex items-center gap-1.5 md:gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        <span className={cn("text-xs font-bold px-2 py-1 rounded-md mr-2", isDark ? "text-cyan-400 bg-cyan-500/10" : "text-cyan-700 bg-cyan-100")}>{selectedRules.length} selected</span>
                        <button onClick={handleBulkDelete} disabled={bulkLoading} className={cn("p-1.5 md:px-3 md:py-1.5 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 border", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200")}>
                          <Trash2 className="w-3.5 h-3.5" /> <span className="hidden md:inline">{selectedRules.length === firewallRules.length && firewallRules.length > 1 ? 'Delete All' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                  <table className={cn("w-full text-left text-sm min-w-[700px]", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <thead className={cn("text-xs uppercase rounded-t-xl border-b", isDark ? "text-zinc-400 bg-white/[0.02] border-white/[0.08]" : "text-slate-500 bg-slate-50/80 border-slate-200/90")}>
                      <tr>
                        <th className="py-3 pl-6 pr-2 w-14 rounded-tl-xl">
                          <button
                            type="button"
                            onClick={() => {
                              if (paginatedRules.length > 0 && selectedRules.length !== firewallRules.length) {
                                setSelectedRules(firewallRules.map((r, i) => r.pos?.toString() || i.toString()));
                              } else {
                                setSelectedRules([]);
                              }
                            }}
                            className={cn(
                              "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200",
                              firewallRules.length > 0 && selectedRules.length === firewallRules.length
                                ? (isDark ? "bg-cyan-400" : "bg-cyan-500") 
                                : (isDark ? "bg-white/[0.02] border border-white/[0.08] hover:border-cyan-400/50" : "bg-white border border-slate-300 hover:border-cyan-500 shadow-2xs")
                            )}
                          >
                            <CheckCircle className={cn("w-3.5 h-3.5", firewallRules.length > 0 && selectedRules.length === firewallRules.length ? (isDark ? "text-slate-950" : "text-white") : "text-transparent")} />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Protocol</th>
                      <th className="px-4 py-3 font-medium">Port Range</th>
                      <th className="px-4 py-3 font-medium">Source IP</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium rounded-tr-xl text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
                    {paginatedRules.map((rule: any, i: number) => {
                      const absoluteIndex = (rulePage - 1) * RULES_PER_PAGE + i;
                      const posStr = rule.pos?.toString() || absoluteIndex.toString();
                      return (
                      <tr key={i} className={cn("transition-colors group", isDark ? "bg-transparent hover:bg-white/[0.02]" : "bg-white hover:bg-slate-50/80")}>
                        <td className="py-4 pl-6 pr-2 align-middle">
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedRules.includes(posStr)) {
                                setSelectedRules(prev => [...prev, posStr]);
                              } else {
                                setSelectedRules(prev => prev.filter(p => p !== posStr));
                              }
                            }}
                            className={cn(
                              "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200",
                              selectedRules.includes(posStr)
                                ? (isDark ? "bg-cyan-400" : "bg-cyan-500") 
                                : (isDark ? "bg-white/[0.02] border border-white/[0.08] hover:border-cyan-400/50" : "bg-white border border-slate-300 hover:border-cyan-500 shadow-2xs")
                            )}
                          >
                            <CheckCircle className={cn("w-3.5 h-3.5", selectedRules.includes(posStr) ? (isDark ? "text-slate-950" : "text-white") : "text-transparent")} />
                          </button>
                        </td>
                        <td className={cn("px-4 py-4 font-medium", isDark ? "text-white" : "text-slate-900")}>
                          {rule.type === "in" ? (
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400"></span>Inbound</span>
                          ) : (
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Outbound</span>
                          )}
                        </td>
                        <td className="px-4 py-4">{rule.proto?.toUpperCase() || "ALL"}</td>
                        <td className="px-4 py-4 font-mono">{rule.dport ? rule.dport.replace(/:/g, '-') : "ALL"}</td>
                        <td className="px-4 py-4 font-mono">{rule.source || "0.0.0.0/0"}</td>
                        <td className="px-4 py-4">{rule.comment || "-"}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingRule({ ...rule, pos: rule.pos || absoluteIndex });
                                setShowFirewallModal(true);
                              }}
                              className={cn("p-1.5 rounded-lg transition-colors border shadow-2xs", isDark ? "bg-white/[0.02] hover:bg-cyan-500/10 border-white/[0.08] hover:border-cyan-500/20 text-zinc-400 hover:text-cyan-400" : "bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300 text-slate-500 hover:text-slate-800")}
                              title="Edit Rule"
                            >
                              <Settings2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingRulePos(rule.pos?.toString() || absoluteIndex.toString())}
                              className={cn("p-1.5 rounded-lg transition-colors border shadow-2xs", isDark ? "bg-white/[0.02] hover:bg-red-500/10 border-white/[0.08] hover:border-red-500/20 text-zinc-400 hover:text-red-400" : "bg-white hover:bg-red-50 border-slate-200/90 hover:border-red-200 text-slate-500 hover:text-red-600")}
                              title="Delete Rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                    {firewallRules.length === 0 && (
                      <tr>
                        <td colSpan={7} className={cn("px-4 py-12 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                          <div className={cn("w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-3", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50 border-slate-200/90")}>
                            <ShieldCheck className={cn("w-7 h-7", isDark ? "text-zinc-500" : "text-slate-400")} />
                          </div>
                          No firewall rules configured for this instance.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {totalRulePages > 1 && (
                  <div className={cn("p-4 border-t shrink-0", isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200/90 bg-slate-50/80")}>
                    <Pagination
                      currentPage={rulePage}
                      totalPages={totalRulePages}
                      onPageChange={setRulePage}
                    />
                  </div>
                )}
                </div>
                );
              })()}
            </div>
          )}
        </div>
      </motion.div>

      {/* Delete Rule Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingRulePos}
        onClose={() => setDeletingRulePos(null)}
        onConfirm={handleDeleteFirewallRule}
        title="Delete Firewall Rule"
        description="Are you sure you want to delete this firewall rule? Traffic matching this rule will no longer be allowed."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingRule}
      />

      {/* Add/Edit Firewall Rule Modal */}
      <AnimatePresence>
        {showFirewallModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 ", isDark ? "bg-black/60" : "bg-slate-900/40")}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <div className={cn("p-5 sm:p-6 border-b flex items-center justify-between relative overflow-hidden", isDark ? "border-white/[0.08]" : "border-slate-100")}>
                <h3 className={cn("text-lg sm:text-xl font-bold flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                  <ShieldCheck className="w-5 h-5 text-cyan-500" />
                  {editingRule ? 'Edit Firewall Rule' : 'Add Firewall Rule'}
                </h3>
                <button
                  onClick={() => setShowFirewallModal(false)}
                  className={cn("p-2 rounded-lg transition-colors relative z-10", isDark ? "text-zinc-400 hover:text-white hover:bg-white/[0.06]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFirewallRule} className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-700")}>Direction / Type</label>
                  <Select
                    value={ruleType}
                    onChange={setRuleType}
                    options={[
                      { value: "in", label: "Inbound (Incoming Traffic)" },
                      { value: "out", label: "Outbound (Outgoing Traffic)" }
                    ]}
                    placeholder="Select Direction"
                    className={cn("w-full border rounded-xl px-4 py-3 text-sm hover:border-cyan-500/50 focus:border-cyan-500 transition-colors", isDark ? "bg-white/[0.02] border-white/[0.08] text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-900 shadow-2xs")}
                  />
                </div>

                <div className="space-y-2">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-700")}>Protocol</label>
                  <Select
                    value={ruleProto}
                    onChange={setRuleProto}
                    options={[
                      { value: "tcp", label: "TCP" },
                      { value: "udp", label: "UDP" },
                      { value: "icmp", label: "ICMP" },
                      { value: "", label: "ALL" }
                    ]}
                    placeholder="Select Protocol"
                    className={cn("w-full border rounded-xl px-4 py-3 text-sm hover:border-cyan-500/50 focus:border-cyan-500 transition-colors", isDark ? "bg-white/[0.02] border-white/[0.08] text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-900 shadow-2xs")}
                  />
                </div>

                <div className="space-y-2">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-700")}>Port Range</label>
                  <input
                    type="text"
                    value={rulePort}
                    onChange={(e) => setRulePort(e.target.value)}
                    placeholder="e.g. 22, 80, 443, 8000:9000 (leave blank for ALL)"
                    className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.02] border-white/[0.08] text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-900")}
                  />
                </div>

                <div className="space-y-2">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-700")}>Source IP / CIDR</label>
                  <input
                    type="text"
                    value={ruleSource}
                    onChange={(e) => setRuleSource(e.target.value)}
                    placeholder="e.g. 192.168.1.1 or 10.0.0.0/24 (leave blank for 0.0.0.0/0)"
                    className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.02] border-white/[0.08] text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-900")}
                  />
                </div>

                <div className="space-y-2">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-700")}>Description</label>
                  <input
                    type="text"
                    value={ruleComment}
                    onChange={(e) => setRuleComment(e.target.value)}
                    placeholder="e.g. Allow SSH from Home"
                    className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.02] border-white/[0.08] text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-900")}
                  />
                </div>

                <div className={cn("pt-4 flex items-center justify-end gap-3 border-t mt-6", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                  <button
                    type="button"
                    onClick={() => setShowFirewallModal(false)}
                    className={cn("px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors border", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]" : "border-slate-200/90 text-slate-700 hover:bg-slate-100")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingRule}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-2xs"
                  >
                    {isSavingRule ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {isSavingRule ? 'Saving...' : 'Save Rule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}