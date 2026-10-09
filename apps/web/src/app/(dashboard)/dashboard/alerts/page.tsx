import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import UnifiedAlertsClient from "./UnifiedAlertsClient";

export const metadata = {
  title: "Cloud Alerts",
  description: "Manage all your resource alerts in one place.",
};

export default async function CloudAlertsPage() {
  const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
  if (auth.error) {
    redirect("/login");
  }

  const userId = auth.userId!;

  // Fetch stand-alone VPS instances
  const vpsList = await prisma.vpsService.findMany({
    where: {
      userId,
      kubernetesClusterId: null, // exclude K3s nodes
      status: { in: ['RUNNING', 'STOPPED'] }
    },
    include: {
      alertRules: true
    }
  });

  // Fetch K3s clusters and their nodes
  const k3sClusters = await prisma.kubernetesCluster.findMany({
    where: { 
      userId,
      status: { in: ['RUNNING', 'STOPPED'] }
    },
    include: {
      nodes: {
        include: {
          alertRules: true
        }
      }
    }
  });

  return (
    <div className="space-y-6 w-full">
      <UnifiedAlertsClient vpsList={vpsList} k3sClusters={k3sClusters} />
    </div>
  );
}
