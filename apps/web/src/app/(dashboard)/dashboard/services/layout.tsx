import { OG_IMAGE_PATH } from "@/lib/og-image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Services",
  description: "View and manage all your active and past subscriptions, including VPS, File CDN, and API Hub.",
  openGraph: {
    title: "My Services",
    description: "View and manage all your active and past subscriptions, including VPS, File CDN, and API Hub.",
    url: "https://masdika.com/dashboard/services",
    siteName: "Masdika",
    images: [
      {
        url: OG_IMAGE_PATH, 
        width: 1200,
        height: 630,
        alt: "Masdika Services",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Services",
    description: "View and manage all your active and past subscriptions, including VPS, File CDN, and API Hub.",
    images: [OG_IMAGE_PATH],
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
