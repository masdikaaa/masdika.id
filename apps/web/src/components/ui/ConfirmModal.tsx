import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertCircle, CheckCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "danger" | "success" | "warning";
  children?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false,
  variant = "danger",
  children,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm bg-[#0f172a] rounded-3xl p-6 border border-cyan-500/20 shadow-2xl"
          >
            <div className="flex justify-center mb-4">
              {variant === "danger" && (
                <div className="p-3 bg-red-500/10 rounded-full">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
              )}
              {variant === "warning" && (
                <div className="p-3 bg-cyan-500/10 rounded-full">
                  <AlertCircle className="w-8 h-8 text-cyan-500" />
                </div>
              )}
              {variant === "success" && (
                <div className="p-3 bg-cyan-500/10 rounded-full">
                  <CheckCircle className="w-8 h-8 text-cyan-500" />
                </div>
              )}
            </div>
            
            <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>
            <p className="text-zinc-400 text-center text-sm mb-6">
              {description}
            </p>
            
            {children && (
              <div className="mb-6">
                {children}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors border border-white/10 disabled:opacity-50"
              >
                {cancelText}
              </button>
              
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 py-3 font-bold rounded-xl transition-colors shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 ${
                  variant === "danger"
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                    : variant === "warning"
                    ? "bg-cyan-500 hover:bg-cyan-600 text-[#011627] shadow-cyan-500/20"
                    : "bg-cyan-500 hover:bg-cyan-600 text-[#011627] shadow-cyan-500/20"
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
