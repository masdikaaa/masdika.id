import { prisma } from "@/lib/prisma";
import CommunityClient from "./CommunityClient";
import { getCachedData } from "@/lib/cache";

export const revalidate = 60;

export default async function CommunityPage() {
  const groups = await getCachedData('community:groups_page', 300, () =>
    prisma.communityGroup.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' }
    })
  );

  return <CommunityClient initialGroups={groups} />;
}
