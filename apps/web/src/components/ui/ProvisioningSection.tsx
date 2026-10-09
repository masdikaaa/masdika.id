import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProvisioningVisualizer } from "@/components/animations/ProvisioningVisualizer";
import { FadeIn } from "@/components/animations/FadeIn";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ProvisioningSectionProps {
  subtitle?: string;
  title: string;
  description: string;
  buttonText: string;
  buttonHref?: string;
  logs: any[];
  stats: any[];
  terminalTitle?: string;
  iconType?: "vps" | "k3s" | "api-hub" | "file-cdn" | "shortener";
}

export function ProvisioningSection({
  subtitle = "PROVISIONING",
  title,
  description,
  buttonText,
  buttonHref = "/dashboard",
  logs,
  stats,
  terminalTitle = "DEPLOYMENT",
  iconType = "vps"
}: ProvisioningSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={cn("relative py-20 lg:py-32 overflow-hidden z-20", isDark ? "bg-transparent" : "bg-white")}>
      {/* Background elements */}
      {isDark && (
        <>
          <div className="absolute inset-0 bg-[#06101f] border-y border-white/5" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
        </>
      )}
      {!isDark && (
        <div className="absolute inset-0 bg-slate-50 border-y border-slate-200" />
      )}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-[1fr_1.3fr] xl:grid-cols-[1fr_1.4fr] gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Content */}
          <FadeIn direction="right" delay={0.1}>
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-800/80 bg-cyan-950/30 text-cyan-400 text-[10px] font-black tracking-widest uppercase mb-6 shadow-sm">
                {subtitle}
              </div>
              
              <h2 className={cn("text-4xl md:text-5xl font-black leading-[1.15] mb-6", isDark ? "text-white" : "text-slate-900")}>
                {title.split(', ').map((text, i) => (
                  <span key={i}>
                    {i === 1 ? (
                      <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">{text}</span>
                    ) : (
                      text + (title.includes(',') && i === 0 ? ',' : '')
                    )}
                    {i === 0 && <br className="hidden md:block" />}
                  </span>
                ))}
              </h2>
              
              <p className={cn("font-medium text-lg leading-relaxed mb-10", isDark ? "text-zinc-400" : "text-slate-600")}>
                {description}
              </p>
              
              <Link
                href={buttonHref}
                className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-cyan-900/20"
              >
                {buttonText}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </FadeIn>

          {/* Right Column: Visualizer */}
          <FadeIn direction="left" delay={0.2} className="relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
            
            <ProvisioningVisualizer
              logs={logs}
              stats={stats}
              title={terminalTitle}
              iconType={iconType}
            />
          </FadeIn>
          
        </div>
      </div>
    </section>
  );
}
