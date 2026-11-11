'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Plus, Copy, Check, Trash2, Loader2, X, Terminal, Shield, RefreshCw, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { cn } from '@/lib/utils';
import { parseAndValidateSshKey } from '@/lib/ssh-key-utils';

export interface UserSshKeyItem {
  id: number;
  userId: number;
  name: string;
  publicKey: string;
  fingerprint: string | null;
  keyType: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SshKeysManagerSectionProps {
  isDark: boolean;
  inputClass: string;
  labelClass: string;
}

export function SshKeysManagerSection({ isDark, inputClass, labelClass }: SshKeysManagerSectionProps) {
  const [keys, setKeys] = useState<UserSshKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Key Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newPublicKey, setNewPublicKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyValidation, setKeyValidation] = useState<{ isValid: boolean; fingerprint?: string; keyType?: string; error?: string } | null>(null);

  // Generate Key Pair State
  const [isGenerating, setIsGenerating] = useState(false);

  // Delete State
  const [keyToDelete, setKeyToDelete] = useState<UserSshKeyItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy State
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);

  const fetchKeys = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/user/ssh-keys');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.keys)) {
        setKeys(data.keys);
      } else {
        toast.error(data.error || 'Failed to load SSH keys');
      }
    } catch {
      toast.error('Network error while loading SSH keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // Validate on key input change
  useEffect(() => {
    if (!newPublicKey.trim()) {
      setKeyValidation(null);
      return;
    }
    const val = parseAndValidateSshKey(newPublicKey);
    setKeyValidation(val);
  }, [newPublicKey]);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for this SSH key');
      return;
    }
    if (!keyValidation?.isValid) {
      toast.error(keyValidation?.error || 'Invalid SSH Public Key format');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/user/ssh-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          publicKey: newPublicKey.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`SSH Key '${newKeyName.trim()}' added successfully!`);
        setShowAddModal(false);
        setNewKeyName('');
        setNewPublicKey('');
        setKeyValidation(null);
        fetchKeys();
      } else {
        toast.error(data.error || 'Failed to add SSH key');
      }
    } catch {
      toast.error('An unexpected error occurred while adding SSH key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/user/ssh-keys/${keyToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`SSH Key '${keyToDelete.name}' deleted`);
        setKeys(prev => prev.filter(k => k.id !== keyToDelete.id));
        setKeyToDelete(null);
      } else {
        toast.error(data.error || 'Failed to delete SSH key');
      }
    } catch {
      toast.error('Failed to delete SSH key');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateKey = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch('/api/generate-ssh-key', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.privateKey && data.publicKey) {
        // Trigger download of private key
        const blob = new Blob([data.privateKey], { type: 'application/x-pem-file' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const defaultName = `masdika-key-${Date.now()}`;
        a.href = url;
        a.download = `${defaultName}.pem`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Pre-fill Add Modal with generated public key
        setNewKeyName(defaultName);
        setNewPublicKey(data.publicKey);
        setShowAddModal(true);
        toast.success('Private key (.pem) downloaded! Review and save the public key below.');
      } else {
        toast.error(data.error || 'Failed to generate SSH key pair');
      }
    } catch {
      toast.error('An error occurred while generating SSH key pair');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = (key: UserSshKeyItem) => {
    navigator.clipboard.writeText(key.publicKey);
    setCopiedKeyId(key.id);
    toast.success(`Public key '${key.name}' copied to clipboard`);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  return (
    <motion.div
      key="ssh-keys"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 w-full max-w-full min-w-0"
    >
      {/* Overview Card */}
      <div className={cn("rounded-2xl p-4 sm:p-6 relative border w-full max-w-full min-w-0 box-border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className={cn("w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border shrink-0", isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-600")}>
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn("text-base md:text-lg font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>
                  Global SSH Public Keys
                </h3>
                <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border", isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" : "bg-cyan-100 text-cyan-900 border-cyan-300")}>
                  {keys.length} Registered
                </span>
              </div>
              <p className={cn("text-xs md:text-sm mt-0.5 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>
                Save your public keys once to attach them to new Cloud VPS instances with a single click.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleGenerateKey}
              disabled={isGenerating}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
                isDark ? "bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              )}
              title="Generate a new RSA/ED25519 key pair and download .pem"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5 text-cyan-400" />}
              <span>Generate Key Pair</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewKeyName('');
                setNewPublicKey('');
                setKeyValidation(null);
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add SSH Key</span>
            </button>
          </div>
        </div>

        {/* List of SSH Keys */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs">Loading registered SSH keys...</span>
          </div>
        ) : keys.length === 0 ? (
          <div className={cn("p-8 sm:p-10 rounded-2xl border text-center flex flex-col items-center justify-center gap-3", isDark ? "bg-[#111115]/50 border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", isDark ? "bg-white/[0.03] border-white/[0.08] text-zinc-500" : "bg-white border-slate-200 text-slate-400")}>
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h4 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>No SSH Keys Registered</h4>
              <p className={cn("text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                Add your SSH public key (<code className="font-mono text-cyan-400">~/.ssh/id_ed25519.pub</code>) or generate a new key pair to enable 1-click passwordless SSH deployment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Key</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => {
              const isCopied = copiedKeyId === key.id;
              const formattedDate = new Date(key.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={key.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group",
                    isDark ? "bg-[#111115] border-white/[0.08] hover:border-white/[0.15]" : "bg-slate-50/70 border-slate-200 hover:border-slate-300 shadow-2xs"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 mt-0.5", isDark ? "bg-white/[0.03] border-white/[0.08] text-cyan-400" : "bg-white border-slate-200 text-cyan-700")}>
                      <KeyRound className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-bold text-sm truncate", isDark ? "text-white" : "text-slate-900")}>
                          {key.name}
                        </span>
                        {key.keyType && (
                          <span className={cn("text-[10px] uppercase font-mono font-bold px-2 py-0.2 rounded border", isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-800 border-cyan-200")}>
                            {key.keyType.replace('ssh-', '')}
                          </span>
                        )}
                        <span className={cn("text-[11px] flex items-center gap-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <code className={cn("text-xs font-mono truncate max-w-md", isDark ? "text-zinc-400" : "text-slate-600")}>
                          {key.fingerprint || key.publicKey.slice(0, 48) + '...'}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(key)}
                      className={cn(
                        "p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                        isCopied
                          ? (isDark ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-cyan-100 text-cyan-900 border-cyan-300")
                          : (isDark ? "border-white/[0.08] hover:bg-white/[0.06] text-zinc-300" : "border-slate-200 hover:bg-white text-slate-700")
                      )}
                      title="Copy Public Key"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline text-[11px] font-semibold">{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setKeyToDelete(key)}
                      className={cn(
                        "p-2 rounded-lg border text-xs transition-colors cursor-pointer text-rose-400 hover:text-rose-300",
                        isDark ? "border-white/[0.08] hover:bg-rose-500/10" : "border-slate-200 hover:bg-rose-50"
                      )}
                      title="Delete Key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className={cn("mt-6 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs", isDark ? "bg-[#111115] border-white/[0.08] text-zinc-400" : "bg-slate-50/80 border-slate-200/90 text-slate-600")}>
          <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>How it works:</strong> Saved SSH keys are stored globally on your account. When creating or ordering a Cloud VPS, you can select any of your saved keys to inject them directly into Linux Cloud-Init for instant, passwordless SSH access.
          </p>
        </div>
      </div>

      {/* Add SSH Key Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("rounded-2xl border p-5 sm:p-6 w-full max-w-lg shadow-2xl relative overflow-hidden", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className={cn("absolute top-4 right-4 transition-colors p-2 rounded-xl cursor-pointer", isDark ? "text-zinc-400 hover:text-white bg-[#111115] hover:bg-white/[0.08]" : "text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200")}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50 border-slate-200 text-cyan-600")}>
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={cn("text-base sm:text-lg font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Add SSH Public Key</h3>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Paste your existing OpenSSH public key</p>
                </div>
              </div>

              <form onSubmit={handleAddKey} className="space-y-4">
                <div>
                  <label className={labelClass}>Key Name / Label</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. MacBook Pro M3, Workstation Linux"
                    maxLength={64}
                  />
                </div>

                <div>
                  <label className={labelClass}>SSH Public Key</label>
                  <textarea
                    required
                    rows={4}
                    value={newPublicKey}
                    onChange={(e) => setNewPublicKey(e.target.value)}
                    className={cn(inputClass, "font-mono text-xs resize-none leading-relaxed")}
                    placeholder="ssh-ed25519 AAAAC3NzaC1... user@hostname"
                  />

                  {/* Real-time Validation Preview */}
                  {keyValidation && (
                    <div className="mt-2 text-xs">
                      {keyValidation.isValid ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>Valid {keyValidation.keyType}: {keyValidation.fingerprint}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-400 text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{keyValidation.error}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className={cn("text-[11px] mt-1.5", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Supported formats: <code className="text-cyan-400">ssh-ed25519</code>, <code className="text-cyan-400">ssh-rsa</code>, <code className="text-cyan-400">ecdsa</code>. Begins with type and ends with comment.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={cn("flex-1 px-4 py-2.5 rounded-xl border font-semibold text-xs transition-colors cursor-pointer", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !newKeyName.trim() || !keyValidation?.isValid}
                    className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save SSH Key'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(keyToDelete)}
        onClose={() => setKeyToDelete(null)}
        onConfirm={handleDeleteKey}
        title="Delete SSH Key?"
        description={`Are you sure you want to delete '${keyToDelete?.name}'? VPS instances currently using this key will keep their access, but you won't be able to select it for new deployments.`}
        confirmText="Delete Key"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        icon={<Trash2 className="w-8 h-8" />}
      />
    </motion.div>
  );
}

