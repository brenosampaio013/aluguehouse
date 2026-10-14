import { MobileTabBar } from "@/components/site/mobile-tab-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
