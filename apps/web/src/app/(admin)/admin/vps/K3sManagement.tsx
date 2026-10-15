import { useState, useEffect } from "react";
import { Server, Trash2, RefreshCw, XCircle, CheckCircle } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function K3sManagement() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchClusters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vps/k3s");
      if (res.ok) {
        const data = await res.json();
        setClusters(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch K3s clusters");
    } finally {
      setLoading(false);
    }
  };

  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedClusters, setSelectedClusters] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState<number[]>([]);

  useEffect(() => {
    fetchClusters();
  }, []);


  const handleBulkDelete = async () => {
    setDeletingId(showDeleteModal[0]);
    let successCount = 0;
    for (const id of showDeleteModal) {
      try {
        const res = await fetch(`/api/admin/vps/k3s/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      } catch (error) {
        console.error("Failed to delete cluster:", error);
      }
    }

    setDeletingId(null);
    setShowDeleteModal([]);
    setSelectedClusters([]);
    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} cluster(s)`);
      fetchClusters();
    } else {
      toast.error("Failed to delete selected clusters");
    }
  };

  const toggleSelectAll = () => {
    if (selectedClusters.length === clusters.length && clusters.length > 0) {
      setSelectedClusters([]);
    } else {
      setSelectedClusters(clusters.map(c => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedClusters.includes(id)) {
      setSelectedClusters(selectedClusters.filter(cId => cId !== id));
    } else {
      setSelectedClusters([...selectedClusters, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-xl font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>Managed K3s Clusters</h2>
          <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Monitor and manage all client Kubernetes clusters.</p>
        </div>
        <div className="flex gap-2">
          {selectedClusters.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(selectedClusters)}
              className={cn("px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500 hover:text-white transition-colors", isDark ? "text-red-400" : "text-red-700")}
            >
              Delete Selected ({selectedClusters.length})
            </button>
          )}
          <button
            onClick={fetchClusters}
            disabled={loading}
            className={cn("p-2 border rounded-xl hover:text-white hover:bg-white/10 transition-colors", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}
            title="Refresh"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className={cn("bg-[#0f172a] border rounded-2xl overflow-hidden relative", isDark ? "border-white/10" : "border-slate-200")}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className={cn("bg-white/5 border-b", isDark ? "border-white/10" : "border-slate-200")}>
                <th className="p-4 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center transition-colors",
                      selectedClusters.length > 0
                        ? "bg-cyan-500 text-[#0f172a]"
                        : "bg-black/50 border border-white/10 text-transparent hover:border-cyan-500/50"
                    )}
                  >
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </th>
                <th className={cn("p-4 text-sm font-semibold whitespace-nowrap", isDark ? "text-zinc-300" : "text-slate-600")}>
                  <div className="pl-[52px]">ID / Name</div>
                </th>
                <th className={cn("p-4 text-sm font-semibold whitespace-nowrap", isDark ? "text-zinc-300" : "text-slate-600")}>Client</th>
                <th className={cn("p-4 text-sm font-semibold whitespace-nowrap", isDark ? "text-zinc-300" : "text-slate-600")}>Status</th>
                <th className={cn("p-4 text-sm font-semibold whitespace-nowrap", isDark ? "text-zinc-300" : "text-slate-600")}>Nodes</th>
                <th className={cn("p-4 text-sm font-semibold text-right whitespace-nowrap", isDark ? "text-zinc-300" : "text-slate-600")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {clusters.map((cluster) => (
                <tr key={cluster.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                  <td className="p-4">
                    <button
                      onClick={() => toggleSelect(cluster.id)}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center transition-colors",
                        selectedClusters.includes(cluster.id)
                          ? "bg-cyan-500 text-[#0f172a]"
                          : "bg-black/50 border border-white/10 text-transparent hover:border-cyan-500/50"
                      )}
                    >
                      <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                        <img referrerPolicy="no-referrer" src="https://cdn.simpleicons.org/kubernetes/06b6d4" alt="Kubernetes" className="w-6 h-6" loading="lazy" decoding="async" />
                      </div>
                      <div>
                        <div className={cn("font-bold whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>{cluster.name}</div>
                        <div className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
                          <span className="whitespace-nowrap shrink-0">ID: {cluster.id}</span>
                          <span className="text-zinc-600 shrink-0">•</span>
                          <span className={cn("font-medium whitespace-nowrap shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")}>Kubernetes {cluster.version || ""}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={cn("text-sm font-medium whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>{cluster.user.name}</div>
                    <div className="text-xs text-zinc-500 whitespace-nowrap">{cluster.user.email}</div>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg border",
                      cluster.status === "RUNNING" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        cluster.status === "FAILED" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}>
                      {cluster.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>{cluster.nodes?.length || 0} Node(s)</div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setShowDeleteModal([cluster.id])}
                      disabled={deletingId === cluster.id}
                      className={cn("p-2 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl transition-colors disabled:opacity-50", isDark ? "text-red-400" : "text-red-700")}
                      title="Delete Cluster Record"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {clusters.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    No K3s clusters found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Terminate Modal */}
      <ConfirmModal
        isOpen={showDeleteModal.length > 0}
        onClose={() => setShowDeleteModal([])}
        onConfirm={handleBulkDelete}
        title="Delete Cluster(s)"
        description={`You are about to delete ${showDeleteModal.length > 1 ? `${showDeleteModal.length} clusters` : `cluster ID ${showDeleteModal[0]}`}. This only removes the cluster record, not the associated VPS node. This action CANNOT be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingId !== null}
      />
    </div>
  );
}
