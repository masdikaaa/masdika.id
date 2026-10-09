import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { EventsContent } from "./EventsContent";

export async function generateMetadata(): Promise<Metadata> {
  let description = 'Explore the latest events and tech webinars shared by Masdika.';
  try {
    const metaDescSetting = await prisma.setting.findUnique({ where: { key: 'meta_description_events' } });
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Error fetching events meta description:", error);
  }

  const title = 'Events & Webinars';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ['/og-image.webp'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.webp'],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

const getOpportunities = async () => {
  const opportunities = await prisma.opportunity.findMany({
    where: { 
      status: 'PUBLISHED',
      type: { in: ['EVENT', 'WEBINAR'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  return opportunities;
};

export default async function EventsPage() {
  const opportunities = await getOpportunities();

  return <EventsContent opportunities={opportunities} />;
}
