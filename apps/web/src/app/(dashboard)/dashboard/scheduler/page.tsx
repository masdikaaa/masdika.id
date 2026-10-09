import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import SchedulerClient from "./SchedulerClient";

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Auto Scheduler",
  description: "Schedule your VPS to automatically start and stop to save costs.",
  openGraph: {
    title: 'Auto Scheduler',
    description: 'Schedule your VPS to automatically start and stop to save costs.',
    url: 'https://masdika.com/dashboard/scheduler',
    siteName: 'Masdika',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'Masdika Auto Scheduler',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Auto Scheduler',
    description: 'Schedule your VPS to automatically start and stop to save costs.',
    images: ['/og-image.webp'],
  },
};

export default async function SchedulerPage() {
  const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
  if (auth.error) {
    redirect("/login");
  }

  const userId = auth.userId!;

  const vpsList = await prisma.vpsService.findMany({
    where: {
      userId,
      status: { in: ['RUNNING', 'STOPPED'] }
    },
    include: {
      schedule: true,
      assignedIps: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      <SchedulerClient vpsList={vpsList} />
    </div>
  );
}
