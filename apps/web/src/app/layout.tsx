import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Tracker } from "@/components/Tracker";
import { prisma } from "@/lib/prisma";
import { ThemeProvider } from "@/components/ThemeProvider";
import Script from "next/script";
import { AIChatWrapper } from "@/components/AIChatWrapper";
import { InitialPreloader } from "@/components/ui/InitialPreloader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

import { getCachedData } from '@/lib/cache';

const getCachedMetaDescription = () =>
  getCachedData('setting:meta_description', 3600, () =>
    prisma.setting.findUnique({ where: { key: 'meta_description' } })
  );

export async function generateMetadata(): Promise<Metadata> {
  let description = "Portfolio of Masdika, Cloud Engineer, DevOps Engineer, and System Administrator based in Sidoarjo, Indonesia.";
  try {
    const metaDescSetting = await getCachedMetaDescription();
    if (metaDescSetting && metaDescSetting.value.trim() !== '') {
      description = metaDescSetting.value;
    }
  } catch (error) {
    console.error("Failed to fetch meta_description", error);
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.masdika.id';
  const timestamp = Date.now();
  const ogImageUrl = `/og-image.webp?v=${timestamp}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: "%s",
      default: "Masdika | Cloud & DevOps Engineer",
    },
    description,
    openGraph: {
      title: "Masdika | Cloud & DevOps Engineer",
      description,
      url: siteUrl,
      siteName: 'Masdika',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: "summary_large_image",
      title: "Masdika | Cloud & DevOps Engineer",
      description,
      images: [ogImageUrl],
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("masdika-theme")?.value;
  const initialTheme = (themeCookie === "light" || themeCookie === "dark") ? themeCookie : "light";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased ${initialTheme}`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('masdika-theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider initialTheme={initialTheme}>
          <InitialPreloader />
          <Tracker />
          <main className="flex-1 flex flex-col overflow-x-hidden">
            {children}
          </main>
          <AIChatWrapper />
          <Toaster
            theme="dark"
            position="top-right"
            richColors
            toastOptions={{
              style: {
                background: '#0f172a',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                color: '#e4e4e7',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
