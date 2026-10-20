import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ScrollProgress } from "@/components/motion/scroll-progress";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <ScrollProgress />
      <SiteHeader />
      <main id="main-content" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
