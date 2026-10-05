"use client";

import { usePathname } from "next/navigation";

/** Renders its children everywhere except the admin dashboard, which has its own chrome */
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname === "/admin" || pathname.startsWith("/admin/") ? null : <>{children}</>;
}
