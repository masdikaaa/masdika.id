import { RefreshCw } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
    </div>
  );
}
