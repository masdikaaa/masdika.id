import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import CommunityClient from "./CommunityClient";
import { getCachedData } from "@/lib/cache";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Developer Community',
  description: 'Join developer communities on WhatsApp and Telegram to discuss, learn, and grow together.',
};

export default async function CommunityPage() {
  const groups = await getCachedData('community:groups_page', 300, () =>
    prisma.communityGroup.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' }
    })
  );

  return <CommunityClient initialGroups={groups} />;
}
