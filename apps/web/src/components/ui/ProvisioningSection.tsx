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
          <div className="absolute inset-0 bg-[#050b14]/80 border-y border-white/5" />
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
              <div className={cn(
                "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-6 shadow-sm",
                isDark
                  ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400"
                  : "border-cyan-200 bg-cyan-50 text-cyan-700"
              )}>
                {subtitle}
              </div>
              
              <h2 className={cn("text-4xl md:text-5xl font-black leading-[1.15] mb-6", isDark ? "text-white" : "text-slate-900")}>
                {title.split(', ').map((text, i) => (
                  <span key={i}>
                    {i === 1 ? (
                      <span className={cn(
                        "bg-clip-text text-transparent bg-gradient-to-r",
                        isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400"
                      )}>
                        {text}
                      </span>
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
                className={cn(
                  "inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all shadow-lg",
                  "bg-cyan-600 hover:bg-cyan-500 text-white",
                  isDark ? "shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]" : "shadow-md hover:shadow-lg"
                )}
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
