import { Metadata } from "next";
import IncidentsClient from "./IncidentsClient";

export const metadata: Metadata = {
  title: "Incident Reports & Resource Audit | Masdika",
  description:
    "Review live VPS telemetry, inspect bandwidth throttling safeguards, and export official incident reports (CSV / PDF).",
};

export default function IncidentsPage() {
  return <IncidentsClient />;
}
