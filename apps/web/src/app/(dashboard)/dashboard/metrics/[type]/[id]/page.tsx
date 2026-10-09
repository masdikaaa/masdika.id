import React from "react";
import MetricsDashboardClient from "./MetricsDashboardClient";

export default async function MetricsDashboardPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const resolvedParams = await params;
  
  if (resolvedParams.type !== "vps" && resolvedParams.type !== "k3s") {
    return <div>Invalid type</div>;
  }

  return <MetricsDashboardClient type={resolvedParams.type} id={resolvedParams.id} />;
}
