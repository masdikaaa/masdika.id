import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProvisioningLiveVisualizer } from "@/components/animations/ProvisioningLiveVisualizer";
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
  iconType?: "vps" | "k3s" | "api-hub" | "file-cdn";
  targetServer?: string;
  provisionEstimate?: string;
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
  iconType = "vps",
  targetServer = "Dell PowerEdge R630 • Sidoarjo DC",
  provisionEstimate = "Backend: KVM Hypervisor (Estimasi ~5 Menit)",
}: ProvisioningSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className="py-10 sm:py-14 relative z-10 w-full">
      <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-[var(--border-primary)] bg-white dark:bg-[var(--surface)] p-6 sm:p-10 lg:p-12 shadow-xl dark:shadow-2xl overflow-hidden transition-all">
        {/* Soft Ambient Corner Accent */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-tr from-cyan-500/10 via-cyan-400/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 grid lg:grid-cols-[1fr_1.3fr] xl:grid-cols-[1fr_1.4fr] gap-10 lg:gap-14 items-center">
          
          {/* Left Column: Content */}
          <FadeIn direction="right" delay={0.1}>
            <div className="max-w-xl">
              <div className={cn(
                "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-6 shadow-xs",
                isDark
                  ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400"
                  : "border-cyan-200 bg-cyan-50 text-cyan-700"
              )}>
                {subtitle}
              </div>
              
              <h2 className={cn("text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.15] mb-6", isDark ? "text-white" : "text-slate-900")}>
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
              
              <p className={cn("font-medium text-base sm:text-lg leading-relaxed mb-8 sm:mb-10", isDark ? "text-zinc-400" : "text-slate-600")}>
                {description}
              </p>
              
              <Button
                variant="primary"
                size="lg"
                href={buttonHref}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                {buttonText}
              </Button>
            </div>
          </FadeIn>

          {/* Right Column: Visualizer */}
          <FadeIn direction="left" delay={0.2} className="relative w-full">
            {/* Ambient Background Glow — radial gradient instead of expensive blur filter */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle at 50% 50%, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 45%, transparent 70%)"
              }}
            />
            
            <ProvisioningLiveVisualizer
              logs={logs}
              stats={stats}
              title={terminalTitle}
              iconType={iconType}
              targetServer={targetServer}
              provisionEstimate={provisionEstimate}
            />
          </FadeIn>
          
        </div>
      </div>
    </section>
  );
}
