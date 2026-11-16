import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reserved IPs",
  description: "Reserve static IPv4 and IPv6 addresses to use with your Cloud VPS deployments.",
  openGraph: {
    title: "Reserved IPs",
    description: "Reserve static IPv4 and IPv6 addresses to use with your Cloud VPS deployments.",
    images: [OG_IMAGE_PATH],
  },
};

export default function ReservedIpsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
