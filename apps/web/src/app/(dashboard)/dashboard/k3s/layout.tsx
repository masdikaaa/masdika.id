import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Managed Kubernetes (K3s)",
  description: "Deploy, manage, and scale your containerized applications effortlessly with Masdika's Managed K3s Kubernetes Engine.",
  openGraph: {
    title: "Managed Kubernetes (K3s)",
    description: "Deploy, manage, and scale your containerized applications effortlessly with Masdika's Managed K3s Kubernetes Engine.",
    images: ["/og-image.webp"],
  },
};

export default function K3sLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
