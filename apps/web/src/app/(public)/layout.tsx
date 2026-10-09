import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { PremiumBackground } from "@/components/ui/PremiumBackground";
import { getPublicSettings } from "@/lib/settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getPublicSettings();

  return (
    <>
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <PremiumBackground />
      </div>
      
      <Navbar socialLinks={settings} />
      <PageTransition>{children}</PageTransition>
      <Footer socialLinks={settings} />
    </>
  );
}