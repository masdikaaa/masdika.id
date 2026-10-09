import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { VacanciesContent } from "./VacanciesContent";

export async function generateMetadata(): Promise<Metadata> {
  let description = 'Discover the best IT career opportunities and job vacancies.';
  try {
    const metaDescSetting = await prisma.setting.findUnique({ where: { key: 'meta_description_vacancies' } });
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Error fetching vacancies meta description:", error);
  }

  const title = 'Job Vacancies';
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
      type: 'JOBS'
    },
    orderBy: { createdAt: 'desc' }
  });

  return opportunities;
};

export default async function VacanciesPage() {
  const opportunities = await getOpportunities();

  return <VacanciesContent opportunities={opportunities} />;
}
