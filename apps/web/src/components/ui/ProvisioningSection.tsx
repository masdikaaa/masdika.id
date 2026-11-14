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
  provisionEstimate = "Backend: KVM Hypervisor (Est. ~5 Mins)",
}: ProvisioningSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className="py-8 sm:py-14 relative z-10 w-full overflow-hidden">
      <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-[var(--border-primary)] bg-white dark:bg-[var(--surface)] p-4 sm:p-8 lg:p-12 shadow-xl dark:shadow-2xl overflow-hidden transition-all">
        <div className="relative z-10 grid lg:grid-cols-[1fr_1.3fr] xl:grid-cols-[1fr_1.4fr] gap-8 lg:gap-14 items-center">
          
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
                      text + (title.includes(',') && i === 0 ? ', ' : '')
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
                className="w-full sm:w-auto justify-center font-bold shadow-lg shadow-cyan-400/10 hover:shadow-cyan-400/25 active:scale-[0.98] transition-all"
              >
                {buttonText}
              </Button>
            </div>
          </FadeIn>

          {/* Right Column: Visualizer */}
          <FadeIn direction="left" delay={0.2} className="relative w-full">
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
