import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import CommunityClient from "./CommunityClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Developer Community',
  description: 'Join developer communities on WhatsApp and Telegram to discuss, learn, and grow together.',
};

export default async function CommunityPage() {
  const groups = await prisma.communityGroup.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' }
  });

  return <CommunityClient initialGroups={groups} />;
}
