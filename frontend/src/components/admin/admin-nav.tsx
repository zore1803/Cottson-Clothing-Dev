"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquareQuote, Package, Palette, ShoppingBag, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; ready: boolean; adminOnly?: boolean };

// `ready: false` modules are listed so the whole plan is visible, but aren't links yet
const ITEMS: Item[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, ready: false },
  { href: "/admin/quotes", label: "Quotes", icon: MessageSquareQuote, ready: false },
  { href: "/admin/designs", label: "Saved designs", icon: Palette, ready: false },
  { href: "/admin/products", label: "Products", icon: Package, ready: false },
  { href: "/admin/team", label: "Team", icon: Users, ready: true, adminOnly: true },
];

export function AdminNav({ role }: { role: "admin" | "staff" }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.filter((i) => !i.adminOnly || role === "admin").map(({ href, label, icon: Icon, ready }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        const body = (
          <>
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 whitespace-nowrap">{label}</span>
            {!ready && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">Soon</span>}
          </>
        );
        const base = "flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium";
        return ready ? (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(base, active ? "bg-brand text-white" : "text-foreground hover:bg-muted")}
          >
            {body}
          </Link>
        ) : (
          <span key={href} aria-disabled className={cn(base, "cursor-not-allowed text-muted-foreground")}>
            {body}
          </span>
        );
      })}
    </nav>
  );
}
