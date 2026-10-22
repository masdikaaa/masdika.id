import { motion, AnimatePresence } from "framer-motion";
import { Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

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
  icon?: React.ReactNode;
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
  icon,
}: ConfirmModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
 className={`w-full max-w-sm rounded-2xl p-6 border transition-colors ${
              isDark
                ? "bg-[#0b1322] border-slate-800 text-white shadow-2xl"
                : "bg-white border-slate-200 text-slate-900 shadow-xl"
            }`}
          >
            <div className="flex justify-center mb-4">
              {icon ? (
                <div
                  className={`p-3 rounded-full ${
                    variant === "danger"
                      ? isDark
                        ? "bg-red-500/10 text-red-400"
                        : "bg-red-50 text-red-600"
                      : variant === "warning"
                      ? isDark
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-amber-50 text-amber-600"
                      : isDark
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {icon}
                </div>
              ) : (
                <>
                  {variant === "danger" && (
                    <div className={`p-3 rounded-full ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>
                      <Trash2 className="w-8 h-8" />
                    </div>
                  )}
                  {variant === "warning" && (
                    <div className={`p-3 rounded-full ${isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
                      <AlertCircle className="w-8 h-8" />
                    </div>
                  )}
                  {variant === "success" && (
                    <div className={`p-3 rounded-full ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                      <CheckCircle className="w-8 h-8" />
                    </div>
                  )}
                </>
              )}
            </div>
            
            <h3 className={`text-xl font-bold text-center mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h3>
            <p className={`text-center text-sm mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
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
                className={`flex-1 py-2.5 font-semibold rounded-lg transition-colors border disabled:opacity-50 text-sm ${
                  isDark
                    ? "bg-[#060b14] hover:bg-slate-800 text-slate-300 border-slate-800"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                {cancelText}
              </button>
              
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 py-2.5 font-semibold rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50 text-sm ${
                  variant === "danger"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : variant === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold"
                }`}
              >
                {isLoading ? (
                  <div className={`w-5 h-5 border-2 ${variant === "danger" || variant === "warning" ? "border-white" : "border-slate-950"} border-t-transparent rounded-full animate-spin`} />
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
