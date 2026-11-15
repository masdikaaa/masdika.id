import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "RouteGlass - Network Routing & Looking Glass",
  description: "Check our server network latency, routing paths, and download performance in real-time from our Sidoarjo data center.",
  openGraph: {
    images: [OG_IMAGE_PATH],
  },
};

export default function LgLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
