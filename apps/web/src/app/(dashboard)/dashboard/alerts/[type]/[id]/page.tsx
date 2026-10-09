import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import ConfigureAlertsClient from "./ConfigureAlertsClient";

export const metadata = {
  title: "Configure Alerts",
  description: "Configure resource monitoring alerts.",
};

export default async function ConfigureAlertsPage({ 
  params 
}: { 
  params: Promise<{ type: string; id: string }> 
}) {
  const resolvedParams = await params;
  const { type, id } = resolvedParams;
  
  const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
  if (auth.error) {
    redirect("/login");
  }

  const userId = auth.userId!;
  const numericId = parseInt(id);

  let resourceName = "";
  let alertRules: any[] = [];
  let notFound = false;

  if (type === "vps") {
    const vps = await prisma.vpsService.findUnique({
      where: { id: numericId },
      include: { alertRules: true }
    });
    if (!vps || vps.userId !== userId) {
      notFound = true;
    } else {
      resourceName = vps.hostname;
      alertRules = vps.alertRules || [];
    }
  } else if (type === "k3s") {
    const cluster = await prisma.kubernetesCluster.findUnique({
      where: { id: numericId },
      include: {
        nodes: {
          include: { alertRules: true }
        }
      }
    });
    if (!cluster || cluster.userId !== userId) {
      notFound = true;
    } else {
      resourceName = cluster.name;
      alertRules = cluster.nodes && cluster.nodes.length > 0 ? cluster.nodes[0].alertRules : [];
    }
  } else {
    notFound = true;
  }

  if (notFound) {
    redirect("/dashboard/alerts");
  }

  return (
    <ConfigureAlertsClient 
      type={type} 
      id={numericId} 
      resourceName={resourceName} 
      initialRules={alertRules} 
    />
  );
}
