import React from "react";
import { redirect } from "next/navigation";
import MetricsDashboardClient from "./MetricsDashboardClient";

export default async function MetricsDashboardPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const resolvedParams = await params;
  
  if (resolvedParams.type === "apps" || resolvedParams.type === "app") {
    redirect(`/dashboard/apps/${resolvedParams.id}`);
  }
  if (resolvedParams.type === "database" || resolvedParams.type === "db") {
    redirect(`/dashboard/database/${resolvedParams.id}`);
  }

  if (resolvedParams.type !== "vps" && resolvedParams.type !== "k3s") {
    return <div>Invalid type</div>;
  }

  return <MetricsDashboardClient type={resolvedParams.type as "vps" | "k3s"} id={resolvedParams.id} />;
}
