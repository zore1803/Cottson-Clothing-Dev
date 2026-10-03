"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// The storefront header and footer wrap every page except the staff area, which has its own chrome
export function SiteShell({ children }: { children: React.ReactNode }) {
  const staff = usePathname().startsWith("/admin");
  return (
    <>
      {!staff && <SiteHeader />}
      <main className="flex-1">{children}</main>
      {!staff && <SiteFooter />}
    </>
  );
}
