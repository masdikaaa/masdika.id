import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DNS Pointing",
  description:
    "Manage authoritative DNS zones and records for your domains powered by Masdika PowerDNS.",
  openGraph: {
    title: "DNS Pointing",
    description:
      "Manage authoritative DNS zones and records for your domains powered by Masdika PowerDNS.",
    url: "https://masdika.id/dashboard/dns",
  },
};

export default function DnsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
