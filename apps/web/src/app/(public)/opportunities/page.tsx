import { OG_IMAGE_PATH } from "@/lib/og-image";
import { prisma } from "@/lib/prisma";
import { Calendar, Briefcase, Video, ExternalLink } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { OpportunityGrid } from "@/components/ui/OpportunityGrid";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  let description = 'Explore the latest events, webinars, and job vacancies shared by Masdika.';
  try {
    const metaDescSetting = await prisma.setting.findUnique({ where: { key: 'meta_description_opportunities' } });
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Error fetching opportunities meta description:", error);
  }

  const title = 'Explore Opportunities';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

const getOpportunities = async () => {
  const opportunities = await prisma.opportunity.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' }
  });

  return opportunities;
};

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EVENT': return <Calendar className="w-5 h-5" />;
      case 'WEBINAR': return <Video className="w-5 h-5" />;
      case 'JOBS': return <Briefcase className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EVENT': return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
      case 'WEBINAR': return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
      case 'JOBS': return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
      default: return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    }
  };

  return (
    <div className="pt-28 sm:pt-36 md:pt-40 lg:pt-56 pb-10 sm:pb-14 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-cyan-500 font-bold tracking-[0.2em] text-xs mb-4 block">
              Discover Opportunities
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl 2xl:text-[70px] font-black tracking-tight leading-[1.08] text-balance mb-6 text-[var(--text-primary)]">
              Events &amp; <br />
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                Opportunities.
              </span>
            </h1>
            <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Discover the latest events, tech webinars, and job vacancies. Curated and shared to help you grow your career and network.
            </p>
          </AnimatedSection>

          <OpportunityGrid opportunities={opportunities} />
          
    </div>
  );
}
