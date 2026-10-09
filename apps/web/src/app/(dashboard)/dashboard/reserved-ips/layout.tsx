import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reserved IPs",
  description: "Reserve static IPv4 and IPv6 addresses to use with your Cloud VPS or Managed K3s deployments.",
  openGraph: {
    title: "Reserved IPs",
    description: "Reserve static IPv4 and IPv6 addresses to use with your Cloud VPS or Managed K3s deployments.",
    images: ["/og-image.webp"],
  },
};

export default function ReservedIpsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
